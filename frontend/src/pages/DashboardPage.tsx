import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Badge,
  useColorModeValue,
} from '@chakra-ui/react';
import { AddIcon } from '@chakra-ui/icons';

import Navbar from '../components/Navbar';
import TaskList from '../components/TaskList';
import TaskModal from '../components/TaskModal';
import ShareModal from '../components/ShareModal';
import TaskFilters from '../components/TaskFilters';
import LoadingSpinner from '../components/LoadingSpinner';
import ConnectionStatus from '../components/ConnectionStatus';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { taskService } from '../services/taskService';
import { serverStatusNotification } from '../services/serverStatusNotificationService';
import { Task, TaskFilters as TaskFiltersType, CreateTaskData, UpdateTaskData } from '../types';
import { useTaskNotifications } from '../hooks/useTaskNotifications';
import { useOptimizedTabChange } from '../hooks/useOptimizedTabChange';

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
  // filteredTasks is now calculated via useMemo - no state needed
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
  const { socket, isConnected, connectionState } = useSocket();
  const { user } = useAuth();
  const toast = useToast();

  // Initialize server status notification service
  React.useEffect(() => {
    serverStatusNotification.initialize(toast);
  }, [toast]);

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

  // Memoized filtered tasks - only recalculates when dependencies change
  const filteredTasks = useMemo(() => {
    const currentTabValue = tabConfig[activeTab].value;
    const baseTasks = currentTabValue === 'shared' ? sharedTasks : tasks;
    const filtered = filterTasksByTab(baseTasks, currentTabValue, filters);
    return filtered;
  }, [tasks, sharedTasks, activeTab, filters, filterTasksByTab]);

  // Handle filter changes from the filter bar - LOCAL FILTERING ONLY
  const handleFiltersChange = (newFilters: TaskFiltersType) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  // Clean function to load tasks with better error handling - NO SERVER-SIDE FILTERING
  const loadTasks = async (page: number = 1, _unusedFilters: TaskFiltersType = {}, retryCount: number = 0) => {
    if (!user) {
      return;
    }

    // Wait for socket connection before loading tasks (or if connection failed, proceed anyway)
    if (connectionState !== 'connected' && connectionState !== 'failed') {
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);
      
      const [ownedResponse, sharedResponse] = await Promise.all([
        taskService.getTasks({ page, limit: 10 }),
        taskService.getSharedTasks?.({ page, limit: 10 }) || Promise.resolve({ 
          tasks: [], 
          pagination: { currentPage: 1, totalPages: 1, totalTasks: 0, hasNextPage: false, hasPrevPage: false }
        })
      ]);

      if (!ownedResponse?.tasks || !ownedResponse.pagination) {
        throw new Error('Invalid response structure from server');
      }

      setTasks(ownedResponse.tasks);
      setSharedTasks(sharedResponse?.tasks || []);
      setCurrentPage(ownedResponse.pagination.currentPage);
      setTotalPages(ownedResponse.pagination.totalPages);

    } catch (error: any) {
      // Skip error handling for duplicate requests
      if (error.message === 'Duplicate request blocked') {
        return;
      }

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
        setTimeout(() => {
          loadTasks(page, {}, retryCount + 1);
        }, 2000);
        return;
      }
      
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
    if (user?.id) {
      setTasks([]);
      setSharedTasks([]);
      setCurrentPage(1);
      setLoadError(null);
      initialLoadDoneRef.current[user.id] = false;
    } else {
      setTasks([]);
      setSharedTasks([]);
      setCurrentPage(1);
      setLoadError(null);
      initialLoadDoneRef.current = {};
    }
  }, [user?.id]);

  // Wait for socket connection before initial task load with timeout fallback
  useEffect(() => {
    if (user?.id && connectionState === 'connected' && !initialLoadDoneRef.current[user.id]) {
      initialLoadDoneRef.current[user.id] = true;
      loadTasks(1, {});
    } else if (user?.id && connectionState === 'failed' && !initialLoadDoneRef.current[user.id]) {
      initialLoadDoneRef.current[user.id] = true;
      loadTasks(1, {});
    } else if (user?.id && connectionState === 'connecting' && !initialLoadDoneRef.current[user.id]) {
      const fallbackTimeout = setTimeout(() => {
        if (!initialLoadDoneRef.current[user.id]) {
          initialLoadDoneRef.current[user.id] = true;
          loadTasks(1, {});
        }
      }, 15000);
      
      return () => clearTimeout(fallbackTimeout);
    }
  }, [user?.id, connectionState]);

  // Tab change handler - only reload if switching to/from shared tab
  const handleTabChange = (tabIndex: number) => {
    const newTabValue = tabConfig[tabIndex].value;
    const currentTabValue = tabConfig[activeTab].value;
    
    setActiveTab(tabIndex);
    setCurrentPage(1);
    
    // Only reload if switching between owned/shared tabs (different data sources)
    if ((currentTabValue === 'shared') !== (newTabValue === 'shared')) {
      if (user?.id && (connectionState === 'connected' || connectionState === 'failed') && initialLoadDoneRef.current[user.id]) {
        loadTasks(1, {});
      }
    }
  };

  // Use optimized tab change to reduce INP
  const optimizedHandleTabChange = useOptimizedTabChange(handleTabChange);

  // Socket.IO real-time updates - optimized dependencies to prevent frequent re-setup
  useEffect(() => {
    if (!socket || !isConnected || !user?.id) {
      return;
    }

    // Test socket connection
    socket.emit('test_event', { message: 'Testing socket connection from DashboardPage' });
    socket.on('test_response', () => {
      // Socket test response received
    });

    const handleTaskCreated = (task: Task) => {
      setTasks(prev => {
        const exists = prev.find(t => t._id === task._id);
        if (exists) {
          return prev;
        }
        return [task, ...prev];
      });
    };

    const handleTaskUpdatedSocket = (updatedTask: Task) => {
      // Update owned tasks if the task exists there
      setTasks(prev => {
        const taskIndex = prev.findIndex(task => task._id === updatedTask._id);
        if (taskIndex !== -1) {
          return prev.map(task => task._id === updatedTask._id ? updatedTask : task);
        }
        return prev;
      });

      // Update shared tasks if the task exists there
      setSharedTasks(prev => {
        const taskIndex = prev.findIndex(task => task._id === updatedTask._id);
        if (taskIndex !== -1) {
          return prev.map(task => task._id === updatedTask._id ? updatedTask : task);
        }
        return prev;
      });
    };

    const handleTaskDeleted = ({ taskId }: { taskId: string }) => {
      setTasks(prev => prev.filter(task => task._id !== taskId));
      setSharedTasks(prev => prev.filter(task => task._id !== taskId));
    };

    const handleTaskShared = (sharedTask: Task) => {
      // Update the owned task to reflect sharing changes (for owner)
      setTasks(prev => {
        const taskIndex = prev.findIndex(task => task._id === sharedTask._id);
        if (taskIndex !== -1) {
          return prev.map(task => task._id === sharedTask._id ? sharedTask : task);
        }
        return prev;
      });

      // Add to shared tasks if it's shared with the current user
      if (sharedTask.sharedWith?.some(sharedUser => sharedUser.id === user?.id)) {
        setSharedTasks(prev => {
          const exists = prev.find(task => task._id === sharedTask._id);
          if (exists) {
            return prev.map(task => task._id === sharedTask._id ? sharedTask : task);
          } else {
            return [sharedTask, ...prev];
          }
        });
      }
    };

    const handleTaskUnshared = ({ taskId, updatedTask }: { taskId: string; updatedTask?: Task }) => {
      // Update owned task to reflect removal of shared users (for owner)
      if (updatedTask) {
        setTasks(prev => {
          const taskIndex = prev.findIndex(task => task._id === taskId);
          if (taskIndex !== -1) {
            return prev.map(task => task._id === taskId ? updatedTask : task);
          }
          return prev;
        });
      }

      // Remove from shared tasks if the current user is no longer shared
      const isStillSharedWithCurrentUser = updatedTask?.sharedWith?.some(sharedUser => sharedUser.id === user?.id);
      
      if (!isStillSharedWithCurrentUser) {
        setSharedTasks(prev => prev.filter(task => task._id !== taskId));
      }

      // Handle pending updates for share modal
      const shareModalOpen = document.querySelector('[data-testid="share-modal"]') !== null;
      
      if (shareModalOpen) {
        setUnsharedTaskIdsPendingUpdate(prev => [...prev, taskId]);
      }
    };

    // Subscribe to events
    socket.on('task_created', handleTaskCreated);
    socket.on('task_updated', handleTaskUpdatedSocket);
    socket.on('task_deleted', handleTaskDeleted);
    socket.on('task_shared', handleTaskShared);
    socket.on('task_unshared', handleTaskUnshared);

    // Cleanup
    return () => {
      socket.off('test_response');
      socket.off('task_created', handleTaskCreated);
      socket.off('task_updated', handleTaskUpdatedSocket);
      socket.off('task_deleted', handleTaskDeleted);
      socket.off('task_shared', handleTaskShared);
      socket.off('task_unshared', handleTaskUnshared);
    };
  }, [socket, isConnected, user?.id]);

  // Handle pending unshared task updates when share modal closes
  useEffect(() => {
    if (!isShareModalOpen && unsharedTaskIdsPendingUpdate.length > 0) {
      loadTasks(currentPage, {});
      setUnsharedTaskIdsPendingUpdate([]);
    }
  }, [isShareModalOpen, unsharedTaskIdsPendingUpdate.length]);

  // CRUD Operations
  const handleCreateTask = async (taskData: CreateTaskData) => {
    try {
      setLoading(true);
      
      await taskService.createTask(taskData);
      
      onTaskModalClose();
      
      toast({
        title: 'Success',
        description: 'Task created successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
    } catch (error: any) {
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
      setLoading(false);
    }
  };

  const handleUpdateTask = async (taskId: string, taskData: UpdateTaskData) => {
    try {
      setLoading(true);
      
      await taskService.updateTask(taskId, taskData);
      
      onTaskModalClose();
      
      toast({
        title: 'Success',
        description: 'Task updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update task',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      setLoading(true);
      
      await taskService.deleteTask(taskId);
      
      toast({
        title: 'Success',
        description: 'Task deleted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete task',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShareTask = async (taskId: string, email: string) => {
    try {
      setLoading(true);
      
      await taskService.shareTask(taskId, email);
      
      onShareModalClose();
      
      toast({
        title: 'Success',
        description: `Task shared with ${email}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to share task',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId: string, status: Task['status']) => {
    try {
      setLoading(true);
      
      await taskService.updateTask(taskId, { status });
      
      toast({
        title: 'Status Updated',
        description: `Task status changed to ${status}`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update task status',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
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
    onShareModalClose();

    // Check if there are pending unshared tasks to update
    if (unsharedTaskIdsPendingUpdate.length > 0) {
      loadTasks(currentPage, filters);
      setUnsharedTaskIdsPendingUpdate([]);
    }
  };

  // Handle TaskModal form submission
  const handleTaskModalSubmit = async (taskData: CreateTaskData | UpdateTaskData, taskId?: string) => {
    try {
      if (taskId) {
        await handleUpdateTask(taskId, taskData as UpdateTaskData);
      } else {
        await handleCreateTask(taskData as CreateTaskData);
      }
    } catch (error) {
      throw error;
    }
  };

  // Function to handle task updates from TaskCard
  const handleTaskCardUpdate = (updatedTask: Task) => {
    // Update owned tasks if the task exists there
    setTasks(prev => {
      const taskIndex = prev.findIndex(task => task._id === updatedTask._id);
      if (taskIndex !== -1) {
        return prev.map(task => task._id === updatedTask._id ? updatedTask : task);
      }
      return prev;
    });

    // Update shared tasks if the task exists there
    setSharedTasks(prev => {
      const taskIndex = prev.findIndex(task => task._id === updatedTask._id);
      if (taskIndex !== -1) {
        return prev.map(task => task._id === updatedTask._id ? updatedTask : task);
      }
      return prev;
    });
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

          {/* Connection Status */}
          <ConnectionStatus />

          {/* Search and Filter Bar */}
          <TaskFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            tasks={tasks}
          />

          {/* Tabs - Task Categories */}
          <Tabs
            index={activeTab}
            onChange={optimizedHandleTabChange}
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
                const tabTasks = tab.value === 'shared' ? sharedTasks : tasks;
                const taskCount = filterTasksByTab(tabTasks, tab.value, filters).length;
                
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
                      <Badge
                        colorScheme={activeTab === tabConfig.findIndex(t => t.value === tab.value) ? tab.colorScheme : 'gray'}
                        borderRadius="full"
                        px={2}
                        py={0.5}
                        fontSize="xs"
                        fontWeight="bold"
                        transition="all 0.2s"
                        variant={activeTab === tabConfig.findIndex(t => t.value === tab.value) ? 'solid' : 'subtle'}
                      >
                        {taskCount}
                      </Badge>
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
                      loading={loading || (!!user && connectionState === 'connecting')}
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
