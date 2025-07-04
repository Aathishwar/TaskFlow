import React from 'react';
import {
  Alert,
  AlertIcon,
  AlertDescription,
  Progress,
  HStack,
  Text,
  Button,
  VStack,
  Box,
  Spinner,
} from '@chakra-ui/react';
import { RepeatIcon } from '@chakra-ui/icons';
import { useSocket, ConnectionState } from '../contexts/SocketContext';

interface ConnectionStatusProps {
  showMinimal?: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ showMinimal = false }) => {
  const { connectionState, connectionAttempts, isServerWarming, connect } = useSocket();

  // Don't show anything when connected
  if (connectionState === 'connected') {
    return null;
  }

  // Minimal version for smaller spaces
  if (showMinimal) {
    if (connectionState === 'connecting' || connectionState === 'reconnecting') {
      return (
        <HStack spacing={2} fontSize="sm" color="gray.600">
          <Spinner size="xs" />
          <Text>Connecting...</Text>
        </HStack>
      );
    }
    
    if (connectionState === 'warming_up' || isServerWarming) {
      return (
        <HStack spacing={2} fontSize="sm" color="orange.600">
          <Spinner size="xs" />
          <Text>Server starting...</Text>
        </HStack>
      );
    }
    
    return null;
  }

  const getStatusConfig = (state: ConnectionState) => {
    switch (state) {
      case 'connecting':
        return {
          status: 'info' as const,
          title: 'Connecting to server...',
          description: 'Establishing connection, please wait.',
          showProgress: true,
          showRetry: false,
        };
      
      case 'warming_up':
        return {
          status: 'warning' as const,
          title: 'Server is starting up',
          description: 'The server needs a moment to wake up. This may take 30-60 seconds.',
          showProgress: true,
          showRetry: false,
        };
      
      case 'reconnecting':
        return {
          status: 'warning' as const,
          title: isServerWarming ? 'Server is starting up' : 'Reconnecting...',
          description: isServerWarming 
            ? `Server is waking up, this may take a moment. Attempt ${connectionAttempts + 1} of 10.`
            : `Attempting to reconnect (${connectionAttempts + 1}/10)`,
          showProgress: true,
          showRetry: false,
        };
      
      case 'failed':
        return {
          status: 'error' as const,
          title: 'Connection failed',
          description: 'Unable to connect to the server. Please check your connection and try again.',
          showProgress: false,
          showRetry: true,
        };
      
      default:
        return null;
    }
  };

  const config = getStatusConfig(connectionState);
  
  if (!config) {
    return null;
  }

  const progressValue = connectionAttempts > 0 ? (connectionAttempts / 10) * 100 : 0;

  return (
    <Alert status={config.status} borderRadius="md" mb={4}>
      <AlertIcon />
      <VStack align="start" spacing={2} flex={1}>
        <AlertDescription>
          <VStack align="start" spacing={2} w="full">
            <Text fontWeight="medium">{config.title}</Text>
            <Text fontSize="sm">{config.description}</Text>
            
            {config.showProgress && connectionAttempts > 0 && (
              <Box w="full">
                <Progress 
                  value={progressValue} 
                  size="sm" 
                  colorScheme={isServerWarming ? "orange" : "blue"}
                  isAnimated
                  hasStripe
                />
                <Text fontSize="xs" color="gray.600" mt={1}>
                  {isServerWarming ? 'Server warming up...' : `Attempt ${connectionAttempts}/10`}
                </Text>
              </Box>
            )}
            
            {config.showRetry && (
              <Button
                size="sm"
                leftIcon={<RepeatIcon />}
                colorScheme="blue"
                onClick={connect}
                variant="outline"
              >
                Try Again
              </Button>
            )}
          </VStack>
        </AlertDescription>
      </VStack>
    </Alert>
  );
};

export default ConnectionStatus;
