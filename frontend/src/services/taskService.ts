import api from '../utils/api';
import { withRetry } from '../utils/retryWithWarmup';
import { Task, CreateTaskData, UpdateTaskData, TaskFilters, TaskResponse } from '../types';

interface GetTasksParams extends TaskFilters {
  page?: number;
  limit?: number;
}

export const taskService = {
  // Get all tasks with filters and pagination
  getTasks: async (params: GetTasksParams = {}): Promise<TaskResponse> => {
    return withRetry(async () => {
      const response = await api.get('/tasks', { params });
      return response.data;
    }, { maxAttempts: 3 });
  },

  // Create a new task
  createTask: async (taskData: CreateTaskData): Promise<Task> => {
    const response = await api.post('/tasks', taskData);
    return response.data.task;
  },

  // Update an existing task
  updateTask: async (taskId: string, taskData: UpdateTaskData): Promise<Task> => {
    const response = await api.put(`/tasks/${taskId}`, taskData);
    return response.data.task;
  },

  // Delete a task
  deleteTask: async (taskId: string): Promise<void> => {
    await api.delete(`/tasks/${taskId}`);
  },

  // Share a task with another user
  shareTask: async (taskId: string, email: string): Promise<Task> => {
    const response = await api.post(`/tasks/${taskId}/share`, { email });
    return response.data.task;
  },

  // Remove a user from a shared task
  removeUserFromTask: async (taskId: string, userId: string): Promise<Task> => {
    const response = await api.delete(`/tasks/${taskId}/share/${userId}`);
    return response.data.task;
  },

  // Get tasks shared with the user
  getSharedTasks: async (params: GetTasksParams = {}): Promise<TaskResponse> => {
    return withRetry(async () => {
      const response = await api.get('/tasks/shared', { params });
      return response.data;
    }, { maxAttempts: 3 });
  },
};
