import { create } from 'zustand';
import { signIn, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  email: string | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isLoading: true,
  userId: null,
  email: null,
  accessToken: null,

  login: async (email: string, password: string) => {
    try {
      // Sign out first if already authenticated
      try {
        await getCurrentUser();
        await signOut();
      } catch {
        // Not authenticated, continue with login
      }

      await signIn({ username: email, password });
      const user = await getCurrentUser();
      const session = await fetchAuthSession();
      // Use idToken for API Gateway Cognito Authorizer
      const token = session.tokens?.idToken?.toString() || null;

      set({
        isAuthenticated: true,
        userId: user.userId,
        email: user.signInDetails?.loginId || email,
        accessToken: token,
      });
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await signOut();
      set({
        isAuthenticated: false,
        userId: null,
        email: null,
        accessToken: null,
      });
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  checkAuth: async () => {
    try {
      const user = await getCurrentUser();
      const session = await fetchAuthSession();
      // Use idToken for API Gateway Cognito Authorizer
      const token = session.tokens?.idToken?.toString() || null;

      set({
        isAuthenticated: true,
        isLoading: false,
        userId: user.userId,
        email: user.signInDetails?.loginId || null,
        accessToken: token,
      });
    } catch {
      set({
        isAuthenticated: false,
        isLoading: false,
        userId: null,
        email: null,
        accessToken: null,
      });
    }
  },

  getAccessToken: async () => {
    const { accessToken } = get();
    if (accessToken) return accessToken;

    try {
      const session = await fetchAuthSession();
      // Use idToken for API Gateway Cognito Authorizer
      const token = session.tokens?.idToken?.toString() || null;
      set({ accessToken: token });
      return token;
    } catch {
      return null;
    }
  },
}));

// Initialize auth check on app load
useAuthStore.getState().checkAuth();
