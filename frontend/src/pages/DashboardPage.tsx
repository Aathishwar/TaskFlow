import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Button,
  useDisclosure,
  Flex,
  Text,
  useToast,
  Tab,
  Tabs,
  TabList,
  TabPanel,
  TabPanels,
  useColorModeValue,
} from '@chakra-ui/react';
import { AddIcon } from '@chakra-ui/icons';

import Navbar from '../components/Navbar';
import TaskList from '../components/TaskList';
import TaskModal from '../components/TaskModal';
import ShareModal from '../components/ShareModal';
import TaskFilters from '../components/TaskFilters';
import LoadingSpinner from '../components/LoadingSpinner';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { taskService } from '../services/taskService';
import { Task, TaskFilters as TaskFiltersType, CreateTaskData, UpdateTaskData } from '../types';
import { useTaskNotifications } from '../hooks/useTaskNotifications';

// Tab configuration with colors matching the design
const tabConfig = [
  { 
    label: 'All Tasks', 
    value: 'all', 
    colorScheme: 'blue',
    bgColor: 'blue.50',
    borderColor: 'blue.200',
    textColor: 'blue.600'
  },
  { 
    label: 'In Progress', 
    value: 'in-progress', 
    colorScheme: 'orange',
    bgColor: 'orange.50',
    borderColor: 'orange.200',
    textColor: 'orange.600'
  },
  { 
    label: 'Due Today', 
    value: 'due-today', 
    colorScheme: 'yellow',
    bgColor: 'yellow.50',
    borderColor: 'yellow.200',
    textColor: 'yellow.600'
  },
  { 
    label: 'Overdue', 
    value: 'overdue', 
    colorScheme: 'red',
    bgColor: 'red.50',
    borderColor: 'red.200',
    textColor: 'red.600'
  },
  { 
    label: 'Completed', 
    value: 'completed', 
    colorScheme: 'green',
    bgColor: 'green.50',
    borderColor: 'green.200',
    textColor: 'green.600'
  },
  {
    label: 'Shared With Me',
    value: 'shared',
    colorScheme: 'purple',
    bgColor: 'purple.50',
    borderColor: 'purple.200',
    textColor: 'purple.600',
  },
];

