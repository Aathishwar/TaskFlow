import React from 'react';
import {
  Flex,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react';

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading...' }) => {
  return (
    <Flex
      justify="center"
      align="center"
      minH="200px"
      w="full"
    >
      <VStack spacing={4}>
        <Spinner
          thickness="4px"
          speed="0.65s"
          emptyColor="gray.200"
          color="brand.500"
          size="xl"
        />
        <Text color="gray.600" fontSize="sm">
          {message}
        </Text>
      </VStack>
    </Flex>
  );
};

export default LoadingSpinner;
