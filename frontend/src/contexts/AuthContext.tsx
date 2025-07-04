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
  authInitialized: boolean; // Add auth initialization status
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string) => Promise<User | null>;
  registerWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  syncUserWithBackend: (firebaseUser: any) => Promise<User>; // Corrected type definition
  updateUser: (userData: Partial<User>) => void; // Add updateUser function
  initializeAuthIfNeeded: () => void; // Add function to manually initialize auth
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(false); // Start with false for immediate load
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null); // Add token state
  const [isUserSynced, setIsUserSynced] = useState(false); // Add sync status
  const [firebaseUser, setFirebaseUser] = useState<any | null>(null); // Add firebaseUser state
  const [skipNextSync, setSkipNextSync] = useState(false); // Add flag to skip sync
  const [authInitialized, setAuthInitialized] = useState(false); // Track if auth has been initialized

  const auth = getAuth();

  // Function to sync user with backend
  const syncUserWithBackend = async (firebaseUser: any) => {
    try {
      // Syncing user with backend
      
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
          
          // User synced successfully
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
      
      // Preserve Firebase error codes for the UI to handle appropriately
      // Let Login component handle these with custom UI
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        throw error; // Let the Login component handle these
      }
      
      let errorMessage = 'Login failed';
      
      if (error.code === 'auth/wrong-password') {
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
      
      // User logged out, all data cleared
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

  // Function to manually initialize auth when needed
  const initializeAuthIfNeeded = () => {
    if (!authInitialized && !loading) {
      // Manually initializing auth
      setLoading(true);
      
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        setFirebaseUser(firebaseUser);
        if (firebaseUser) {
          try {
            const idToken = await firebaseUser.getIdToken();
            localStorage.setItem('token', idToken);
            setToken(idToken);

            if (!skipNextSync) {
              try {
                await syncUserWithBackend(firebaseUser);
              } catch (syncError) {
                console.error('❌ Backend sync failed:', syncError);
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
              }
            }
          } catch (error) {
            console.error('❌ Error in manual auth initialization:', error);
            setUser(null);
            setToken(null);
            setIsUserSynced(false);
            localStorage.removeItem('token');
          }
        }
        setLoading(false);
        setAuthInitialized(true);
      });
      
      // Store unsubscribe function for later cleanup if needed
      return unsubscribe;
    }
  };

  // Function to update user data in context
  const updateUser = (userData: Partial<User>) => {
    // updateUser called with new data
    
    if (user) {
      const updatedUser = { ...user, ...userData };
      // Setting updated user
      setUser(updatedUser);
      
      // Also update localStorage to persist the change
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Set flag to skip next Firebase sync to prevent override
      setSkipNextSync(true);
      setTimeout(() => setSkipNextSync(false), 2000); // Reset after 2 seconds
    } else {
      // updateUser called but user is null
    }
  };

  useEffect(() => {
    // Don't initialize Firebase auth listener immediately
    // This prevents the loading state on first page load
    let unsubscribe: (() => void) | null = null;
    
    // Only initialize auth if we have a token in localStorage (returning user)
    // or if user tries to access protected routes
    const storedToken = localStorage.getItem('token');
    
    if (storedToken) {
      // Found stored token, initializing auth
      setToken(storedToken);
      setLoading(true);
      initializeAuth();
    } else {
      // No stored token, skipping auth initialization
      setAuthInitialized(true);
    }
    
    function initializeAuth() {
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        setFirebaseUser(firebaseUser); // Update firebaseUser state
        if (firebaseUser) {
          try {
            // Fetch and store the ID token
            const idToken = await firebaseUser.getIdToken();
            localStorage.setItem('token', idToken); // Keep in localStorage for persistence
            setToken(idToken); // Update token state

            // Try to sync user with backend, but don't retry too aggressively here
            // since this runs on every auth state change
            if (!skipNextSync) {
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
            } else {
              // Skipping Firebase sync due to recent manual update
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
          // User logged out, clearing user data
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
        setAuthInitialized(true);
      });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [auth, skipNextSync]); // Include skipNextSync in dependencies

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
    authInitialized, // Include auth initialization status
    login,
    logout,
    register,
    registerWithGoogle,
    resetPassword,
    syncUserWithBackend, // Include sync function
    updateUser, // Include updateUser function
    initializeAuthIfNeeded // Include manual auth initialization function
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
