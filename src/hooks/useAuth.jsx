import React, { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { getProfile as apiGetProfile, getEntities as apiGetEntities, refreshToken as apiRefreshToken, verify2FA as apiVerify2FA, get2FAStatus as apiGet2FAStatus } from '@/lib/api';
import { encryptData } from '@/lib/api/crypto';
import { listClientsByOrganization } from '@/lib/api/clients';
import { useNavigate } from 'react-router-dom';
import { clearAttachmentCache } from '@/lib/cache';
import { jwtDecode } from "jwt-decode";

// Default value when useAuth is used outside AuthProvider (e.g. lazy chunk context mismatch)
const getDefaultAuthValue = () => ({
  user: null,
  loading: false,
  login: async () => {},
  verifyOtpAndFinishLogin: async () => {},
  logout: () => {},
  updateUser: () => {},
});

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
      console.warn('useAuth was used outside AuthProvider. Ensure the app root wraps content with <AuthProvider>.');
    }
    return getDefaultAuthValue();
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshIntervalRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const navigate = useNavigate();

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('agency_id');
    localStorage.removeItem('entityId');
    localStorage.removeItem('entityData');
    localStorage.removeItem('beneficiaries');

    // Clear all fynivo cached items (vouchers, invoices, logs, etc.)
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('fynivo_')) {
        localStorage.removeItem(key);
      }
    });

    // Clear IndexedDB attachment cache
    clearAttachmentCache();

    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    // Cross-tab sync: other tabs get storage event when 'user' is removed below, so no need to set 'logout' key
    window.dispatchEvent(new Event('logout'));
    const loginApiUrl = import.meta.env.VITE_LOGIN_API_URL || 'http://127.0.0.1:8001';
    navigate('/login');
  }, [navigate]);

  const updateUser = useCallback((updatedData) => {
    setUser(prevUser => {
      if (!prevUser) return null;
      const newUser = { ...prevUser, ...updatedData };
      localStorage.setItem('user', JSON.stringify(newUser));
      return newUser;
    });
  }, []);

  const startTokenRefresh = useCallback((refreshTokenValue) => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    const refresh = async () => {
      // Only refresh if there was activity in the last 25 minutes
      const now = Date.now();
      const twentyFiveMinutesAgo = now - (25 * 60 * 1000);

      if (lastActivityRef.current > twentyFiveMinutesAgo) {
        try {
          const data = await apiRefreshToken(refreshTokenValue);
          updateUser({ access_token: data.access_token });
          console.log("Token refreshed successfully");
        } catch (error) {
          console.error("Failed to refresh token, logging out.", error);
          logout();
        }
      } else {
        console.log("Skipping token refresh due to inactivity");
      }
    };

    // Refresh every 25 minutes
    refreshIntervalRef.current = setInterval(refresh, 25 * 60 * 1000);
  }, [logout, updateUser]);


  useEffect(() => {
    const handleAuthError = () => {
      console.warn("Authentication error detected. Logging out.");
      logout();
    };

    window.addEventListener('auth-error', handleAuthError);

    return () => {
      window.removeEventListener('auth-error', handleAuthError);
    };
  }, [logout]);


  useEffect(() => {
    // Clear any stale 'logout' key so it never triggers unwanted logouts (e.g. after crash or old tab)
    localStorage.removeItem('logout');

    const initializeUser = async () => {
      const savedUser = localStorage.getItem('user');
      const accessToken = localStorage.getItem('accessToken');
      if (savedUser && accessToken) {
        try {
          const parsedUser = JSON.parse(savedUser);
          // Validate token is not null, undefined, or empty string
          if (!accessToken || accessToken === 'null' || accessToken === 'undefined' || accessToken.trim() === '') {
            console.warn('Invalid access token found in localStorage, logging out');
            logout();
            return;
          }

          // Check for token expiry
          try {
            const decoded = jwtDecode(accessToken);
            const currentTime = Date.now() / 1000;
            if (decoded.exp < currentTime) {
              console.warn('Access token expired, logging out');
              logout();
              return;
            }
          } catch (e) {
            console.error('Failed to decode token', e);
            logout();
            return;
          }
          // For CLIENT_USER and CLIENT_MASTER_ADMIN, check if any client is locked
          if ((parsedUser.role === 'CLIENT_USER' || parsedUser.role === 'CLIENT_MASTER_ADMIN') && parsedUser.entities) {
            try {
              // Check entities for lock status
              for (const entity of parsedUser.entities) {
                if (entity.is_locked) {
                  // Check if unlock period has expired
                  let isLocked = entity.is_locked;
                  if (entity.unlock_until) {
                    const unlockUntil = new Date(entity.unlock_until);
                    if (new Date() > unlockUntil) {
                      isLocked = true; // Unlock period expired
                    } else {
                      isLocked = false; // Still within unlock period
                    }
                  }
                  
                  if (isLocked) {
                    console.warn('User account is locked, logging out');
                    logout();
                    return;
                  }
                }
              }
            } catch (error) {
              console.warn('Error checking lock status on app load:', error);
            }
          }
          
          setUser({ ...parsedUser, access_token: accessToken });
          if (parsedUser.refresh_token) {
            startTokenRefresh(parsedUser.refresh_token);
          }
        } catch (error) {
          console.error("Failed to parse user data", error);
          logout();
        }
      }
      setLoading(false);
    };
    initializeUser();

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    }
  }, [logout, startTokenRefresh]);

  // Session timeout: 30 minutes inactivity for all accounts → logout and redirect to login
  const INACTIVITY_MINUTES = 30;
  const INACTIVITY_MS = INACTIVITY_MINUTES * 60 * 1000;

  useEffect(() => {
    if (!user) return;

    let activityTimer;

    const resetTimer = () => {
      lastActivityRef.current = Date.now();
      clearTimeout(activityTimer);
      activityTimer = setTimeout(() => {
        console.warn(`Session expired: ${INACTIVITY_MINUTES} minutes of inactivity`);
        logout();
      }, INACTIVITY_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        resetTimer();
      }
    };

    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart', 'wheel'];
    events.forEach(event => {
      window.addEventListener(event, resetTimer, { passive: true });
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    resetTimer();

    return () => {
      clearTimeout(activityTimer);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, logout]);

  // Synchronize logout across tabs (when another tab clears 'user', log out here too)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'user' && e.newValue === null) {
        logout();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [logout]);

  const finishLogin = async (userData) => {
    // For CLIENT_USER and CLIENT_MASTER_ADMIN, check if any client is locked
    if ((userData.role === 'CLIENT_USER' || userData.role === 'CLIENT_MASTER_ADMIN') && userData.entities) {
      try {
        const { listClientsByOrganization } = await import('@/lib/api/clients');
        const agencyId = userData.agency_id;
        const token = userData.access_token;
        
        // Check all organizations the user belongs to
        const orgIds = new Set();
        if (userData.organization_id) {
          orgIds.add(userData.organization_id);
        }
        userData.entities?.forEach(entity => {
          if (entity.organization_id) {
            orgIds.add(entity.organization_id);
          }
        });
        
        // Check all clients in all organizations
        for (const orgId of orgIds) {
          try {
            const clients = await listClientsByOrganization(orgId, token);
            for (const client of clients) {
              if (client.is_locked) {
                // Check if unlock period has expired
                let isLocked = client.is_locked;
                if (client.unlock_until) {
                  const unlockUntil = new Date(client.unlock_until);
                  if (new Date() > unlockUntil) {
                    isLocked = true; // Unlock period expired
                  } else {
                    isLocked = false; // Still within unlock period
                  }
                }
                
                if (isLocked) {
                  logout();
                  throw new Error('Your account is locked. Please pay your due bills and contact your CA to unlock your account.');
                }
              }
            }
          } catch (error) {
            // If we can't check, continue (fail open)
            console.warn(`Could not check lock status for org ${orgId}:`, error);
          }
        }
      } catch (error) {
        // If error message indicates lock, re-throw to show to user
        if (error.message && error.message.includes('locked')) {
          throw error;
        }
        // Otherwise, log and continue
        console.warn('Error checking client lock status after login:', error);
      }
    }
    
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('accessToken', userData.access_token);
    if (userData.agency_id) {
      localStorage.setItem('agency_id', userData.agency_id);
    }
    if (userData.entities && userData.entities.length > 0) {
      localStorage.setItem('entityId', userData.entities[0].id);
    }
    if (userData.refresh_token) {
      startTokenRefresh(userData.refresh_token);
    }
  };

  const login = async (email, password, otp = null) => {
    const loginApiUrl = import.meta.env.VITE_LOGIN_API_URL || 'http://127.0.0.1:8001';
    const encryptedPassword = await encryptData(password);
    const bodyParams = { email, password: encryptedPassword };
    if (otp) {
      bodyParams.otp = otp;
    }

    const response = await fetch(`${loginApiUrl}/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'accept': 'application/json'
      },
      body: new URLSearchParams(bodyParams)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Login failed');
    }

    if (data.role === 'CLIENT_USER' || data.role === 'CLIENT_MASTER_ADMIN') {
      // First fetch profile to get organization_id
      const [profileData, twoFactorStatus] = await Promise.all([
        apiGetProfile(data.access_token),
        apiGet2FAStatus(data.access_token)
      ]);

      if (!profileData.is_active) {
        logout();
        throw new Error('Your account is inactive. Please contact support.');
      }

      // Now fetch clients using the organization_id(s) from profile
      let entitiesData = [];

      if (profileData.organizations && profileData.organizations.length > 0) {
        // Fetch clients for all accessible organizations
        try {
          const promises = profileData.organizations.map(org =>
            listClientsByOrganization(org.id, data.access_token)
              .catch(e => {
                console.error(`Failed to fetch clients for org ${org.id}:`, e);
                return [];
              })
          );

          const results = await Promise.all(promises);
          // Flatten the array of arrays
          entitiesData = results.flat();
        } catch (error) {
          console.error("Failed to fetch clients for organizations:", error);
        }
      } else if (profileData.organization_id) {
        // Fallback for backward compatibility or single org
        try {
          entitiesData = await listClientsByOrganization(profileData.organization_id, data.access_token);
        } catch (error) {
          console.error("Failed to fetch clients for organization:", error);
          // Fallback to empty array or handle error as needed
        }
      }

      const fullUserData = { ...data, ...profileData, entities: entitiesData || [] };
      const is2FA = twoFactorStatus?.status === 'Enabled' || twoFactorStatus?.is_2fa_enabled === true;

      if (is2FA && !otp) {
        return { twoFactorEnabled: true, loginData: fullUserData };
      } else {
        finishLogin(fullUserData);
        return { twoFactorEnabled: false };
      }
    } else if (data.role === 'CLIENT_ADMIN') {
      const [profileData, twoFactorStatus] = await Promise.all([
        apiGetProfile(data.access_token),
        apiGet2FAStatus(data.access_token)
      ]);

      if (!profileData.is_active) {
        logout();
        throw new Error('Your account is inactive. Please contact support.');
      }

      // Fetch all clients for the organization(s)
      let entitiesData = [];

      if (profileData.organizations && profileData.organizations.length > 0) {
        // Fetch clients for all accessible organizations
        try {
          const promises = profileData.organizations.map(org =>
            listClientsByOrganization(org.id, data.access_token)
              .then(clients => {
                if (Array.isArray(clients)) {
                  return clients.map(c => ({ ...c, organization_id: org.id }));
                }
                return [];
              })
              .catch(e => {
                console.error(`Failed to fetch clients for org ${org.id}:`, e);
                return [];
              })
          );

          const results = await Promise.all(promises);
          entitiesData = results.flat();
          console.log('useAuth: fetched entitiesData with organizations:', entitiesData);
        } catch (error) {
          console.error("Failed to fetch clients for organizations:", error);
        }
      } else if (profileData.organization_id) {
        try {
          entitiesData = await listClientsByOrganization(profileData.organization_id, data.access_token);
        } catch (error) {
          console.error("Failed to fetch clients for organization:", error);
        }
      }

      const fullUserData = { ...data, ...profileData, entities: entitiesData || [] };
      const is2FA = twoFactorStatus?.status === 'Enabled' || twoFactorStatus?.is_2fa_enabled === true;

      if (is2FA && !otp) {
        return { twoFactorEnabled: true, loginData: fullUserData };
      } else {
        finishLogin(fullUserData);
        return { twoFactorEnabled: false };
      }
    } else if (data.role === 'CA_ACCOUNTANT') {
      const [profileData, entitiesData, twoFactorStatus] = await Promise.all([
        apiGetProfile(data.access_token, data.agency_id),
        apiGetEntities(data.access_token),
        apiGet2FAStatus(data.access_token)
      ]);
      if (!profileData.is_active) {
        logout();
        throw new Error('Your account is inactive. Please contact support.');
      }
      const fullUserData = { ...data, ...profileData, entities: entitiesData || [] };
      const is2FA = twoFactorStatus?.status === 'Enabled' || twoFactorStatus?.is_2fa_enabled === true;

      if (is2FA && !otp) {
        return { twoFactorEnabled: true, loginData: fullUserData };
      } else {
        finishLogin(fullUserData);
        return { twoFactorEnabled: false };
      }
    } else if (data.role === 'ENTITY_USER') {
      const [profileData, twoFactorStatus] = await Promise.all([
        apiGetProfile(data.access_token),
        apiGet2FAStatus(data.access_token)
      ]);
      if (!profileData.is_active) {
        logout();
        throw new Error('Your account is inactive. Please contact support.');
      }
      // Use user_id from login response (users.id UUID); data.sub is JWT subject (email), not user id
      const fullUserData = { ...data, ...profileData, id: data.user_id ?? data.sub ?? profileData?.id };
      const is2FA = twoFactorStatus?.status === 'Enabled' || twoFactorStatus?.is_2fa_enabled === true;

      if (is2FA && !otp) {
        return { twoFactorEnabled: true, loginData: fullUserData };
      } else {
        finishLogin(fullUserData);
        return { twoFactorEnabled: false };
      }
    } else if (data.role === 'CA_TEAM') {
      const [profileData, twoFactorStatus] = await Promise.all([
        apiGetProfile(data.access_token),
        apiGet2FAStatus(data.access_token)
      ]);
      if (!profileData.is_active) {
        logout();
        throw new Error('Your account is inactive. Please contact support.');
      }
      // Use user_id from login response (users.id UUID); data.sub is JWT subject (email), not user id
      const fullUserData = { ...data, ...profileData, id: data.user_id ?? data.sub ?? profileData?.id };
      const is2FA = twoFactorStatus?.status === 'Enabled' || twoFactorStatus?.is_2fa_enabled === true;

      if (is2FA && !otp) {
        return { twoFactorEnabled: true, loginData: fullUserData };
      } else {
        finishLogin(fullUserData);
        return { twoFactorEnabled: false };
      }
    } else if (data.role === 'SUPER_ADMIN') {
      window.location.href = 'https://admin.fynivo.in';
      return { twoFactorEnabled: false };
    } else if (data.role === 'AGENCY_ADMIN') {
      window.location.href = 'https://agency.fynivo.in';
      return { twoFactorEnabled: false };
    } else {
      throw new Error('Permission Denied. Your user role is not supported.');
    }
  };

  const verifyOtpAndFinishLogin = async (loginData, otp) => {
    const { access_token } = loginData;
    await apiVerify2FA(otp, access_token);
    finishLogin(loginData);
  }

  const value = {
    user,
    login,
    verifyOtpAndFinishLogin,
    logout,
    loading,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
