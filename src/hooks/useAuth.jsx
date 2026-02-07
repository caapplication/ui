import React, { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { getProfile as apiGetProfile, getEntities as apiGetEntities, refreshToken as apiRefreshToken, verify2FA as apiVerify2FA, get2FAStatus as apiGet2FAStatus } from '@/lib/api';
import { listClientsByOrganization } from '@/lib/api/clients';
import { useNavigate } from 'react-router-dom';
import { clearAttachmentCache } from '@/lib/cache';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshIntervalRef = useRef(null);
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
      try {
        const data = await apiRefreshToken(refreshTokenValue);
        updateUser({ access_token: data.access_token });
        console.log("Token refreshed successfully");
      } catch (error) {
        console.error("Failed to refresh token, logging out.", error);
        logout();
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

  useEffect(() => {
    let activityTimer;

    const resetTimer = () => {
      clearTimeout(activityTimer);
      activityTimer = setTimeout(() => {
        logout();
      }, 30 * 60 * 1000);
    };

    const events = ['mousemove', 'keydown', 'scroll', 'click'];

    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      clearTimeout(activityTimer);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [logout]);

  const finishLogin = (userData) => {
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
    const bodyParams = { email, password };
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
      const fullUserData = { ...data, ...profileData, id: data.sub };
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
      const fullUserData = { ...data, ...profileData, id: data.sub };
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
    await apiVerify2FA(access_token, otp);
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
