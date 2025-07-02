import { Task } from '../types';

export interface NotificationPermission {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

export class NotificationService {
  private static instance: NotificationService;
  private permission: NotificationPermission = {
    granted: false,
    denied: false,
    default: true
  };

  private constructor() {
    this.checkPermission();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Check current notification permission
  private checkPermission(): void {
    if ('Notification' in window) {
      const permission = Notification.permission;
      this.permission = {
        granted: permission === 'granted',
        denied: permission === 'denied',
        default: permission === 'default'
      };
    }
  }

  // Request notification permission
  public async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (this.permission.granted) {
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      this.checkPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  // Show a notification
  public showNotification(title: string, options: NotificationOptions = {}): Notification | null {
    if (!this.permission.granted) {
      console.warn('Notification permission not granted');
      return null;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'taskflow-notification',
        requireInteraction: true,
        ...options
      });

      // Auto close after 10 seconds
      setTimeout(() => {
        notification.close();
      }, 10000);

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }

  // Show task due notification
  public showTaskDueNotification(task: Task, minutesLeft: number): void {
    const title = `⏰ Task Due Soon`;
    const body = `"${task.title}" is due in ${minutesLeft} minutes`;
    
    this.showNotification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `task-due-${task._id}`,
      data: {
        taskId: task._id,
        type: 'task-due'
      }
    });
  }

  // Show task overdue notification
  public showTaskOverdueNotification(task: Task): void {
    const title = `🚨 Task Overdue`;
    const body = `"${task.title}" is now overdue!`;
    
    this.showNotification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `task-overdue-${task._id}`,
      data: {
        taskId: task._id,
        type: 'task-overdue'
      }
    });
  }

  // Check if notifications are supported
  public isSupported(): boolean {
    return 'Notification' in window;
  }

  // Get current permission status
  public getPermission(): NotificationPermission {
    this.checkPermission();
    return { ...this.permission };
  }
}

export default NotificationService.getInstance();
