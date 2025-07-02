import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Switch,
  Text,
  VStack,
  HStack,
  Badge,
  Button,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useColorModeValue,
  Divider,
  Icon
} from '@chakra-ui/react';
import { BellIcon, CheckCircleIcon } from '@chakra-ui/icons';
import notificationService from '../services/notificationService';

interface NotificationSettingsProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  isEnabled,
  onToggle
}) => {
  const [permissionStatus, setPermissionStatus] = useState(notificationService.getPermission());
  const [isRequesting, setIsRequesting] = useState(false);

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Update permission status
  const updatePermissionStatus = () => {
    setPermissionStatus(notificationService.getPermission());
  };

  useEffect(() => {
    updatePermissionStatus();
  }, []);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      await notificationService.requestPermission();
      updatePermissionStatus();
    } catch (error) {
      console.error('Error requesting permission:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleToggle = (checked: boolean) => {
    if (checked && !permissionStatus.granted) {
      handleRequestPermission().then(() => {
        if (notificationService.getPermission().granted) {
          onToggle(true);
        }
      });
    } else {
      onToggle(checked);
    }
  };

  const getPermissionBadge = () => {
    if (permissionStatus.granted) {
      return <Badge colorScheme="green" variant="subtle">Granted</Badge>;
    } else if (permissionStatus.denied) {
      return <Badge colorScheme="red" variant="subtle">Denied</Badge>;
    } else {
      return <Badge colorScheme="yellow" variant="subtle">Not Set</Badge>;
    }
  };

  const getPermissionAlert = () => {
    if (!notificationService.isSupported()) {
      return (
        <Alert status="warning" borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>Notifications Not Supported</AlertTitle>
            <AlertDescription>
              Your browser doesn't support notifications.
            </AlertDescription>
          </Box>
        </Alert>
      );
    }

    if (permissionStatus.denied) {
      return (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>Notifications Blocked</AlertTitle>
            <AlertDescription>
              You've blocked notifications. To enable them, click on the lock icon in your browser's address bar and allow notifications.
            </AlertDescription>
          </Box>
        </Alert>
      );
    }

    if (permissionStatus.default) {
      return (
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>Permission Required</AlertTitle>
            <AlertDescription>
              Click "Enable Notifications" to receive task due reminders.
            </AlertDescription>
          </Box>
        </Alert>
      );
    }      if (permissionStatus.granted && isEnabled) {
      return (
        <Alert status="success" borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>Notifications Active</AlertTitle>
            <AlertDescription>
              You'll receive notifications 1 hour before tasks are due.
            </AlertDescription>
          </Box>
        </Alert>
      );
    }

    return null;
  };

  return (
    <Card bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="xl">
      <CardHeader>
        <HStack spacing={3}>
          <Icon as={BellIcon} boxSize={5} color="blue.500" />
          <Text fontSize="lg" fontWeight="semibold">
            Task Notifications
          </Text>
        </HStack>
      </CardHeader>
      
      <CardBody>
        <VStack spacing={4} align="stretch">
          {/* Permission Alert */}
          {getPermissionAlert()}

          <Divider />

          {/* Main Toggle */}
          <HStack justify="space-between" align="center">
            <VStack align="start" spacing={1}>
              <Text fontWeight="medium">
                Due Time Notifications
              </Text>
              <Text fontSize="sm" color="gray.500">
                Get notified 1 hour before tasks are due
              </Text>
            </VStack>
            <Switch
              isChecked={isEnabled && permissionStatus.granted}
              onChange={(e) => handleToggle(e.target.checked)}
              isDisabled={!notificationService.isSupported() || permissionStatus.denied}
              colorScheme="blue"
              size="lg"
            />
          </HStack>

          {/* Permission Status */}
          <HStack justify="space-between" align="center">
            <VStack align="start" spacing={1}>
              <Text fontWeight="medium">
                Browser Permission
              </Text>
              <Text fontSize="sm" color="gray.500">
                Current notification permission status
              </Text>
            </VStack>
            <VStack align="end" spacing={1}>
              {getPermissionBadge()}
              {permissionStatus.default && (
                <Button
                  size="sm"
                  colorScheme="blue"
                  variant="outline"
                  onClick={handleRequestPermission}
                  isLoading={isRequesting}
                  loadingText="Requesting..."
                >
                  Enable Notifications
                </Button>
              )}
            </VStack>
          </HStack>

          {/* Features List */}
          <Box>
            <Text fontWeight="medium" mb={2}>
              Notification Features:
            </Text>
            <VStack align="start" spacing={2} pl={4}>
              <HStack spacing={2}>
                <CheckCircleIcon color="green.500" boxSize={4} />
                <Text fontSize="sm">1-hour advance warning for due tasks</Text>
              </HStack>
              <HStack spacing={2}>
                <CheckCircleIcon color="green.500" boxSize={4} />
                <Text fontSize="sm">Works across all your devices</Text>
              </HStack>
              <HStack spacing={2}>
                <CheckCircleIcon color="green.500" boxSize={4} />
                <Text fontSize="sm">Smart notifications (only for incomplete tasks)</Text>
              </HStack>
            </VStack>
          </Box>
        </VStack>
      </CardBody>
    </Card>
  );
};

export default NotificationSettings;
