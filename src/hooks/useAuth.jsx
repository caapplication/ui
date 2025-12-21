import React, { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { getProfile as apiGetProfile, getEntities as apiGetEntities, refreshToken as apiRefreshToken, verify2FA as apiVerify2FA } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

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
    if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
    }
    window.dispatchEvent(new Event('logout'));
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
          setUser({ ...parsedUser, access_token: accessToken });
          if(parsedUser.refresh_token) {
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
        if(refreshIntervalRef.current) {
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
    if(userData.refresh_token) {
        startTokenRefresh(userData.refresh_token);
    }
  };
  
  const login = async (email, password) => {
    const response = await fetch('http://localhost:8001/login/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'accept': 'application/json'
      },
      body: new URLSearchParams({
        email,
        password
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
    }

    if (data.role === 'CLIENT_USER') {
        const [profileData, entitiesData] = await Promise.all([
            apiGetProfile(data.access_token),
            apiGetEntities(data.access_token)
        ]);

        if (!profileData.is_active) {
            logout();
            throw new Error('Your account is inactive. Please contact support.');
        }
        const fullUserData = { ...data, ...profileData, entities: entitiesData || [] };

        if (profileData.is_2fa_enabled) {
            return { twoFactorEnabled: true, loginData: fullUserData };
        } else {
            finishLogin(fullUserData);
            return { twoFactorEnabled: false };
        }
    } else if (data.role === 'CA_ACCOUNTANT') {
        const [profileData, entitiesData] = await Promise.all([
            apiGetProfile(data.access_token, data.agency_id),
            apiGetEntities(data.access_token)
        ]);
        if (!profileData.is_active) {
            logout();
            throw new Error('Your account is inactive. Please contact support.');
        }
        const fullUserData = { ...data, ...profileData, name: data.agency_name, entities: entitiesData || [] };
        
        if (profileData.is_2fa_enabled) {
            return { twoFactorEnabled: true, loginData: fullUserData };
        } else {
            finishLogin(fullUserData);
            return { twoFactorEnabled: false };
        }
    } else if (data.role === 'ENTITY_USER') {
        const profileData = await apiGetProfile(data.access_token);
        if (!profileData.is_active) {
            logout();
            throw new Error('Your account is inactive. Please contact support.');
        }
        const fullUserData = { ...data, ...profileData, id: data.sub };
        
        if (profileData.is_2fa_enabled) {
            return { twoFactorEnabled: true, loginData: fullUserData };
        } else {
            finishLogin(fullUserData);
            return { twoFactorEnabled: false };
        }
    } else if (data.role === 'CA_TEAM') {
        const profileData = await apiGetProfile(data.access_token);
        if (!profileData.is_active) {
            logout();
            throw new Error('Your account is inactive. Please contact support.');
        }
        const fullUserData = { ...data, ...profileData, id: data.sub };
        
        if (profileData.is_2fa_enabled) {
            return { twoFactorEnabled: true, loginData: fullUserData };
        } else {
            finishLogin(fullUserData);
            return { twoFactorEnabled: false };
        }
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
