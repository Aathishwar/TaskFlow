import { Server } from 'socket.io';
// Remove the standard jwt import
// import jwt from 'jsonwebtoken';
import User from '../models/user.model';
import admin from 'firebase-admin'; // Import the firebase-admin module

// Rate limiting for socket logs to prevent spam
const socketLogCache = new Map<string, number>();
const LOG_COOLDOWN = 30000; // 30 seconds between logs per user

const shouldLog = (userId: string): boolean => {
  const now = Date.now();
  const lastLog = socketLogCache.get(userId) || 0;
  
  if (now - lastLog > LOG_COOLDOWN) {
    socketLogCache.set(userId, now);
    return true;
  }
  return false;
};

export const setupSocketIO = (io: Server): void => {
  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Use Firebase Admin SDK to verify the ID token
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      // Find the user by firebaseUid or email
      let user = await User.findOne({ firebaseUid: decodedToken.uid });

      if (!user && decodedToken.email) {
        user = await User.findOne({ email: decodedToken.email });
      }

      if (!user) {
        return next(new Error('User not found'));
      }

      (socket as any).user = user;
      // Only log new socket connections with rate limiting
      if (shouldLog(user._id.toString())) {
        console.log(`🔌 Socket: ${user.email} connected`);
      }
      next();
    } catch (error: any) {
      console.log('🔒 Socket authentication failed:', error.message);
      // Check if it's a Firebase Admin SDK error
      if (error.code === 'auth/id-token-expired') {
        next(new Error('Authentication token expired'));
      } else if (error.code === 'auth/argument-error') {
         next(new Error('Invalid authentication token format'));
      } else {
        next(new Error('Invalid authentication token'));
      }
    }
  });

  io.on('connection', (socket) => {
    const user = (socket as any).user;
    console.log(`🔌 User connected: ${socket.id} - ${user.email} (${user.displayName})`);

    // Automatically join user to their personal room
    const userId = user._id.toString();
    socket.join(userId);
    console.log(`👤 User ${user.email} joined their personal room: ${userId}`);
    
    // Send confirmation back to client
    socket.emit('joined_room', { 
      userId, 
      roomId: userId, 
      socketId: socket.id,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName
      }
    });

    // Test event handler for debugging
    socket.on('test_event', (data) => {
      // console.log(`🧪 Test event received from ${user.email}:`, data);
      socket.emit('test_response', { 
        message: `Hello ${user.displayName}!`, 
        timestamp: new Date().toISOString(),
        originalData: data,
        user: {
          id: user._id,
          email: user.email,
          displayName: user.displayName
        }
      });
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`🔌 User disconnected: ${socket.id} - ${user.email} (reason: ${reason})`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`🚨 Socket error for ${user.email}:`, error);
    });

    // Handle reconnection (reduce logging noise with rate limiting)
    socket.on('reconnect', (attemptNumber) => {
      // Only log reconnections after multiple attempts and with rate limiting
      if (attemptNumber > 3 && shouldLog(user._id.toString() + '_reconnect')) {
        console.log(`🔄 ${user.email} reconnected after ${attemptNumber} attempts`);
      }
    });
  });

  // Handle server errors
  io.on('error', (error) => {
    console.error('🚨 Socket.IO server error:', error);
  });

  // Log server events
  io.engine.on('connection_error', (err) => {
    console.error('🚨 Socket.IO connection error:', err.message);
  });
};

// Helper functions to emit events to specific users or rooms
export const emitToUser = (io: Server, userId: string, event: string, data: any) => {
  console.log(`📤 Emitting ${event} to user ${userId}`);
  io.to(userId).emit(event, data);
};

export const emitToUsers = (io: Server, userIds: string[], event: string, data: any) => {
  console.log(`📤 Emitting ${event} to users ${userIds.join(', ')}`);
  userIds.forEach(userId => {
    io.to(userId).emit(event, data);
  });
};

export const emitToRoom = (io: Server, roomId: string, event: string, data: any) => {
  console.log(`📤 Emitting ${event} to room ${roomId}`);
  io.to(roomId).emit(event, data);
};

// Helper function to sanitize task data for socket emission
const sanitizeTaskForEmission = (task: any) => {
  const taskData = task.toObject ? task.toObject() : task;
  
  // Create a clean copy - since we're moving away from base64, this is much simpler
  const sanitizedTask = {
    ...taskData,
    // If owner is populated, include all data (URLs are small and efficient)
    owner: taskData.owner ? {
      _id: taskData.owner._id,
      email: taskData.owner.email,
      displayName: taskData.owner.displayName,
      // All profile pictures are now URLs (Cloudinary), so safe to include
      profilePicture: taskData.owner.profilePicture || ''
    } : taskData.owner
  };
  
  return sanitizedTask;
};