const DashboardPage: React.FC = () => {
  // State management
  const [tasks, setTasks] = useState<Task[]>([]); // owned tasks
  const [sharedTasks, setSharedTasks] = useState<Task[]>([]); // shared with me
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<TaskFiltersType>({});
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);
  const [activeTab, setActiveTab] = useState(0);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [unsharedTaskIdsPendingUpdate, setUnsharedTaskIdsPendingUpdate] = useState<string[]>([]); // New state for pending updates
  const [notificationsEnabled] = useState<boolean>(
    localStorage.getItem('taskflow-notifications-enabled') === 'true' || false
  ); // Notification state

  // Ref to track initial load status per user
  const initialLoadDoneRef = useRef<{ [userId: string]: boolean }>({});

  // UI state
  const { isOpen: isTaskModalOpen, onOpen: onTaskModalOpen, onClose: onTaskModalClose } = useDisclosure();
  const { isOpen: isShareModalOpen, onOpen: onShareModalOpen, onClose: onShareModalClose } = useDisclosure(); // isShareModalOpen state is already available

  // Hooks
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const toast = useToast();

  // Combine all tasks for notifications (both owned and shared)
  const allTasks = [...tasks, ...sharedTasks];

  // Initialize task notifications
  useTaskNotifications({
    tasks: allTasks,
    isEnabled: notificationsEnabled,
    checkInterval: 5 * 60 * 1000 // Check every 5 minutes
  });

  // Color mode values
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedTextColor = useColorModeValue('gray.600', 'gray.300');

  // Filter tasks based on active tab and search/filter bar
  const filterTasksByTab = useCallback((tasksToFilter: Task[], tabValue: string, searchFilters: TaskFiltersType = {}) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // First apply tab-based filtering
    let filtered = tasksToFilter;
    switch (tabValue) {
      case 'all':
        filtered = tasksToFilter;
        break;
      case 'in-progress':
        filtered = tasksToFilter.filter(task => task.status === 'in-progress');
        break;
      case 'due-today':
        filtered = tasksToFilter.filter(task => {
          if (!task.dueDate) return false;
          const dueDate = new Date(task.dueDate);
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          return dueDate >= todayStart && dueDate <= today && task.status !== 'completed';
        });
        break;
      case 'overdue':
        filtered = tasksToFilter.filter(task => {
          if (!task.dueDate) return false;
          return new Date(task.dueDate) < today && task.status !== 'completed';
        });
        break;
      case 'completed':
        filtered = tasksToFilter.filter(task => task.status === 'completed');
        break;
      case 'shared':
        filtered = tasksToFilter.filter(task => task.sharedWith && task.sharedWith.length > 0 && (!task.owner || (task.owner && task.owner.id !== (user?.id || ''))));
        break;
      default:
        filtered = tasksToFilter;
    }

    // Then apply search/filter bar filters
    if (searchFilters.search) {
      const searchTerm = searchFilters.search.toLowerCase();
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchTerm) ||
        (task.description && task.description.toLowerCase().includes(searchTerm))
      );
    }

    if (searchFilters.status) {
      filtered = filtered.filter(task => task.status === searchFilters.status);
    }

    if (searchFilters.priority) {
      filtered = filtered.filter(task => task.priority === searchFilters.priority);
    }

    return filtered;
  }, [user?.id]); // Add user?.id as dependency

  // Function to handle task updates (used by socket and TaskCard)
  const handleTaskUpdated = useCallback((updatedTask: Task) => {
    console.log('✏️ DashboardPage: Task updated via Socket.IO:', updatedTask.title, updatedTask._id, 'Owner:', updatedTask.owner, 'SharedWith:', updatedTask.sharedWith.map(u => u.displayName)); // Added logs

    let newOwnedTasks = tasks;
    let newSharedTasks = sharedTasks;

    // Update owned tasks if the task exists there
    const ownedTaskIndex = tasks.findIndex(task => task._id === updatedTask._id);
    if (ownedTaskIndex !== -1) {
      console.log('✅ DashboardPage: Updating task in owned tasks state');
      newOwnedTasks = tasks.map(task =>
        task._id === updatedTask._id ? updatedTask : task
      );
      setTasks(newOwnedTasks);
    }

    // Update shared tasks if the task exists there
    const sharedTaskIndex = sharedTasks.findIndex(task => task._id === updatedTask._id);
    if (sharedTaskIndex !== -1) {
       console.log('✅ DashboardPage: Updating task in shared tasks state');
       newSharedTasks = sharedTasks.map(task =>
        task._id === updatedTask._id ? updatedTask : task
      );
      setSharedTasks(newSharedTasks);
    }

    // Re-filter tasks immediately after state update
    // The useEffect below handles the filtering based on the updated state.
    // No need to manually call setFilteredTasks here.

  }, [tasks, sharedTasks]); // Keep dependencies, removed activeTab, filters, filterTasksByTab as useEffect handles this

  // Update filtered tasks when tasks, sharedTasks, active tab, or filters change
  // This useEffect is now less critical for immediate updates but still useful for initial load and filter changes
  useEffect(() => {
    console.log('🔄 DashboardPage: Running filtering effect...');
    const currentTabValue = tabConfig[activeTab].value;
    const baseTasks = currentTabValue === 'shared' ? sharedTasks : tasks;
    const filtered = filterTasksByTab(baseTasks, currentTabValue, filters);
    setFilteredTasks(filtered);
    console.log('✅ DashboardPage: Filtering effect complete:', { filteredCount: filtered.length, activeTab: currentTabValue });
  }, [tasks, sharedTasks, activeTab, filters, filterTasksByTab]); // Keep dependencies

  // Handle filter changes from the filter bar
  const handleFiltersChange = (newFilters: TaskFiltersType) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
    loadTasks(1, newFilters); // Only reload tasks
  };

  // Clean function to load tasks with better error handling
  const loadTasks = async (page: number = 1, currentFilters: TaskFiltersType = {}, retryCount: number = 0) => {
    if (!user) {
      console.log('ℹ️ Skipping task load: User not available.');
      return;
    }

    console.log('🔄 Loading tasks for user:', user.email, 'with filters:', currentFilters, 'page:', page);

    try {
      setLoading(true);
      setLoadError(null);
      
      const [ownedResponse, sharedResponse] = await Promise.all([
        taskService.getTasks({ page, limit: 10, ...currentFilters }),
        taskService.getSharedTasks?.({ page, limit: 10, ...currentFilters }) || Promise.resolve({ 
          tasks: [], 
          pagination: { currentPage: 1, totalPages: 1, totalTasks: 0, hasNextPage: false, hasPrevPage: false }
        })
      ]);

      if (!ownedResponse?.tasks || !ownedResponse.pagination) {
        throw new Error('Invalid response structure from server');
      }

      // Only update tasks and sharedTasks states
      setTasks(ownedResponse.tasks);
      setSharedTasks(sharedResponse?.tasks || []);
      setCurrentPage(ownedResponse.pagination.currentPage);
      setTotalPages(ownedResponse.pagination.totalPages);

      console.log('✅ Tasks loaded successfully:', ownedResponse.tasks.length, 'owned tasks,', sharedResponse?.tasks?.length || 0, 'shared tasks');
    } catch (error: any) {
      console.error('❌ Error loading tasks:', error);
      
      // Skip error handling for duplicate requests (they're internal optimization)
      if (error.message === 'Duplicate request blocked') {
        console.log('ℹ️ Duplicate request was blocked - this is normal');
        return;
      }

      // Determine error message based on error type
      let errorMessage = 'Failed to load tasks';
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please check your connection.';
      } else if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Unable to connect to server. Please try again.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied. You don\'t have permission to view tasks.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      // Retry logic for network errors (up to 2 retries)
      if (retryCount < 2 && (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK')) {
        console.log(`🔄 Retrying task load in 2 seconds... (${retryCount + 1}/2)`);
        setTimeout(() => {
          loadTasks(page, currentFilters, retryCount + 1);
        }, 2000);
        return;
      }
      
      // Set error state for UI display
      setLoadError(errorMessage);
      
      toast({
        title: 'Error Loading Tasks',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle user changes - clear tasks when user changes and reset initial load ref
  useEffect(() => {
    if (user?.id) { // Trigger only when user ID becomes available
      console.log('👤 User ID available, preparing for initial task load...');
      setTasks([]);
      setSharedTasks([]);
      setFilteredTasks([]);
      setCurrentPage(1);
      setLoadError(null);
      // Ensure initial load ref is false for this user
      initialLoadDoneRef.current[user.id] = false;
      
      // Trigger the initial load
      loadTasks(1, {});
    } else {
        // Clear tasks and reset when user logs out
        console.log('👤 User logged out, clearing tasks.');
        setTasks([]);
        setSharedTasks([]);
        setFilteredTasks([]);
        setCurrentPage(1);
        setLoadError(null);
        // Clear all initial load flags
        initialLoadDoneRef.current = {};
    }
  }, [user?.id]); // Only trigger when user ID changes

  // Load tasks when filters or active tab change
  useEffect(() => {
    if (user?.id) {
      console.log('🔄 Loading tasks due to filter or tab change for user:', user.email);
      loadTasks(1, filters);
    }
  }, [filters, activeTab]); // Added activeTab dependency

  // Socket.IO real-time updates - enhanced with better error handling
  useEffect(() => {
    if (!socket || !isConnected || !user?.id) {
      console.log('🔌 Socket not ready for real-time updates:', { 
        hasSocket: !!socket, 
        isConnected, 
        hasUser: !!user 
      });
      return;
    }

    console.log('🔌 Setting up socket event listeners for user:', user.email);

    // Test socket connection
    socket.emit('test_event', { message: 'Testing socket connection from DashboardPage' });
    socket.on('test_response', (data) => {
      console.log('✅ Socket test response received:', data);
    });

    const handleTaskCreated = (task: Task) => {
      console.log('🆕 DashboardPage: Task created via Socket.IO:', task.title, task._id);

      setTasks(prev => {
        // Check if task already exists to prevent duplicates
        const exists = prev.find(t => t._id === task._id);
        if (exists) {
          console.log('⚠️ DashboardPage: Task already exists, skipping duplicate');
          return prev;
        }
        console.log('✅ DashboardPage: Adding new task to owned tasks state');
        const newTasks = [task, ...prev];
        // Re-filter after adding a new task
        // The useEffect below handles the filtering based on the updated state.
        // No need to manually call setFilteredTasks here.
        return newTasks;
      });
    };

    // Use the moved handleTaskUpdated function
    // const handleTaskUpdated = (updatedTask: Task) => { ... }; // Removed from here

    const handleTaskDeleted = ({ taskId }: { taskId: string }) => {
      console.log('🗑️ DashboardPage: Task deleted via Socket.IO:', taskId);

      setTasks(prev => {
        const filteredOwned = prev.filter(task => task._id !== taskId);
        console.log('✅ DashboardPage: Removed task from owned tasks state');
         // The useEffect below handles the filtering based on the updated state.
        // No need to manually call setFilteredTasks here.
        return filteredOwned;
      });
      setSharedTasks(prev => {
        const filteredShared = prev.filter(task => task._id !== taskId);
        console.log('✅ DashboardPage: Removed task from shared tasks state');
         // The useEffect below handles the filtering based on the updated state.
        // No need to manually call setFilteredTasks here.
        return filteredShared;
      });
    };

    const handleTaskShared = (sharedTask: Task) => {
      console.log('📤 DashboardPage: Task shared via Socket.IO:', sharedTask.title, sharedTask._id, 'Owner:', sharedTask.owner); // Added owner log

      setSharedTasks(prev => {
        const exists = prev.find(task => task._id === sharedTask._id);
        let newSharedTasks;
        if (exists) {
          console.log('✅ DashboardPage: Updating existing shared task in sharedTasks state');
          newSharedTasks = prev.map(task =>
            task._id === sharedTask._id ? sharedTask : task
          );
        } else {
          console.log('✅ DashboardPage: Adding new shared task to sharedTasks state');
          newSharedTasks = [sharedTask, ...prev];
        }

        // After updating sharedTasks, the useEffect that watches state dependencies will re-filter.
        // No need to manually call setFilteredTasks here.

        return newSharedTasks; // Return the updated sharedTasks array
      });

      // No need to update the 'tasks' state here for a recipient receiving a shared task event.
      // The owner receives a 'task_updated' event.
    };

    // New handler for task_unshared event
    const handleTaskUnshared = ({ taskId }: { taskId: string }) => {
      console.log('🔌 DashboardPage: Task unshared via Socket.IO:', taskId);
      if (isShareModalOpen) {
        console.log('⏳ Share modal is open, delaying task list update for task:', taskId);
        setUnsharedTaskIdsPendingUpdate(prev => [...prev, taskId]);
      } else {
        console.log('✅ Share modal is closed, immediately reloading tasks.');
        // Reload tasks to reflect the unshared task removal
        loadTasks(currentPage, filters); // Reload current page with current filters
      }
    };

    // Subscribe to events
    socket.on('task_created', handleTaskCreated);
    socket.on('task_updated', handleTaskUpdated); // Use the moved function
    socket.on('task_deleted', handleTaskDeleted);
    socket.on('task_shared', handleTaskShared);
    socket.on('task_unshared', handleTaskUnshared); // Subscribe to the new event

    // Cleanup
    return () => {
      console.log('🔌 Cleaning up socket event listeners');
      socket.off('test_response');
      socket.off('task_created', handleTaskCreated);
      socket.off('task_updated', handleTaskUpdated); // Clean up the moved function listener
      socket.off('task_deleted', handleTaskDeleted);
      socket.off('task_shared', handleTaskShared);
      socket.off('task_unshared', handleTaskUnshared); // Clean up the new listener
    };
  }, [socket, isConnected, user?.id, handleTaskUpdated, activeTab, filters, filterTasksByTab, tasks, sharedTasks, isShareModalOpen]); // Add isShareModalOpen dependency

  // CRUD Operations
  const handleCreateTask = async (taskData: CreateTaskData) => {
    try {
      console.log('➕ DashboardPage: Creating task:', taskData);
      setLoading(true); // Set loading state during creation
      
      const createdTask = await taskService.createTask(taskData);
      console.log('✅ DashboardPage: Task created successfully:', createdTask);
      
      // Close modal first
      onTaskModalClose();
      
      // Show success toast
      toast({
        title: 'Success',
        description: 'Task created successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // The socket event will handle adding the task to the state
      // No need to manually update state here
      
    } catch (error: any) {
      console.error('❌ DashboardPage: Error creating task:', error);
      
      // Handle specific error messages from backend
      let errorMessage = 'Failed to create task';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        errorMessage = error.response.data.errors.join(', ');
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false); // Clear loading state
    }
  };

  const handleUpdateTask = async (taskId: string, taskData: UpdateTaskData) => {
    try {
      console.log('✏️ DashboardPage: Updating task:', taskId, taskData);
      setLoading(true); // Set loading state during update
      
      const updatedTask = await taskService.updateTask(taskId, taskData);
      console.log('✅ DashboardPage: Task updated successfully:', updatedTask);
      
      // Close modal first
      onTaskModalClose();
      
      // Show success toast
      toast({
        title: 'Success',
        description: 'Task updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // The socket event will handle updating the task in the state
      // No need to manually update state here
      
    } catch (error) {
      console.error('❌ DashboardPage: Error updating task:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false); // Clear loading state
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      console.log('🗑️ Deleting task:', taskId);
      setLoading(true); // Set loading state during deletion
      
      await taskService.deleteTask(taskId);
      console.log('✅ DashboardPage: Task deleted successfully');
      
      // Show success toast
      toast({
        title: 'Success',
        description: 'Task deleted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // The socket event will handle removing the task from the state
      // No need to manually update state here
      
    } catch (error: any) { // Added any type to error
      console.error('❌ Error deleting task:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete task', // Fixed: Access error.response safely
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false); // Clear loading state
    }
  };

  const handleShareTask = async (taskId: string, email: string) => {
    try {
      console.log('📤 Sharing task:', taskId, 'with', email);
      setLoading(true); // Set loading state during sharing
      
      const sharedTask = await taskService.shareTask(taskId, email);
      console.log('✅ DashboardPage: Task shared successfully:', sharedTask);
      
      onShareModalClose();
      
      // Show success toast
      toast({
        title: 'Success',
        description: `Task shared with ${email}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // The socket event will handle updating the task in the state
      // No need to manually reload tasks here
      
    } catch (error: any) { // Added any type to error
      console.error('❌ Error sharing task:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to share task', // Fixed: Access error.response safely
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false); // Clear loading state
    }
  };

  const handleStatusChange = async (taskId: string, status: Task['status']) => {
    try {
      console.log('🔄 DashboardPage: Changing task status:', taskId, status);
      setLoading(true); // Set loading state during status change
      
      const updatedTask = await taskService.updateTask(taskId, { status });
      console.log('✅ DashboardPage: Task status updated successfully:', updatedTask);
      
      // Show success toast
      toast({
        title: 'Status Updated',
        description: `Task status changed to ${status}`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      
      // The socket event will handle updating the task in the state
      // No need to manually update state here
      
    } catch (error: any) {
      console.error('❌ DashboardPage: Error updating task status:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update task status',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false); // Clear loading state
    }
  };

  // Modal handlers
  const openCreateModal = () => {
    setSelectedTask(undefined);
    onTaskModalOpen();
  };

  const openEditModal = (task: Task) => {
    setSelectedTask(task);
    onTaskModalOpen();
  };

  const openShareModal = (task: Task) => {
    setSelectedTask(task);
    onShareModalOpen(); // This sets isShareModalOpen to true
  };

  // Override the default onClose for ShareModal
  const handleShareModalClose = () => {
    console.log('🚪 Share modal closing.');
    onShareModalClose(); // This sets isShareModalOpen to false

    // Check if there are pending unshared tasks to update
    if (unsharedTaskIdsPendingUpdate.length > 0) {
      console.log('🔄 Share modal closed with pending unshared tasks, reloading task list.');
      // Reload tasks to reflect the unshared tasks that were removed while the modal was open
      loadTasks(currentPage, filters); // Reload current page with current filters
      setUnsharedTaskIdsPendingUpdate([]); // Clear the pending list
    } else {
      console.log('✅ Share modal closed with no pending unshared tasks.');
    }
  };

  // Handle TaskModal form submission
  const handleTaskModalSubmit = async (taskData: CreateTaskData | UpdateTaskData, taskId?: string) => {
    try {
      if (taskId) {
        // Update existing task
        await handleUpdateTask(taskId, taskData as UpdateTaskData);
      } else {
        // Create new task
        await handleCreateTask(taskData as CreateTaskData);
      }
    } catch (error) {
      console.error('❌ DashboardPage: Error in TaskModal submit:', error);
      // Error is already handled in the individual handlers
      throw error; // Re-throw to let TaskModal know there was an error
    }
  };

  // New function to handle task updates from TaskCard
  const handleTaskCardUpdate = (updatedTask: Task) => {
    console.log('🔄 DashboardPage: Task updated from TaskCard:', updatedTask.title, updatedTask._id);
    handleTaskUpdated(updatedTask); // Use the now accessible function
  };

  // Loading state
  if (loading && tasks.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <Box minH="100vh" bg={bgColor}>
      <Navbar />

      <Container maxW="6xl" py={8}>
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <Flex justify="space-between" align="center">
            <Box>
              <Text 
                fontSize="3xl" 
                fontWeight="bold" 
                bgGradient="linear(to-r, brand.400, brand.600)" 
                bgClip="text"
                mb={1}
              >
                TaskFlow Dashboard
              </Text>
              <Text color={mutedTextColor} fontSize="lg">
                Manage your tasks and collaborate with your team
              </Text>
              <Text color={mutedTextColor} fontSize="sm" mt={1}>
                {tasks.length} task{tasks.length !== 1 ? 's' : ''} total
              </Text>
            </Box>
            <Button
              leftIcon={<AddIcon />}
              colorScheme="brand"
              onClick={openCreateModal}
              size="lg"
              boxShadow="lg"
              _hover={{
                transform: "translateY(-2px)",
                boxShadow: "xl",
              }}
              _active={{
                transform: "translateY(0)",
              }}
              transition="all 0.2s ease"
              animation={tasks.length === 0 ? "pulse 2s infinite" : "none"}
              css={{
                "@keyframes pulse": {
                  "0%, 100%": {
                    transform: "scale(1)",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                  },
                  "50%": {
                    transform: "scale(1.05)",
                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
                  },
                },
              }}
            >
              New Task
            </Button>
          </Flex>

          {/* Search and Filter Bar */}
          <TaskFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            tasks={tasks}
          />

          {/* Tabs - Task Categories */}
          <Tabs
            index={activeTab}
            onChange={setActiveTab}
            variant="enclosed"
            colorScheme="brand"
          >
            <TabList
              bg={cardBg}
              borderRadius="lg"
              p={2}
              border="1px solid"
              borderColor={borderColor}
              boxShadow="sm"
            >
              {tabConfig.map((tab) => {
                filterTasksByTab(
                  tab.value === 'shared' ? sharedTasks : tasks, 
                  tab.value, 
                  filters
                ).length;
                return (
                  <Tab
                    key={tab.value}
                    _selected={{
                      bg: useColorModeValue(tab.bgColor, `${tab.colorScheme}.800`),
                      color: useColorModeValue(tab.textColor, `${tab.colorScheme}.200`),
                      borderColor: useColorModeValue(tab.borderColor, `${tab.colorScheme}.600`),
                      fontWeight: 'semibold',
                      transform: 'scale(1.02)',
                      boxShadow: 'md',
                    }}
                    _hover={{
                      bg: useColorModeValue(tab.bgColor, `${tab.colorScheme}.800`),
                      color: useColorModeValue(tab.textColor, `${tab.colorScheme}.200`),
                      transform: 'translateY(-1px)',
                    }}
                    transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                    borderRadius="md"
                    mx={1}
                    px={4}
                    py={2}
                    position="relative"
                    overflow="hidden"
                    color={textColor}
                  >
                    <HStack spacing={2} position="relative" zIndex={1}>
                      <Text fontWeight="medium">{tab.label}</Text>
                    </HStack>
                  </Tab>
                );
              })}
            </TabList>

            <TabPanels>
              {tabConfig.map((tab, index) => (
                <TabPanel key={tab.value} p={0}>
                  <Box
                    mt={4}
                    transition="all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
                    opacity={index === activeTab ? 1 : 0}
                    transform={index === activeTab ? "translateY(0)" : "translateY(10px)"}
                    minH="200px"
                  >
                    {/* Use the new TaskList component */}
                    <TaskList
                      tasks={filteredTasks}
                      loading={loading}
                      error={loadError}
                      onEdit={openEditModal}
                      onDelete={handleDeleteTask}
                      onShare={openShareModal}
                      onStatusChange={handleStatusChange}
                      showSharedTasks={tab.value === 'shared'}
                      onTaskUpdate={handleTaskCardUpdate} // Pass the new handler
                    />

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <HStack justify="center" spacing={2} mt={8}>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <Button
                            key={page}
                            variant={page === currentPage ? 'solid' : 'outline'}
                            colorScheme="brand"
                            size="sm"
                            onClick={() => loadTasks(page, filters)}
                            disabled={loading}
                            _hover={{
                              transform: "scale(1.05)",
                            }}
                            transition="all 0.2s ease"
                          >
                            {page}
                          </Button>
                        ))}
                      </HStack>
                    )}
                  </Box>
                </TabPanel>
              ))}
            </TabPanels>
          </Tabs>
        </VStack>
      </Container>

      {/* Modals */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={onTaskModalClose}
        task={selectedTask}
        existingTasks={tasks}
        onSubmit={handleTaskModalSubmit}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={handleShareModalClose} // Use the new handler
        task={selectedTask}
        onShare={handleShareTask}
      />
    </Box>
  );
};

export default DashboardPage;
