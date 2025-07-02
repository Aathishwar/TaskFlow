import React, { useState } from 'react';
import {
  Card,
  CardBody,
  HStack,
  VStack,
  Text,
  Badge,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  Flex,
  Avatar,
  Box,
  Portal,
  useColorModeValue,
  Circle,
} from '@chakra-ui/react';
import { ChevronDownIcon, EditIcon, DeleteIcon, ExternalLinkIcon, CheckIcon, CalendarIcon, TimeIcon } from '@chakra-ui/icons';
import { isPast, format } from 'date-fns';
import { Task } from '../types';
import { useAnimatedDeletion } from '../hooks/useAnimatedDeletion';
import SharedAvatar from './SharedAvatar';
import SharedUsersModal from './SharedUsersModal';
import { taskService } from '../services/taskService';

interface TaskCardProps {
  task: Task;
  currentUserId: string;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onShare: (task: Task) => void;
  onStatusChange: (taskId: string, status: Task['status']) => void;
  onTaskUpdate: (updatedTask: Task) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  currentUserId,
  onEdit,
  onDelete,
  onShare,
  onStatusChange,
  onTaskUpdate,
}) => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<Task | null>(null);

  // Use pending updates if available, otherwise use current task
  const currentTask = pendingUpdates || task;
  
  // Check ownership - ALWAYS use the original task for ownership check
  const isOwner = task.owner?.id === currentUserId;
  
  // Simple check: show shared info if there are shared users
  const hasSharedUsers = currentTask.sharedWith && currentTask.sharedWith.length > 0;

  // Use the animated deletion hook
  const deletionState = useAnimatedDeletion(
    () => onDelete(task._id), // Execute actual deletion
    () => {
      // Deletion cancelled - no action needed
    }
  );

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return 'green';
      case 'in-progress':
        return 'brand';
      default:
        return 'yellow';
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'red';
      case 'medium':
        return 'orange';
      default:
        return 'gray';
    }
  };

  const isDueSoon = (dateString?: string) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours <= 24 && diffHours > 0;
  };

  const isOverdue = (dateString?: string) => {
    if (!dateString) return false;
    return isPast(new Date(dateString)) && task.status !== 'completed';
  };

  const handleAvatarClick = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    // Apply any pending updates when modal is closed
    if (pendingUpdates) {
      onTaskUpdate(pendingUpdates);
      setPendingUpdates(null);
    }
  };

  const handleRemoveSharedUser = async (userId: string) => {
    try {
      // Call the service function to remove the user
      const updatedTask = await taskService.removeUserFromTask(task._id, userId);
      // Store the update instead of applying immediately
      setPendingUpdates(updatedTask);
    } catch (error) {
      console.error('Error removing user from task:', error);
      // Handle error (e.g., show a toast notification)
    }
  };

  return (
    <Card
      bg={cardBg}
      border="1px solid"
      borderColor={borderColor}
      borderRadius="xl"
      _hover={{ 
        boxShadow: deletionState.isDeleting ? 'sm' : 'lg', 
        transform: deletionState.isDeleting ? 'none' : 'translateY(-2px)',
        borderColor: deletionState.isDeleting ? borderColor : (currentTask.status === 'completed' ? 'green.300' : 'blue.200')
      }}
      transition={deletionState.isDeleting ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'}
      position="relative"
      overflow="hidden"
      boxShadow="sm"
      cursor={deletionState.isUndoable ? 'pointer' : 'default'}
      onClick={deletionState.isUndoable ? deletionState.cancelDeletion : undefined}
    >
      {/* Animated Deletion Line */}
      {deletionState.isDeleting && (
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          zIndex={5}
          pointerEvents="none"
        >
          {/* Sweeping Line */}
          <Box
            position="absolute"
            top="0"
            bottom="0"
            left="0"
            width={`${deletionState.progress}%`}
            background="linear-gradient(90deg, transparent 0%, rgba(239, 68, 68, 0.8) 95%, rgba(239, 68, 68, 1) 100%)"
            transition="width 0.016s linear"
            zIndex={1}
          />
          
          {/* Moving Line Indicator */}
          {deletionState.progress < 100 && (
            <Box
              position="absolute"
              top="0"
              bottom="0"
              left={`${deletionState.progress}%`}
              width="3px"
              background="linear-gradient(180deg, #ef4444 0%, #dc2626 50%, #ef4444 100%)"
              boxShadow="0 0 10px rgba(239, 68, 68, 0.8), 0 0 20px rgba(239, 68, 68, 0.4)"
              zIndex={2}
              _before={{
                content: '""',
                position: 'absolute',
                top: '-2px',
                left: '-1px',
                width: '5px',
                height: '100%',
                background: 'linear-gradient(180deg, #ffffff 0%, #ef4444 50%, #ffffff 100%)',
                filter: 'blur(1px)',
              }}
            />
          )}
        </Box>
      )}

      {/* Grayscale Overlay */}
      {deletionState.isDeleting && (
        <Box
          position="absolute"
          top="0"
          left={`${deletionState.progress}%`}
          right="0"
          bottom="0"
          bg="rgba(0, 0, 0, 0.1)"
          filter="grayscale(100%)"
          opacity="0.6"
          zIndex={3}
          pointerEvents="none"
        />
      )}

      {/* Countdown Overlay */}
      {deletionState.showCountdown && deletionState.isUndoable && (
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bg="rgba(239, 68, 68, 0.1)"
          backdropFilter="blur(2px)"
          zIndex={10}
          display="flex"
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          onClick={deletionState.cancelDeletion}
          _hover={{
            bg: "rgba(239, 68, 68, 0.15)",
          }}
          transition="all 0.2s ease"
        >
          <VStack 
            spacing={2} 
            p={4}
            bg="white"
            borderRadius="xl"
            boxShadow="xl"
            border="2px solid"
            borderColor="red.200"
            _hover={{
              transform: "scale(1.05)",
              borderColor: "red.300",
              boxShadow: "2xl",
            }}
            transition="all 0.2s ease"
            css={{
              "@keyframes ripple": {
                "0%": {
                  transform: "scale(1)",
                  boxShadow: "0 0 0 0 rgba(239, 68, 68, 0.4)",
                },
                "70%": {
                  transform: "scale(1.02)",
                  boxShadow: "0 0 0 10px rgba(239, 68, 68, 0)",
                },
                "100%": {
                  transform: "scale(1)",
                  boxShadow: "0 0 0 0 rgba(239, 68, 68, 0)",
                },
              },
              animation: "ripple 1.5s infinite",
            }}
          >
            <Text 
              fontSize="3xl" 
              fontWeight="bold" 
              color="red.600"
              fontFamily="mono"
              lineHeight="1"
              css={{
                "@keyframes countdown": {
                  "0%": { transform: "scale(1)" },
                  "50%": { transform: "scale(1.1)" },
                  "100%": { transform: "scale(1)" },
                },
                animation: "countdown 1s ease-in-out",
              }}
              key={deletionState.countdown} // Restart animation on countdown change
            >
              {deletionState.countdown}
            </Text>
            <Text 
              fontSize="sm" 
              fontWeight="medium" 
              color="red.700"
              textAlign="center"
              lineHeight="1.2"
            >
              Tap to cancel
            </Text>
            <Text 
              fontSize="xs" 
              color="red.500"
              textAlign="center"
              opacity="0.8"
            >
              Task will be deleted
            </Text>
          </VStack>
        </Box>
      )}

      <CardBody>
        <Flex justify="space-between" align="start">
          <VStack align="start" spacing={3} flex={1}>
            {/* Title and Status with Circular Tick Box */}
            <HStack spacing={3} align="center" wrap="wrap">
              {/* Circular Tick Box */}
              <Circle
                size="28px"
                bg={currentTask.status === 'completed' ? 'green.500' : 'white'}
                color="white"
                cursor="pointer"
                onClick={() => onStatusChange(currentTask._id, currentTask.status === 'completed' ? 'pending' : 'completed')}
                _hover={{
                  transform: 'scale(1.1)',
                  bg: currentTask.status === 'completed' ? 'green.600' : 'green.100',
                  borderColor: currentTask.status === 'completed' ? 'green.600' : 'green.400'
                }}
                transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                border="3px solid"
                borderColor={currentTask.status === 'completed' ? 'green.500' : 'gray.300'}
                boxShadow={currentTask.status === 'completed' ? 'md' : 'sm'}
                _active={{
                  transform: 'scale(0.95)'
                }}
              >
                {currentTask.status === 'completed' && (
                  <CheckIcon 
                    boxSize="14px" 
                    animation="checkmark-appear 0.3s ease-out"
                    css={{
                      "@keyframes checkmark-appear": {
                        "0%": { transform: "scale(0)", opacity: 0 },
                        "50%": { transform: "scale(1.2)", opacity: 0.8 },
                        "100%": { transform: "scale(1)", opacity: 1 }
                      }
                    }}
                  />
                )}
              </Circle>
              
              <Text
                fontSize="lg"
                fontWeight="semibold"
                textDecoration={currentTask.status === 'completed' ? 'line-through' : 'none'}
                color={useColorModeValue('gray.800', 'white')}
                transition="all 0.2s"
              >
                {currentTask.title}
              </Text>
              {/* Status and Priority Badges beside title */}
              <Badge
                colorScheme={getStatusColor(currentTask.status)}
                variant="subtle"
                borderRadius="full"
                px={3}
                py={1}
                fontSize="xs"
                fontWeight="medium"
                transition="all 0.2s"
                _hover={{ transform: 'scale(1.05)' }}
              >
                {currentTask.status?.replace('-', ' ') ?? ''}
              </Badge>
              <Badge
                colorScheme={getPriorityColor(currentTask.priority)}
                variant="outline"
                size="sm"
                borderRadius="full"
                px={3}
                py={1}
                fontSize="xs"
                fontWeight="medium"
                transition="all 0.2s"
                _hover={{ transform: 'scale(1.05)' }}
              >
                {currentTask.priority} priority
              </Badge>
            </HStack>

            {/* Created Date */}
            <HStack spacing={2}>
              <CalendarIcon boxSize="14px" color={useColorModeValue('gray.400', 'gray.500')} />
              <Text fontSize="xs" color={useColorModeValue('gray.500', 'gray.400')}>
                Created: {format(new Date(currentTask.createdAt), 'MMM dd, yyyy, HH:mm')}
              </Text>
            </HStack>

            {/* Description */}
            {currentTask.description && (
              <Text color={useColorModeValue('gray.600', 'gray.300')} fontSize="sm">
                {currentTask.description}
              </Text>
            )}
            {/* Tags as pills */}
            {currentTask.tags && currentTask.tags.length > 0 && (
              <HStack spacing={2} wrap="wrap" mt={1}>
                {currentTask.tags.map((tag) => (
                  <Badge
                    key={tag}
                    colorScheme="purple"
                    variant="solid"
                    borderRadius="full"
                    px={2}
                    py={1}
                    fontSize="xs"
                    fontWeight="medium"
                    bg={useColorModeValue('purple.100', 'purple.700')}
                    color={useColorModeValue('purple.800', 'white')}
                  >
                    {tag}
                  </Badge>
                ))}
              </HStack>
            )}

            {/* Due Date (at the bottom, above share details) */}
            {currentTask.dueDate && (
              <HStack spacing={2} mt={2}>
                <TimeIcon boxSize="14px" color={useColorModeValue('gray.400', 'gray.500')} />
                <Text fontSize="sm" color={useColorModeValue('gray.500', 'gray.400')}>
                  Due:
                </Text>
                <Text
                  fontSize="sm"
                  color={
                    isOverdue(currentTask.dueDate)
                      ? 'red.500'
                      : isDueSoon(currentTask.dueDate)
                      ? 'orange.500'
                      : useColorModeValue('gray.600', 'gray.300')
                  }
                  fontWeight={isOverdue(currentTask.dueDate) || isDueSoon(currentTask.dueDate) ? 'medium' : 'normal'}
                >
                  {format(new Date(currentTask.dueDate), 'MMM dd, yyyy, HH:mm')}
                </Text>
                {isOverdue(currentTask.dueDate) && (
                  <Badge
                    colorScheme="red"
                    size="sm"
                    borderRadius="full"
                    px={2}
                    py={1}
                    fontSize="xs"
                    fontWeight="medium"
                    animation="pulse 2s infinite"
                    css={{
                      "@keyframes pulse": {
                        "0%, 100%": { opacity: 1 },
                        "50%": { opacity: 0.7 }
                      }
                    }}
                  >
                    Overdue
                  </Badge>
                )}
                {isDueSoon(currentTask.dueDate) && !isOverdue(currentTask.dueDate) && (
                  <Badge
                    colorScheme="orange"
                    size="sm"
                    borderRadius="full"
                    px={2}
                    py={1}
                    fontSize="xs"
                    fontWeight="medium"
                    animation="pulse 3s infinite"
                    css={{
                      "@keyframes pulse": {
                        "0%, 100%": { opacity: 1 },
                        "50%": { opacity: 0.8 }
                      }
                    }}
                  >
                    Due Soon
                  </Badge>
                )}
              </HStack>
            )}

            {/* Shared Users (at the very bottom) */}
            {hasSharedUsers && (
              <HStack spacing={2} mt={2} align="center">
                <Text fontSize="sm" color={useColorModeValue('gray.500', 'gray.400')}>
                  {isOwner ? 'Shared with:' : 'Shared with you by:'}
                </Text>
                {isOwner ? (
                  // You are the owner: show shared users
                  <SharedAvatar
                    users={currentTask.sharedWith!.map((user) => ({
                      id: user.id,
                      name: user.displayName,
                      avatarUrl: user.profilePicture || '',
                    }))}
                    onAvatarClick={handleAvatarClick}
                  />
                ) : (
                  // You are a recipient: show owner's avatar and name
                  <HStack spacing={1} align="center">
                    <Avatar
                      name={currentTask.owner?.displayName || 'Owner'}
                      src={currentTask.owner?.profilePicture}
                      title={currentTask.owner?.displayName || 'Owner'}
                      size="xs"
                    />
                    <Text fontSize="xs" color={useColorModeValue('gray.600', 'gray.300')} noOfLines={1} maxW="60px">
                      {currentTask.owner?.displayName || 'Owner'}
                    </Text>
                  </HStack>
                )}
              </HStack>
            )}
          </VStack>

          {/* Actions */}
          <VStack spacing={2} align="end">
            {/* Status Change */}
            <Menu placement="top" strategy="fixed">
              <MenuButton
                as={Button}
                rightIcon={<ChevronDownIcon />}
                size="sm"
                variant="outline"
                borderRadius="lg"
                bg={useColorModeValue('transparent', 'gray.700')}
                borderColor={useColorModeValue('gray.200', 'gray.600')}
                color={useColorModeValue('gray.700', 'white')}
                _hover={{
                  bg: useColorModeValue('blue.50', 'blue.600'),
                  borderColor: useColorModeValue('blue.300', 'blue.500'),
                  color: useColorModeValue('blue.600', 'white'),
                  transform: 'scale(1.02)'
                }}
                transition="all 0.2s"
              >
                {currentTask.status.replace('-', ' ')}
              </MenuButton>
              <Portal>
                <MenuList 
                  zIndex={99999}
                  borderRadius="lg"
                  boxShadow="xl"
                  border="1px solid"
                  borderColor={useColorModeValue('gray.200', 'gray.600')}
                  bg={useColorModeValue('white', 'gray.800')}
                >
                  <MenuItem 
                    onClick={() => onStatusChange(currentTask._id, 'pending')}
                    borderRadius="md"
                    bg={useColorModeValue('transparent', 'gray.700')}
                    color={useColorModeValue('gray.700', 'white')}
                    _hover={{ 
                      bg: useColorModeValue('yellow.50', 'yellow.600'), 
                      color: useColorModeValue('yellow.700', 'white'),
                      transform: 'scale(1.02)' 
                    }}
                    transition="all 0.2s"
                  >
                    Pending
                  </MenuItem>
                  <MenuItem 
                    onClick={() => onStatusChange(currentTask._id, 'in-progress')}
                    borderRadius="md"
                    bg={useColorModeValue('transparent', 'gray.700')}
                    color={useColorModeValue('gray.700', 'white')}
                    _hover={{ 
                      bg: useColorModeValue('blue.50', 'blue.600'), 
                      color: useColorModeValue('blue.700', 'white'),
                      transform: 'scale(1.02)' 
                    }}
                    transition="all 0.2s"
                  >
                    In Progress
                  </MenuItem>
                  <MenuItem 
                    onClick={() => onStatusChange(currentTask._id, 'completed')}
                    borderRadius="md"
                    bg={useColorModeValue('transparent', 'gray.700')}
                    color={useColorModeValue('gray.700', 'white')}
                    _hover={{ 
                      bg: useColorModeValue('green.50', 'green.600'), 
                      color: useColorModeValue('green.700', 'white'),
                      transform: 'scale(1.02)' 
                    }}
                    transition="all 0.2s"
                  >
                    Completed
                  </MenuItem>
                </MenuList>
              </Portal>
            </Menu>

            {/* Action Buttons */}
            <HStack spacing={1}>
              <IconButton
                aria-label="Edit task"
                icon={<EditIcon />}
                size="sm"
                variant="ghost"
                onClick={() => onEdit(currentTask)}
                borderRadius="lg"
                _hover={{ 
                  bg: 'blue.50', 
                  color: 'blue.600',
                  transform: 'scale(1.1)'
                }}
                transition="all 0.2s"
              />
              <IconButton
                aria-label="Share task"
                icon={<ExternalLinkIcon />}
                size="sm"
                variant="ghost"
                onClick={() => onShare(currentTask)}
                borderRadius="lg"
                _hover={{ 
                  bg: 'green.50', 
                  color: 'green.600',
                  transform: 'scale(1.1)'
                }}
                transition="all 0.2s"
              />
              <IconButton
                aria-label="Delete task"
                icon={<DeleteIcon />}
                size="sm"
                variant="ghost"
                colorScheme="red"
                onClick={() => deletionState.startDeletion()}
                borderRadius="lg"
                isDisabled={deletionState.isDeleting || !isOwner}
                _hover={{ 
                  bg: deletionState.isDeleting || !isOwner ? 'gray.100' : 'red.50', 
                  color: deletionState.isDeleting || !isOwner ? 'gray.400' : 'red.600',
                  transform: deletionState.isDeleting || !isOwner ? 'none' : 'scale(1.1)'
                }}
                transition="all 0.2s"
                opacity={isOwner ? 1 : 0.3}
                cursor={isOwner ? 'pointer' : 'not-allowed'}
                title={isOwner ? 'Delete task' : "You can't delete shared tasks"}
              />
            </HStack>
          </VStack>
        </Flex>
      </CardBody>

      {/* Shared Users Modal - Only render if current user is the owner and has shared users */}
      {isOwner && hasSharedUsers && (
        <SharedUsersModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          users={currentTask.sharedWith!.map((user) => ({
            id: user.id,
            name: user.displayName,
            avatarUrl: user.profilePicture || '',
          }))}
          isOwner={isOwner}
          onRemoveUser={handleRemoveSharedUser}
        />
      )}
    </Card>
  );
};

export default TaskCard;
