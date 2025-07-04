import { CreateToastFnReturn } from '@chakra-ui/react';

export class ServerStatusNotificationService {
  private static instance: ServerStatusNotificationService;
  private toast: CreateToastFnReturn | null = null;
  private serverWarmupToastId: string | number | null = null;
  private hasShownWarmupNotification = false;

  private constructor() {}

  static getInstance(): ServerStatusNotificationService {
    if (!ServerStatusNotificationService.instance) {
      ServerStatusNotificationService.instance = new ServerStatusNotificationService();
    }
    return ServerStatusNotificationService.instance;
  }

  initialize(toast: CreateToastFnReturn) {
    this.toast = toast;
  }

  showServerWarmupNotification() {
    if (!this.toast || this.hasShownWarmupNotification) return;
    
    this.hasShownWarmupNotification = true;
    this.serverWarmupToastId = this.toast({
      title: 'Server Starting Up',
      description: 'The server is waking up from sleep mode. This may take 30-60 seconds.',
      status: 'info',
      duration: 10000,
      isClosable: true,
      position: 'top-right',
    });
  }

  showServerReadyNotification() {
    if (!this.toast) return;

    // Close warmup notification if it exists
    if (this.serverWarmupToastId) {
      this.toast.close(this.serverWarmupToastId);
      this.serverWarmupToastId = null;
    }

    if (this.hasShownWarmupNotification) {
      this.toast({
        title: 'Server Ready',
        description: 'Successfully connected to the server!',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
    }

    this.hasShownWarmupNotification = false;
  }

  showConnectionFailedNotification() {
    if (!this.toast) return;

    this.toast({
      title: 'Connection Failed',
      description: 'Unable to connect to the server. Please check your internet connection.',
      status: 'error',
      duration: 5000,
      isClosable: true,
      position: 'top-right',
    });

    this.hasShownWarmupNotification = false;
  }

  reset() {
    this.hasShownWarmupNotification = false;
    if (this.serverWarmupToastId && this.toast) {
      this.toast.close(this.serverWarmupToastId);
      this.serverWarmupToastId = null;
    }
  }
}

export const serverStatusNotification = ServerStatusNotificationService.getInstance();
