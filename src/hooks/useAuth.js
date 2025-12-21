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
          // Defensive fix: If organization_id looks like a JWT, try to use a proper UUID field if available
          if (
            parsedUser.organization_id &&
            typeof parsedUser.organization_id === 'string' &&
            parsedUser.organization_id.split('.').length === 3 // JWTs have 2 periods
          ) {
            // Try to use another field if available
            parsedUser.organization_id =
              parsedUser.organisation_id ||
              parsedUser.org_id ||
              parsedUser.ca_account_id ||
              '';
          }
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
    if (userData.agency_id) {
      localStorage.setItem('agency_id', userData.agency_id);
    }
  };
  
  const login = async (email, password) => {
    const response = await fetch('http://127.0.0.1:8001/login/', {
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

        // Ensure organization_id is set to the true organization UUID from profileData
        const organizationId =
            profileData.organization_id ||
            profileData.organisation_id ||
            profileData.org_id ||
            data.organization_id ||
            data.organisation_id ||
            data.org_id ||
            '';

        const fullUserData = {
            ...data,
            ...profileData,
            entities: entitiesData || [],
            organization_id: organizationId
        };

        if (profileData.is_2fa_enabled) {
            return { twoFactorEnabled: true, loginData: fullUserData };
        } else {
            finishLogin(fullUserData);
            return { twoFactorEnabled: false };
        }
    } else if (data.role === 'CA_ACCOUNTANT') {
        const profileData = await apiGetProfile(data.access_token, data.agency_id);

        // Ensure organization_id is set to the true organization UUID from profileData
        const organizationId =
            profileData.organization_id ||
            profileData.organisation_id ||
            profileData.org_id ||
            data.organization_id ||
            data.organisation_id ||
            data.org_id ||
            '';

        const fullUserData = {
            ...data,
            ...profileData,
            name: data.agency_name,
            organization_id: organizationId
        };
        
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
    localStorage.removeItem('agency_id');
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
