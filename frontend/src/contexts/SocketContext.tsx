import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
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
  const { firebaseUser, isAuthenticated, isUserSynced } = useAuth(); 
  const userIdRef = useRef<string | null>(null);
  const connectionInProgressRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = async () => {
    if (!isAuthenticated || !firebaseUser || !isUserSynced) {
      console.log('🔌 Cannot connect: User not authenticated or not synced');
      return;
    }
    
    const currentUserId = firebaseUser.uid;
    
    // Prevent multiple simultaneous connection attempts
    if (connectionInProgressRef.current) {
      console.log('🔌 Connection already in progress, skipping...');
      return;
    }
    
    if (userIdRef.current === currentUserId && socket && socket.connected) {
      console.log('🔌 Already connected for this user');
      return;
    }
    
    // Disconnect previous socket if user changed
    if (socket) {
      console.log('🔌 Disconnecting previous socket for user change');
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
    
    try {
      connectionInProgressRef.current = true;
      console.log('🔌 Starting new socket connection for user:', firebaseUser.email);
      
      const idToken = await firebaseUser.getIdToken(true);
      const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
        auth: { token: idToken },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
      });
      
      newSocket.on('connect', () => {
        setIsConnected(true);
        userIdRef.current = currentUserId;
        connectionInProgressRef.current = false;
        console.log('✅ Socket connected for user:', firebaseUser.email);
        
        // Clear any pending reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        
        // Authenticate with the server
        newSocket.emit('authenticate', {
          userId: firebaseUser.uid,
          email: firebaseUser.email
        });
      });
      
      newSocket.on('disconnect', (reason) => {
        setIsConnected(false);
        connectionInProgressRef.current = false;
        console.log('🔌 Socket disconnected:', reason);
        
        // Attempt to reconnect if it wasn't a manual disconnect
        if (reason !== 'io client disconnect' && reason !== 'io server disconnect') {
          console.log('🔄 Attempting to reconnect...');
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isAuthenticated && firebaseUser && isUserSynced) {
              connect();
            }
          }, 2000);
        }
      });
      
      newSocket.on('connect_error', (error) => {
        setIsConnected(false);
        connectionInProgressRef.current = false;
        console.error('❌ Socket connection error:', error);
        
        // Retry connection after delay
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isAuthenticated && firebaseUser && isUserSynced) {
            connect();
          }
        }, 3000);
      });
      
      newSocket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
        setIsConnected(true);
        connectionInProgressRef.current = false;
      });
      
      newSocket.on('reconnect_error', (error) => {
        console.error('❌ Socket reconnection error:', error);
      });
      
      newSocket.on('reconnect_failed', () => {
        console.error('❌ Socket reconnection failed after all attempts');
        setIsConnected(false);
        connectionInProgressRef.current = false;
      });
      
      newSocket.on('joined_room', (data) => {
        console.log('✅ Socket joined room:', data);
      });
      
      setSocket(newSocket);
    } catch (error) {
      setIsConnected(false);
      connectionInProgressRef.current = false;
      console.error('❌ Error getting Firebase ID token or creating socket:', error);
    }
  };

  const disconnect = () => {
    if (socket) {
      console.log('🔌 Manually disconnecting socket');
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
      userIdRef.current = null;
      connectionInProgressRef.current = false;
    }
    
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
    connect,
    disconnect
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
