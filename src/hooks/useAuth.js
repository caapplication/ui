import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { getProfile as apiGetProfile, getEntities as apiGetEntities } from '@/lib/api';

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

  useEffect(() => {
    const initializeUser = async () => {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
        } catch (error) {
          console.error("Failed to parse user data", error);
          logout();
        }
      }
      setLoading(false);
    };
    initializeUser();
  }, []);

  const finishLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };
  
  const login = async (email, password) => {
    const response = await fetch('https://login-api.snolep.com/login/', {
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

        const fullUserData = { ...data, ...profileData, entities: entitiesData || [] };

        if (profileData.is_2fa_enabled) {
            return { twoFactorEnabled: true, loginData: fullUserData };
        } else {
            finishLogin(fullUserData);
            return { twoFactorEnabled: false };
        }
    } else if (data.role === 'CA_ACCOUNTANT') {
        const profileData = await apiGetProfile(data.access_token);
        const fullUserData = { ...data, ...profileData, name: data.agency_name };
        
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
    finishLogin(loginData);
  }

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('entityData');
    localStorage.removeItem('beneficiaries');
  };

  const updateUser = useCallback((updatedData) => {
    setUser(prevUser => {
        if (!prevUser) return null;
        const newUser = { ...prevUser, ...updatedData };
        localStorage.setItem('user', JSON.stringify(newUser));
        return newUser;
    });
  }, []);

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