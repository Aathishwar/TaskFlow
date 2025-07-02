import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, Text, VStack } from '@chakra-ui/react';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import Home from './pages/Home';
import LoadingSpinner from './components/LoadingSpinner';
import ModeChanger from './components/ModeChanger';
import Register from './pages/Register';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, isUserSynced } = useAuth();

  if (isLoading) {
    return (
      <Box minH="100vh" bg="gray.50" display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <LoadingSpinner />
          <Text>Loading application...</Text>
        </VStack>
      </Box>
    );
  }

  // Only redirect if we're sure the user is not authenticated
  // Don't redirect if user is authenticated but not synced (temporary state)
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Show loading if user is authenticated but not synced with backend
  if (isAuthenticated && !isUserSynced) {
    return (
      <Box minH="100vh" bg="gray.50" display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <LoadingSpinner />
          <Text>Syncing user data...</Text>
        </VStack>
      </Box>
    );
  }

  return <>{children}</>;
};

// Public Route Component (redirects to dashboard if already authenticated and synced)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, isUserSynced } = useAuth();

  if (isLoading) {
    return (
      <Box minH="100vh" bg="gray.50" display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <LoadingSpinner />
          <Text>Loading application...</Text>
        </VStack>
      </Box>
    );
  }

  // Only redirect to dashboard if user is authenticated AND synced
  // This prevents premature redirects during authentication process
  if (isAuthenticated && isUserSynced) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  const { isLoading } = useAuth(); // Removed unused 'isAuthenticated'

  // Enable authentication for proper login flow
  const skipAuth = false; // Set to true to skip authentication for development

  // Reduced debug logging to prevent excessive console output
  if (!skipAuth && isLoading) {
    return (
      <Box minH="100vh" bg="gray.50" display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <LoadingSpinner />
          <Text>Loading application...</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        <Route 
          path="/register" 
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ModeChanger />
    </>
  );
}

export default App;
