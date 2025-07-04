import React from 'react';
import {
  Flex,
  Spinner,
  Text,
  VStack,
  Progress,
  Box,
} from '@chakra-ui/react';

interface LoadingSpinnerProps {
  message?: string;
  subMessage?: string;
  showProgress?: boolean;
  progressValue?: number;
  progressColorScheme?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Loading...', 
  subMessage,
  showProgress = false,
  progressValue = 0,
  progressColorScheme = 'brand'
}) => {
  return (
    <Flex
      justify="center"
      align="center"
      minH="200px"
      w="full"
    >
      <VStack spacing={4} maxW="300px" textAlign="center">
        <Spinner
          thickness="4px"
          speed="0.65s"
          emptyColor="gray.200"
          color={`${progressColorScheme}.500`}
          size="xl"
        />
        <VStack spacing={2}>
          <Text color="gray.600" fontSize="sm" fontWeight="medium">
            {message}
          </Text>
          {subMessage && (
            <Text color="gray.500" fontSize="xs">
              {subMessage}
            </Text>
          )}
          {showProgress && (
            <Box w="full" mt={2}>
              <Progress 
                value={progressValue} 
                size="sm" 
                colorScheme={progressColorScheme}
                isAnimated
                hasStripe
                borderRadius="md"
              />
            </Box>
          )}
        </VStack>
      </VStack>
    </Flex>
  );
};

export default LoadingSpinner;
