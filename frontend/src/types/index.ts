import { Socket } from 'socket.io-client';

export interface User {
  id: string;
  email: string;
  displayName: string;
  profilePicture?: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  owner: User;
  sharedWith: User[];
  createdAt: string;
  updatedAt: string;
  isOverdue?: boolean;
  tags?: string[];
}

export interface CreateTaskData {
  title: string;
  description?: string;
  status?: 'pending' | 'in-progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  tags?: string[];
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: 'pending' | 'in-progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  tags?: string[];
}

export interface TaskFilters {
  status?: 'pending' | 'in-progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  search?: string;
}

export interface Pagination {
  currentPage: number;
  totalPages: number;
  totalTasks: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface TaskResponse {
  success: boolean;
  tasks: Task[];
  pagination: Pagination;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any[];
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string) => Promise<User | null>;
  registerWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

export interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}
