import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { serverStatusNotification } from '../services/serverStatusNotificationService';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'warming_up' | 'failed';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionState: ConnectionState;
  connectionAttempts: number;
  isServerWarming: boolean;
  connect: () => void;
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [isServerWarming, setIsServerWarming] = useState(false);
  const { firebaseUser, isAuthenticated, isUserSynced } = useAuth(); 
  const userIdRef = useRef<string | null>(null);
  const connectionInProgressRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxRetryAttempts = 10;

  const connect = async () => {
    if (!isAuthenticated || !firebaseUser || !isUserSynced) {
      setConnectionState('disconnected');
      return;
    }
    
    const currentUserId = firebaseUser.uid;
    
    // Prevent multiple simultaneous connection attempts
    if (connectionInProgressRef.current) {
      return;
    }
    
    if (userIdRef.current === currentUserId && socket && socket.connected) {
      setConnectionState('connected');
      return;
    }
    
    // Disconnect previous socket if user changed
    if (userIdRef.current !== currentUserId && socket) {
      socket.disconnect();
      setSocket(null);
      setConnectionState('disconnected');
    }
    
    userIdRef.current = currentUserId;
    connectionInProgressRef.current = true;
    setConnectionState('connecting');
    
    try {
      const token = await firebaseUser.getIdToken();
      
      // Check if this might be a server warmup (no previous attempts or early attempts)
      if (connectionAttempts < 3) {
        setIsServerWarming(true);
      }
      
      const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
        auth: { token },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
      });

      setSocket(newSocket);

      newSocket.on('connect', () => {
        setIsConnected(true);
        setConnectionState('connected');
        setConnectionAttempts(0);
        setIsServerWarming(false);
        connectionInProgressRef.current = false;

        // Join user room for real-time updates
        newSocket.emit('join_room', { userId: firebaseUser.uid }, () => {
          // Joined room successfully
        });
      });

      newSocket.on('connect_error', () => {
        setIsConnected(false);
        setConnectionState('failed');
        setConnectionAttempts(prev => prev + 1);
        connectionInProgressRef.current = false;

        // Only attempt to reconnect if we haven't exceeded max attempts
        if (connectionAttempts < maxRetryAttempts) {
          // Progressive delay: 2s, 4s, 8s, 16s, 32s
          const delay = Math.min(2000 * Math.pow(2, connectionAttempts), 32000);
          
          setTimeout(() => {
            if (isAuthenticated && firebaseUser && isUserSynced) {
              connect();
            }
          }, delay);
        } else {
          setIsServerWarming(false);
        }
      });

      newSocket.on('disconnect', (reason) => {
        setIsConnected(false);
        setConnectionState('disconnected');
        connectionInProgressRef.current = false;

        // Don't attempt to reconnect if it was intentional
        if (reason === 'io client disconnect') {
          return;
        }

        // Only attempt to reconnect if we haven't exceeded max attempts
        if (connectionAttempts < maxRetryAttempts) {
          const delay = Math.min(2000 * Math.pow(2, connectionAttempts), 32000);
          
          setTimeout(() => {
            if (isAuthenticated && firebaseUser && isUserSynced) {
              setConnectionAttempts(prev => prev + 1);
              connect();
            }
          }, delay);
        } else {
          setConnectionState('failed');
          setIsServerWarming(false);
        }
      });

    } catch (error) {
      setIsConnected(false);
      setConnectionState('failed');
      setConnectionAttempts(prev => prev + 1);
      connectionInProgressRef.current = false;

      if (connectionAttempts < maxRetryAttempts) {
        const delay = Math.min(2000 * Math.pow(2, connectionAttempts), 32000);
        
        setTimeout(() => {
          if (isAuthenticated && firebaseUser && isUserSynced) {
            connect();
          }
        }, delay);
      } else {
        setIsServerWarming(false);
      }
    }
  };

  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setConnectionState('disconnected');
      userIdRef.current = null;
      connectionInProgressRef.current = false;
    }
    
    // Reset state
    setConnectionAttempts(0);
    setIsServerWarming(false);
    serverStatusNotification.reset();
    
    // Clear any pending reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  // Connect when user is authenticated and synced
  useEffect(() => {
    if (isAuthenticated && firebaseUser && isUserSynced) {
      connect();
    } else {
      disconnect();
    }
    
    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [isAuthenticated, firebaseUser?.uid, isUserSynced]);

  const value = {
    socket,
    isConnected,
    connectionState,
    connectionAttempts,
    isServerWarming,
    connect,
    disconnect
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
