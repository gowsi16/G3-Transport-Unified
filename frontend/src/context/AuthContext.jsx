import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  // Admin state
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const saved = localStorage.getItem('g3_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Customer state
  const [customerUser, setCustomerUser] = useState(() => {
    try {
      const saved = localStorage.getItem('g3_customer');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const isAdmin = Boolean(adminUser && (adminUser.role === 'admin' || localStorage.getItem('g3_token')));
  const isCustomer = Boolean(customerUser);

  // Admin login via /api/login (direct password)
  const loginAdmin = async (username, password) => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        const userData = await res.json();
        setAdminUser(userData);
        localStorage.setItem('g3_user', JSON.stringify(userData));
        localStorage.setItem('g3_token', userData.token);
        localStorage.setItem('g3_admin_token', userData.token);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Admin login error:', err);
      return false;
    }
  };

  // Complete Admin login after OTP verification
  const completeAdminLogin = (userData, token) => {
    const adminObj = {
      username: userData.username,
      name: userData.name || userData.username,
      role: 'admin',
      token: token,
      email: userData.email
    };
    setAdminUser(adminObj);
    localStorage.setItem('g3_user', JSON.stringify(adminObj));
    localStorage.setItem('g3_token', token);
    localStorage.setItem('g3_admin_token', token);
    localStorage.setItem('g3_admin_user', JSON.stringify(adminObj));
  };

  const logoutAdmin = () => {
    setAdminUser(null);
    localStorage.removeItem('g3_user');
    localStorage.removeItem('g3_token');
    localStorage.removeItem('g3_admin_token');
    localStorage.removeItem('g3_admin_user');
    sessionStorage.clear();
  };

  // Customer login
  const loginCustomer = (customerData, token) => {
    setCustomerUser(customerData);
    localStorage.setItem('g3_customer', JSON.stringify(customerData));
    if (token) localStorage.setItem('customer_token', token);
  };

  const logoutCustomer = () => {
    setCustomerUser(null);
    localStorage.removeItem('g3_customer');
    localStorage.removeItem('customer_token');
  };

  // Smart login helper: if customer payload is passed (has customer_id or phone), sets customer session
  const login = (userData, token) => {
    if (userData && (userData.customer_id || userData.role === 'customer' || userData.phone)) {
      loginCustomer(userData, token);
    } else if (typeof userData === 'string') {
      // Legacy credentials call (username, password)
      return loginAdmin(userData, token);
    } else {
      setAdminUser(userData);
      localStorage.setItem('g3_user', JSON.stringify(userData));
      if (token) localStorage.setItem('g3_token', token);
    }
  };

  const logout = () => {
    logoutAdmin();
    logoutCustomer();
  };

  // Active user depending on context
  const user = customerUser || adminUser || null;

  const value = {
    user,
    adminUser,
    customerUser,
    isAdmin,
    isCustomer,
    isLoggedIn: Boolean(adminUser || customerUser),
    loginAdmin,
    completeAdminLogin,
    logoutAdmin,
    loginCustomer,
    logoutCustomer,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
