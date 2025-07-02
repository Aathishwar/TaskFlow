import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'react-toastify';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { User } from '../types';
import api from '../utils/api'; // Corrected import to use default import
import retryOperation from '../utils/retryHelper';

// Update AuthContextType to include token and firebaseUser
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null; // Add token to context type
  isUserSynced: boolean; // Add user sync status
  firebaseUser: any | null; // Add firebaseUser to context type
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string) => Promise<User | null>;
  registerWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  syncUserWithBackend: (firebaseUser: any) => Promise<User>; // Corrected type definition
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null); // Add token state
  const [isUserSynced, setIsUserSynced] = useState(false); // Add sync status
  const [firebaseUser, setFirebaseUser] = useState<any | null>(null); // Add firebaseUser state

  const auth = getAuth();

  // Function to sync user with backend
  const syncUserWithBackend = async (firebaseUser: any) => {
    try {
      console.log('🔄 Syncing user with backend...');
      
      return await retryOperation(async () => {
        const idToken = await firebaseUser.getIdToken();
        const response = await api.post('/auth/firebase', { idToken });
        
        if (response.data.success) {
          const backendUser = response.data.user;
          const backendToken = response.data.token;
          
          // Map backend user to frontend User type
          const syncedUser: User = {
            id: backendUser.id,
            email: backendUser.email,
            displayName: backendUser.displayName,
            profilePicture: backendUser.profilePicture,
            bio: backendUser.bio,
            phone: backendUser.phone,
            location: backendUser.location,
            googleId: backendUser.googleId
          };
          
          setUser(syncedUser);
          setToken(backendToken);
          localStorage.setItem('token', backendToken);
          setIsUserSynced(true);
          
          console.log('✅ User synced successfully:', syncedUser.email);
          return syncedUser;
        } else {
          throw new Error('Backend sync failed');
        }
      }, {
        maxAttempts: 2,
        baseDelay: 1000
      });
    } catch (error: any) {
      console.error('❌ Error syncing user with backend:', error);
      setIsUserSynced(false);
      throw error;
    }
  };

  const login = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      await retryOperation(async () => {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await syncUserWithBackend(userCredential.user);
      }, {
        maxAttempts: 2,
        baseDelay: 1000
      });
      
      toast.success('Welcome back!');
    } catch (error: any) {
      console.error('❌ Login error:', error);
      let errorMessage = 'Login failed';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Email/password sign-in is not enabled. Please contact support';
      } else if (error.message === 'Authentication failed. Please try again later.') {
        errorMessage = 'Connection issue. Please try again later.';
      }
      
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string): Promise<User | null> => {
    setLoading(true);
    try {
      const syncedUser = await retryOperation(async () => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return await syncUserWithBackend(userCredential.user);
      }, {
        maxAttempts: 2,
        baseDelay: 1000
      });
      
      toast.success('Registration successful!');
      return syncedUser;
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      let errorMessage = 'Registration failed';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Email/password registration is not enabled. Please contact support';
      } else if (error.message === 'Authentication failed. Please try again later.') {
        errorMessage = 'Connection issue. Please try again later.';
      }
      
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      await signOut(auth);
      
      // Clear all user-related data
      setUser(null);
      setToken(null); // Clear token state on logout
      setIsUserSynced(false);
      setFirebaseUser(null); // Clear firebaseUser state on logout
      localStorage.removeItem('token');
      localStorage.removeItem('cachedTasks');
      localStorage.removeItem('cachedFilters');
      localStorage.removeItem('userPreferences');
      
      // Clear any other cached data
      sessionStorage.clear();
      
      console.log('👤 User logged out, all data cleared');
      toast.info('You have been logged out');
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('Logout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const registerWithGoogle = async (): Promise<void> => {
    setLoading(true);
    try {
      await retryOperation(async () => {
        const provider = new GoogleAuthProvider();
        const userCredential = await signInWithPopup(auth, provider);
        await syncUserWithBackend(userCredential.user);
      }, {
        maxAttempts: 2,
        baseDelay: 1000
      });
      
      toast.success('Signed in with Google!');
    } catch (error: any) {
      console.error('❌ Google sign-in error:', error);
      let errorMessage = 'Google sign-in failed';
      
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in was cancelled';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Sign-in popup was blocked. Please allow popups for this site';
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'An account already exists with this email using a different sign-in method';
      } else if (error.message === 'Authentication failed. Please try again later.') {
        errorMessage = 'Connection issue. Please try again later.';
      }
      
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent!');
    } catch (error: any) {
      console.error('❌ Password reset error:', error);
      let errorMessage = 'Failed to send password reset email';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address';
      }
      
      toast.error(errorMessage);
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser); // Update firebaseUser state
      if (firebaseUser) {
        try {
          // Fetch and store the ID token
          const idToken = await firebaseUser.getIdToken();
          localStorage.setItem('token', idToken); // Keep in localStorage for persistence
          setToken(idToken); // Update token state

          // Try to sync user with backend, but don't retry too aggressively here
          // since this runs on every auth state change
          try {
            await syncUserWithBackend(firebaseUser);
          } catch (syncError) {
            console.error('❌ Backend sync failed on auth state change:', syncError);
            // Set basic user info from Firebase even if backend sync fails
            const basicUser: User = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '',
              profilePicture: firebaseUser.photoURL || '',
              bio: '',
              phone: '',
              location: '',
              googleId: undefined
            };
            setUser(basicUser);
            setIsUserSynced(false);
            
            // Show a subtle warning but don't show toast here as it might be too noisy
            console.warn('⚠️ User is signed in to Firebase but not synced with backend');
          }
        } catch (error) {
          console.error('❌ Error in auth state change handler:', error);
          // If even getting the ID token fails, clear everything
          setUser(null);
          setToken(null);
          setIsUserSynced(false);
          localStorage.removeItem('token');
        }
      } else {
        console.log('👤 User logged out, clearing user data...');
        setUser(null);
        setToken(null); // Clear token state on logout
        setIsUserSynced(false);
        setFirebaseUser(null); // Clear firebaseUser state on logout
        // Clear any cached data on logout
        localStorage.removeItem('token'); // Also remove token on logout
        localStorage.removeItem('cachedTasks');
        localStorage.removeItem('cachedFilters');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [auth]); // Removed user?.id dependency to prevent infinite loops

  // Add a useEffect to load token from localStorage on initial load
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const value = {
    user,
    isAuthenticated: !!user, // Derive isAuthenticated from user state
    isLoading: loading, // Map loading state to isLoading
    token, // Include token in the context value
    isUserSynced, // Include sync status
    firebaseUser, // Include firebaseUser in the context value
    login,
    logout,
    register,
    registerWithGoogle,
    resetPassword,
    syncUserWithBackend // Include sync function
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
