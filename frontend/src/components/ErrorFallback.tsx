import React from 'react';
import {
  Box,
  Button,
  Heading,
  Text,
  VStack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="gray.50"
      p={4}
    >
      <VStack spacing={6} maxW="md" textAlign="center">
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>Something went wrong!</AlertTitle>
            <AlertDescription mt={2}>
              An unexpected error occurred. Please try refreshing the page.
            </AlertDescription>
          </Box>
        </Alert>

        <VStack spacing={3}>
          <Heading size="md" color="gray.700">
            Oops! An error occurred
          </Heading>
          
          <Text color="gray.600" fontSize="sm">
            {error.message}
          </Text>
          
          <Button
            colorScheme="brand"
            onClick={resetErrorBoundary}
            size="lg"
          >
            Try Again
          </Button>
        </VStack>
      </VStack>
    </Box>
  );
};

export default ErrorFallback;
