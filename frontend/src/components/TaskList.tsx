import React from 'react';
import {
  Box,
  VStack,
  Text,
  useColorModeValue,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';

import TaskCard from './TaskCard';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { Task } from '../types';

// Motion variants for animations - unified for all tabs
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { 
    opacity: 0, 
    y: 20, 
    scale: 0.95 
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
      duration: 0.6
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: {
      duration: 0.2,
    }
  }
};

interface TaskListProps {
  tasks: Task[];
  loading?: boolean;
  error?: string | null;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onShare: (task: Task) => void;
  onStatusChange: (taskId: string, status: Task['status']) => void;
  showSharedTasks?: boolean;
  onTaskUpdate: (updatedTask: Task) => void; // Add onTaskUpdate prop
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  loading = false,
  error = null,
  onEdit,
  onDelete,
  onShare,
  onStatusChange,
  showSharedTasks = false,
  onTaskUpdate, // Destructure the new prop
}) => {
  const { isConnected } = useSocket();
  const { user } = useAuth();
  
  // Color mode values
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const mutedTextColor = useColorModeValue('gray.600', 'gray.400');

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minH="200px"
        bg={bgColor}
        borderRadius="xl"
        border="1px solid"
        borderColor={borderColor}
      >
        <VStack spacing={4}>
          <Spinner size="lg" color="blue.500" />
          <Text color={mutedTextColor}>Loading tasks...</Text>
        </VStack>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert status="error" borderRadius="xl">
        <AlertIcon />
        <Box>
          <AlertTitle>Error loading tasks</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Box>
      </Alert>
    );
  }

  if (tasks.length === 0) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minH="200px"
        bg={bgColor}
        borderRadius="xl"
        border="1px solid"
        borderColor={borderColor}
      >
        <VStack spacing={4}>
          <Text fontSize="lg" color={mutedTextColor}>
            {showSharedTasks ? 'No shared tasks found' : 'No tasks found'}
          </Text>
          <Text fontSize="sm" color={mutedTextColor} textAlign="center">
            {showSharedTasks 
              ? 'Tasks shared with you will appear here'
              : 'Create your first task to get started'
            }
          </Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box>
      {/* Connection Status Indicator */}
      {!isConnected && (
        <Alert status="warning" mb={4} borderRadius="lg">
          <AlertIcon />
          <Box>
            <AlertTitle>Connection Issue</AlertTitle>
            <AlertDescription>
              Real-time updates are disabled. Trying to reconnect...
            </AlertDescription>
          </Box>
        </Alert>
      )}

      {/* Task List */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence mode="wait">
          <VStack spacing={4} align="stretch">
            {tasks.map((task) => (
              <motion.div
                key={task._id}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                layout
              >
                <TaskCard
                  task={task}
                  currentUserId={user?.id || ''}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onShare={onShare}
                  onStatusChange={onStatusChange}
                  onTaskUpdate={onTaskUpdate} // Pass onTaskUpdate down
                  isFromSharedTab={showSharedTasks} // Pass the tab context
                />
              </motion.div>
            ))}
          </VStack>
        </AnimatePresence>
      </motion.div>
    </Box>
  );
};

export default React.memo(TaskList);
