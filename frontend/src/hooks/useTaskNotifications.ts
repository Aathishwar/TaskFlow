import { useEffect, useRef, useCallback } from 'react';
import { Task } from '../types';
import notificationService from '../services/notificationService';

interface UseTaskNotificationsProps {
  tasks: Task[];
  isEnabled?: boolean;
  checkInterval?: number; // in milliseconds
}

interface NotificationState {
  [taskId: string]: {
    dueNotificationSent: boolean;
    lastChecked: Date;
  };
}

export const useTaskNotifications = ({
  tasks,
  isEnabled = true,
  checkInterval = 5 * 60 * 1000 // 5 minutes default
}: UseTaskNotificationsProps) => {
  const notificationStateRef = useRef<NotificationState>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Function to check if a task is due within the specified time
  const isTaskDueWithin = useCallback((task: Task, minutes: number): boolean => {
    if (!task.dueDate || task.status === 'completed') return false;
    
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    const timeDiff = dueDate.getTime() - now.getTime();
    const minutesDiff = Math.floor(timeDiff / (1000 * 60));
    
    return minutesDiff > 0 && minutesDiff <= minutes;
  }, []);

  // Function to check if a task is overdue
  const isTaskOverdue = useCallback((task: Task): boolean => {
    if (!task.dueDate || task.status === 'completed') return false;
    
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    
    return now > dueDate;
  }, []);

  // Function to get minutes until due
  const getMinutesUntilDue = useCallback((task: Task): number => {
    if (!task.dueDate) return 0;
    
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    const timeDiff = dueDate.getTime() - now.getTime();
    
    return Math.floor(timeDiff / (1000 * 60));
  }, []);

  // Main function to check tasks and send notifications
  const checkTasksForNotifications = useCallback(() => {
    if (!isEnabled || !notificationService.getPermission().granted) {
      return;
    }

    tasks.forEach(task => {
      const taskId = task._id;
      const currentState = notificationStateRef.current[taskId] || {
        dueNotificationSent: false,
        lastChecked: new Date()
      };

      // Check for due soon notification (1 hour = 60 minutes)
      if (isTaskDueWithin(task, 60) && !currentState.dueNotificationSent) {
        const minutesLeft = getMinutesUntilDue(task);
        notificationService.showTaskDueNotification(task, minutesLeft);
        currentState.dueNotificationSent = true;
        console.log(`📨 Due notification sent for task: ${task.title} (${minutesLeft} minutes left)`);
      }

      // Reset notification flags if task is completed
      if (task.status === 'completed') {
        currentState.dueNotificationSent = false;
      }

      // Update the state
      currentState.lastChecked = new Date();
      notificationStateRef.current[taskId] = currentState;
    });

    // Clean up state for tasks that no longer exist
    const currentTaskIds = new Set(tasks.map(task => task._id));
    Object.keys(notificationStateRef.current).forEach(taskId => {
      if (!currentTaskIds.has(taskId)) {
        delete notificationStateRef.current[taskId];
      }
    });
  }, [tasks, isEnabled, isTaskDueWithin, isTaskOverdue, getMinutesUntilDue]);

  // Request notification permission on first load
  useEffect(() => {
    const requestPermission = async () => {
      if (isEnabled && notificationService.isSupported()) {
        const granted = await notificationService.requestPermission();
        if (granted) {
          console.log('✅ Notification permission granted');
        } else {
          console.warn('❌ Notification permission denied');
        }
      }
    };

    requestPermission();
  }, [isEnabled]);

  // Set up interval to check tasks
  useEffect(() => {
    if (!isEnabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial check
    checkTasksForNotifications();

    // Set up interval
    intervalRef.current = setInterval(checkTasksForNotifications, checkInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isEnabled, checkTasksForNotifications, checkInterval]);

  // Manual trigger function
  const triggerNotificationCheck = useCallback(() => {
    checkTasksForNotifications();
  }, [checkTasksForNotifications]);

  // Function to reset notification state for a specific task
  const resetTaskNotificationState = useCallback((taskId: string) => {
    if (notificationStateRef.current[taskId]) {
      notificationStateRef.current[taskId] = {
        dueNotificationSent: false,
        lastChecked: new Date()
      };
    }
  }, []);

  // Get notification permission status
  const getPermissionStatus = useCallback(() => {
    return notificationService.getPermission();
  }, []);

  // Request permission manually
  const requestPermission = useCallback(async () => {
    return await notificationService.requestPermission();
  }, []);

  return {
    triggerNotificationCheck,
    resetTaskNotificationState,
    getPermissionStatus,
    requestPermission,
    isSupported: notificationService.isSupported()
  };
};
