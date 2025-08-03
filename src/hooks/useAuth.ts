/**
 * Authentication Hook
 * Manages user authentication state and operations
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { simulationWebSocket } from '@/lib/websocket/client';
import { logger } from '@/lib/logger';
import { errorHandler, ErrorType } from '@/lib/errorHandler';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const { toast } = useToast();

  /**
   * Initialize authentication state
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        const user = await apiClient.getCurrentUser();
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
        
        // Set user ID for logging
        logger.setUserId(user.id);
        
        logger.info('User authenticated on init', {
          componentName: 'useAuth',
          action: 'auth_init_success',
          payload: { userId: user.id }
        });
      } catch (error) {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
        
        logger.debug('No authenticated user found', {
          componentName: 'useAuth',
          action: 'auth_init_no_user'
        });
      }
    };

    initAuth();
  }, []);

  /**
   * Login user
   */
  const login = useCallback(async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const response = await apiClient.login(email, password);
      
      // Set auth token
      apiClient.setAuthToken(response.access_token);
      simulationWebSocket.setAuthToken(response.access_token);
      
      setAuthState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
      
      // Set user ID for logging
      logger.setUserId(response.user.id);
      
      logger.userAction('login', 'useAuth', { userId: response.user.id });
      
      toast({
        title: 'Welcome back!',
        description: `Successfully logged in as ${response.user.name}`,
      });
      
      return response.user;
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      
      const appError = errorHandler.handleError(
        error instanceof Error ? error : new Error('Login failed'),
        'useAuth'
      );
      
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: appError.userFriendlyMessage || 'Please check your credentials and try again.',
      });
      
      throw appError;
    }
  }, [toast]);

  /**
   * Register new user
   */
  const register = useCallback(async (userData: { email: string; password: string; name: string }) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const response = await apiClient.register(userData);
      
      // Set auth token
      apiClient.setAuthToken(response.access_token);
      simulationWebSocket.setAuthToken(response.access_token);
      
      setAuthState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
      
      // Set user ID for logging
      logger.setUserId(response.user.id);
      
      logger.userAction('register', 'useAuth', { userId: response.user.id });
      
      toast({
        title: 'Account Created!',
        description: `Welcome to Architech, ${response.user.name}!`,
      });
      
      return response.user;
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      
      const appError = errorHandler.handleError(
        error instanceof Error ? error : new Error('Registration failed'),
        'useAuth'
      );
      
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: appError.userFriendlyMessage || 'Please try again with different details.',
      });
      
      throw appError;
    }
  }, [toast]);

  /**
   * Logout user
   */
  const logout = useCallback(() => {
    apiClient.clearAuthToken();
    simulationWebSocket.disconnect();
    
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
    
    logger.userAction('logout', 'useAuth');
    
    toast({
      title: 'Logged Out',
      description: 'You have been successfully logged out.',
    });
  }, [toast]);

  /**
   * Refresh user data
   */
  const refreshUser = useCallback(async () => {
    try {
      if (!authState.isAuthenticated) return;
      
      const user = await apiClient.getCurrentUser();
      setAuthState(prev => ({ ...prev, user }));
      
      logger.userAction('refresh_user', 'useAuth', { userId: user.id });
      
      return user;
    } catch (error) {
      // If refresh fails, user might be logged out
      logout();
      throw error;
    }
  }, [authState.isAuthenticated, logout]);

  return {
    ...authState,
    login,
    register,
    logout,
    refreshUser,
  };
};