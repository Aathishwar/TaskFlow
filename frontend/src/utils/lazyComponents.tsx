import { lazy } from 'react';

// Lazy load heavy components to reduce initial bundle size
export const LazyDashboardPage = lazy(() => import('../pages/DashboardPage'));
export const LazyProfilePage = lazy(() => import('../pages/ProfilePage'));
export const LazyTaskModal = lazy(() => import('../components/TaskModal'));
export const LazyShareModal = lazy(() => import('../components/ShareModal'));
export const LazySharedUsersModal = lazy(() => import('../components/SharedUsersModal'));

// Preload components on user interaction (hover/focus)
export const preloadDashboard = () => import('../pages/DashboardPage');
export const preloadProfile = () => import('../pages/ProfilePage');
export const preloadTaskModal = () => import('../components/TaskModal');
