import React from 'react';
import { Button, VStack, Text, useToast } from '@chakra-ui/react';
import notificationService from '../services/notificationService';
import { Task } from '../types';

const TestNotifications: React.FC = () => {
  const toast = useToast();

  const testTaskDueNotification = () => {
    const mockTask: Task = {
      _id: 'test-task-1',
      title: 'Sample Task for Testing',
      description: 'This is a test notification',
      status: 'pending',
      priority: 'medium',
      dueDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      owner: {
        id: 'test-user',
        displayName: 'Test User',
        email: 'test@example.com'
      },
      sharedWith: []
    };

    notificationService.showTaskDueNotification(mockTask, 60);
    
    toast({
      title: 'Test Notification Sent',
      description: 'Check your browser notifications',
      status: 'success',
      duration: 3000,
      isClosable: true
    });
  };

  const testTaskOverdueNotification = () => {
    const mockTask: Task = {
      _id: 'test-task-2',
      title: 'Overdue Task for Testing',
      description: 'This task is overdue',
      status: 'pending',
      priority: 'high',
      dueDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      owner: {
        id: 'test-user',
        displayName: 'Test User',
        email: 'test@example.com'
      },
      sharedWith: []
    };

    notificationService.showTaskOverdueNotification(mockTask);
    
    toast({
      title: 'Test Overdue Notification Sent',
      description: 'Check your browser notifications',
      status: 'warning',
      duration: 3000,
      isClosable: true
    });
  };

  const requestPermission = async () => {
    const granted = await notificationService.requestPermission();
    
    toast({
      title: granted ? 'Permission Granted' : 'Permission Denied',
      description: granted 
        ? 'You can now receive notifications' 
        : 'Please enable notifications in your browser settings',
      status: granted ? 'success' : 'error',
      duration: 3000,
      isClosable: true
    });
  };

  const permission = notificationService.getPermission();

  return (
    <VStack spacing={4} p={4} border="1px" borderColor="gray.200" borderRadius="md">
      <Text fontWeight="bold">Notification Testing (Development Only)</Text>
      
      <Text fontSize="sm" color="gray.600">
        Permission Status: {permission.granted ? 'Granted' : permission.denied ? 'Denied' : 'Not Set'}
      </Text>

      {!permission.granted && (
        <Button colorScheme="blue" onClick={requestPermission}>
          Request Notification Permission
        </Button>
      )}

      {permission.granted && (
        <>
          <Button colorScheme="yellow" onClick={testTaskDueNotification}>
            Test Due Soon Notification
          </Button>
          
          <Button colorScheme="red" onClick={testTaskOverdueNotification}>
            Test Overdue Notification
          </Button>
        </>
      )}
    </VStack>
  );
};

export default TestNotifications;
