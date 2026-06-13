import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../services/api';
import socket from '../services/socket';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('dms_token');
      const storedUser = localStorage.getItem('dms_user');

      if (storedToken && storedUser) {
        try {
          // Optimistically set state
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          setIsAuthenticated(true);

          // Verify token is still valid with backend
          const response = await auth.getMe();
          if (response.data && response.data.user) {
            setUser(response.data.user);
            localStorage.setItem('dms_user', JSON.stringify(response.data.user));
          }
          socket.connect();
        } catch (error) {
          console.error("Token validation failed:", error);
          localStorage.removeItem('dms_token');
          localStorage.removeItem('dms_user');
          setUser(null);
          setToken(null);
          setIsAuthenticated(false);
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const response = await auth.login({ email, password });
      const { token: newToken, user: newUser } = response.data;

      localStorage.setItem('dms_token', newToken);
      localStorage.setItem('dms_user', JSON.stringify(newUser));

      setUser(newUser);
      setToken(newToken);
      setIsAuthenticated(true);
      
      socket.connect();
      return newUser;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('dms_token');
    localStorage.removeItem('dms_user');
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    socket.disconnect();
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
