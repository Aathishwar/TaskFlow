import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Skeleton,
  SkeletonText,
  SkeletonCircle,
  useColorModeValue,
} from '@chakra-ui/react';

export const TaskCardSkeleton: React.FC = () => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <Box
      bg={bgColor}
      border="1px solid"
      borderColor={borderColor}
      borderRadius="xl"
      p={6}
      mb={4}
      boxShadow="sm"
    >
      <VStack spacing={4} align="stretch">
        {/* Header with title and priority */}
        <HStack justify="space-between">
          <Skeleton height="24px" width="60%" />
          <Skeleton height="20px" width="60px" borderRadius="full" />
        </HStack>
        
        {/* Description */}
        <SkeletonText noOfLines={2} spacing="2" />
        
        {/* Status and due date */}
        <HStack spacing={4}>
          <Skeleton height="24px" width="80px" borderRadius="full" />
          <Skeleton height="20px" width="120px" />
        </HStack>
        
        {/* Actions */}
        <HStack justify="flex-end" spacing={2}>
          <Skeleton height="32px" width="32px" borderRadius="md" />
          <Skeleton height="32px" width="32px" borderRadius="md" />
          <Skeleton height="32px" width="32px" borderRadius="md" />
        </HStack>
      </VStack>
    </Box>
  );
};

export const TaskListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <VStack spacing={4} align="stretch">
      {Array.from({ length: count }).map((_, index) => (
        <TaskCardSkeleton key={index} />
      ))}
    </VStack>
  );
};

export const TaskTabsSkeleton: React.FC = () => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <Box
      bg={bgColor}
      borderRadius="lg"
      p={2}
      border="1px solid"
      borderColor={borderColor}
      boxShadow="sm"
    >
      <HStack spacing={4}>
        {Array.from({ length: 6 }).map((_, index) => (
          <HStack key={index} spacing={2}>
            <Skeleton height="20px" width="80px" />
            <SkeletonCircle size="6" />
          </HStack>
        ))}
      </HStack>
    </Box>
  );
};

export const DashboardSkeleton: React.FC = () => {
  const bgColor = useColorModeValue('gray.50', 'gray.900');

  return (
    <Box minH="100vh" bg={bgColor}>
      {/* Navbar skeleton */}
      <Box h="64px" borderBottom="1px solid" borderColor="gray.200">
        <HStack justify="space-between" px={8} py={4}>
          <Skeleton height="32px" width="120px" />
          <HStack spacing={4}>
            <SkeletonCircle size="8" />
            <Skeleton height="24px" width="80px" />
          </HStack>
        </HStack>
      </Box>

      {/* Main content */}
      <Box maxW="6xl" mx="auto" py={8} px={4}>
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <HStack justify="space-between">
            <VStack align="start" spacing={2}>
              <Skeleton height="32px" width="300px" />
              <Skeleton height="20px" width="250px" />
              <Skeleton height="16px" width="100px" />
            </VStack>
            <Skeleton height="48px" width="120px" borderRadius="lg" />
          </HStack>

          {/* Connection status */}
          <Skeleton height="40px" width="200px" borderRadius="md" />

          {/* Filters */}
          <Skeleton height="56px" width="100%" borderRadius="lg" />

          {/* Tabs */}
          <TaskTabsSkeleton />

          {/* Task list */}
          <TaskListSkeleton />
        </VStack>
      </Box>
    </Box>
  );
};