// Task-specific event emitters with improved error handling
export const emitTaskCreated = (io: Server, task: any, recipients: string[]) => {
  try {
    const sanitizedTask = sanitizeTaskForEmission(task);
    const eventData = {
      ...sanitizedTask,
      timestamp: new Date().toISOString(),
      event: 'task_created'
    };
    
    // Emit to task owner - handle both populated and unpopulated owner field
    const ownerId = task.owner?.id || task.owner?._id || task.owner;
    if (ownerId) {
      console.log(`📤 Emitting task_created to owner: ${ownerId}`);
      emitToUser(io, ownerId.toString(), 'task_created', eventData);
    }
    
    // Emit to shared users
    if (recipients && recipients.length > 0) {
      console.log(`📤 Emitting task_created to shared users: ${recipients.join(', ')}`);
      emitToUsers(io, recipients, 'task_created', eventData);
    }
  } catch (error) {
    console.error('❌ Error emitting task_created event:', error);
  }
};

export const emitTaskUpdated = (io: Server, task: any, recipients: string[]) => {
  try {
    const sanitizedTask = sanitizeTaskForEmission(task);
    const eventData = {
      ...sanitizedTask,
      timestamp: new Date().toISOString(),
      event: 'task_updated'
    };
    
    // Emit to task owner - handle both populated and unpopulated owner field
    const ownerId = task.owner?.id || task.owner?._id || task.owner;
    if (ownerId) {
      console.log(`📤 Emitting task_updated to owner: ${ownerId}`);
      emitToUser(io, ownerId.toString(), 'task_updated', eventData);
    }
    
    // Emit to shared users
    if (recipients && recipients.length > 0) {
      console.log(`📤 Emitting task_updated to shared users: ${recipients.join(', ')}`);
      emitToUsers(io, recipients, 'task_updated', eventData);
    }
  } catch (error) {
    console.error('❌ Error emitting task_updated event:', error);
  }
};

export const emitTaskDeleted = (io: Server, taskId: string, ownerId: string, recipients: string[]) => {
  try {
    const eventData = {
      taskId,
      timestamp: new Date().toISOString(),
      event: 'task_deleted'
    };
    
    // Emit to task owner
    console.log(`📤 Emitting task_deleted to owner: ${ownerId}`);
    emitToUser(io, ownerId, 'task_deleted', eventData);
    
    // Emit to shared users
    if (recipients && recipients.length > 0) {
      console.log(`📤 Emitting task_deleted to shared users: ${recipients.join(', ')}`);
      emitToUsers(io, recipients, 'task_deleted', eventData);
    }
  } catch (error) {
    console.error('❌ Error emitting task_deleted event:', error);
  }
};

export const emitTaskShared = (io: Server, task: any, newRecipients: string[]) => {
  try {
    const sanitizedTask = sanitizeTaskForEmission(task);
    const eventData = {
      ...sanitizedTask,
      timestamp: new Date().toISOString(),
      event: 'task_shared'
    };
    
    // Emit to new recipients
    if (newRecipients && newRecipients.length > 0) {
      console.log(`📤 Emitting task_shared to new recipients: ${newRecipients.join(', ')}`);
      emitToUsers(io, newRecipients, 'task_shared', eventData);
    }
    
    // Also emit to task owner to update their view - handle both populated and unpopulated owner field
    const ownerId = task.owner?.id || task.owner?._id || task.owner;
    if (ownerId) {
      console.log(`📤 Emitting task_updated to owner after sharing: ${ownerId}`);
      emitToUser(io, ownerId.toString(), 'task_updated', eventData);
    }
  } catch (error) {
    console.error('❌ Error emitting task_shared event:', error);
  }
};

export const emitTaskUnshared = (io: Server, task: any, removedRecipients: string[]) => {
  try {
    const sanitizedTask = sanitizeTaskForEmission(task);
    const eventData = {
      taskId: task._id,
      updatedTask: sanitizedTask,
      timestamp: new Date().toISOString(),
      event: 'task_unshared'
    };
    
    // Emit to removed recipients
    if (removedRecipients && removedRecipients.length > 0) {
      console.log(`📤 Emitting task_unshared to removed recipients: ${removedRecipients.join(', ')}`);
      emitToUsers(io, removedRecipients, 'task_unshared', eventData);
    }
    
    // Also emit to task owner to update their view - handle both populated and unpopulated owner field
    const ownerId = task.owner?.id || task.owner?._id || task.owner;
    if (ownerId) {
      console.log(`📤 Emitting task_updated to owner after unsharing: ${ownerId}`);
      emitToUser(io, ownerId.toString(), 'task_updated', {
        ...sanitizedTask,
        timestamp: new Date().toISOString(),
        event: 'task_updated'
      });
    }
  } catch (error) {
    console.error('❌ Error emitting task_unshared event:', error);
  }
};
