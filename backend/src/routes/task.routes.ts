import { Router, Request, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Task, { ITask } from '../models/task.model';
import User, { IUser } from '../models/user.model';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { 
  emitTaskCreated, 
  emitTaskUpdated, 
  emitTaskDeleted, 
  emitTaskShared 
} from '../socket/socket';

const router = Router();

// Helper function to check database connection
const checkDBConnection = (): boolean => {
  return mongoose.connection.readyState === 1; // 1 = connected
};

// Helper function to handle database connection errors
const handleDBError = (res: Response, operation: string): boolean => {
  if (!checkDBConnection()) {
    console.error(`❌ Database not connected for ${operation}`);
    
    res.status(503).json({
      success: false,
      message: 'Database connection failed. Please try again later.',
      error: 'DB_CONNECTION_FAILED'
    });
    return true;
  }
  return false;
};

// Validation middleware
const validateTask = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('status')
    .optional()
    .isIn(['pending', 'in-progress', 'completed'])
    .withMessage('Status must be pending, in-progress, or completed'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date')
    .custom((value) => {
      if (value) {
        try {
          const now = new Date();
          const inputDate = new Date(value);
          
          // Check if the date is valid
          if (isNaN(inputDate.getTime())) {
            throw new Error('Invalid date format');
          }
          
          // Allow dates that are at least 1 minute in the future
          const bufferTime = new Date(now.getTime() + 60000); // 1 minute buffer
          if (inputDate < bufferTime) {
            throw new Error('Due date and time must be at least 1 minute in the future');
          }
        } catch (error: any) {
          throw new Error(error.message || 'Invalid date or time');
        }
      }
      return true;
    }),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
    .custom((value) => {
      if (value && Array.isArray(value)) {
        for (const tag of value) {
          if (typeof tag !== 'string' || tag.length > 50) {
            throw new Error('Each tag must be a string and cannot exceed 50 characters');
          }
        }
      }
      return true;
    })
];

// Validation middleware for task updates (more flexible)
const validateTaskUpdate = [
  body('title')
    .optional()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('status')
    .optional()
    .isIn(['pending', 'in-progress', 'completed'])
    .withMessage('Status must be pending, in-progress, or completed'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date')
    .custom((value) => {
      if (value) {
        try {
          const now = new Date();
          const inputDate = new Date(value);
          
          // Check if the date is valid
          if (isNaN(inputDate.getTime())) {
            throw new Error('Invalid date format');
          }
          
          // Allow dates that are at least 1 minute in the future
          const bufferTime = new Date(now.getTime() + 60000); // 1 minute buffer
          if (inputDate < bufferTime) {
            throw new Error('Due date and time must be at least 1 minute in the future');
          }
        } catch (error: any) {
          throw new Error(error.message || 'Invalid date or time');
        }
      }
      return true;
    }),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
    .custom((value) => {
      if (value && Array.isArray(value)) {
        for (const tag of value) {
          if (typeof tag !== 'string' || tag.length > 50) {
            throw new Error('Each tag must be a string and cannot exceed 50 characters');
          }
        }
      }
      return true;
    })
];

const validateShare = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Must be a valid email address')
];

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

// Helper function to handle validation errors
const handleValidationErrors = (req: Request, res: Response): boolean => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
    return true;
  }
  return false;
};

// @route   POST /api/tasks
// @desc    Create a new task
// @access  Private
router.post('/', validateTask, async (req: Request, res: Response) => {
  console.log('🔥 CREATE TASK REQUEST RECEIVED');
  console.log('📥 Request body:', JSON.stringify(req.body, null, 2));
  console.log('👤 User from request:', req.user ? 'Present' : 'Missing');
  
  try {
    if (handleValidationErrors(req, res)) {
      console.log('❌ Validation errors found');
      return;
    }

    const { title, description, status, priority, dueDate, tags } = req.body;
    const userId = (req.user as IUser)._id;
    
    console.log('📋 Creating task with data:', {
      title,
      description,
      status: status || 'pending',
      priority: priority || 'medium',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      tags: tags || [],
      owner: userId.toString()
    });

    const task = await Task.create({
      title,
      description,
      status: status || 'pending',
      priority: priority || 'medium',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      tags: tags || [],
      owner: userId,
      sharedWith: []
    });

    console.log('✅ Task created successfully:', task._id);

    await task.populate('owner', 'displayName email profilePicture');
    console.log('👤 Task populated with owner data');

    // Emit socket event using helper function
    const io = (req as any).io;
    if (io) {
      console.log('🔌 Emitting task_created event...');
      emitTaskCreated(io, task, []);
    } else {
      console.log('⚠️ Socket.IO instance not found in request');
    }

    console.log('📤 Sending success response');
    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task
    });
  } catch (error: any) {
    console.error('❌ Error creating task:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   GET /api/tasks
// @desc    Get tasks owned by the authenticated user only
// @access  Private
router.get('/', validatePagination, async (req: Request, res: Response) => {
  try {
    if (handleValidationErrors(req, res)) return;
    if (handleDBError(res, 'GET /api/tasks')) return;

    const userId = (req.user as IUser)._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get filters from query params
    const { status, priority, search } = req.query;
    
    // Build filter object - only show tasks owned by the current user
    const filter: any = {
      owner: userId  // Only tasks owned by the current user
    };

    if (status) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (search) {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      });
    }

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('owner', 'displayName email profilePicture')
        .populate('sharedWith', 'displayName email profilePicture')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Task.countDocuments(filter)
    ]);

    console.log(`📋 Found ${tasks.length} tasks owned by user ${userId}`);

    res.json({
      success: true,
      tasks,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalTasks: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/tasks/shared
// @desc    Get tasks shared with the authenticated user (separate from owned tasks)
// @access  Private
router.get('/shared', validatePagination, async (req: Request, res: Response) => {
  try {
    if (handleValidationErrors(req, res)) return;
    if (handleDBError(res, 'GET /api/tasks/shared')) return;

    const userId = (req.user as IUser)._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get filters from query params
    const { status, priority, search } = req.query;
    
    // Build filter object - only show tasks shared with the current user
    const filter: any = {
      sharedWith: userId,  // Only tasks shared with the current user
      owner: { $ne: userId }  // Exclude tasks owned by the current user
    };

    if (status) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (search) {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      });
    }

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('owner', 'displayName email profilePicture')
        .populate('sharedWith', 'displayName email profilePicture')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Task.countDocuments(filter)
    ]);

    console.log(`📋 Found ${tasks.length} tasks shared with user ${userId}`);

    res.json({
      success: true,
      tasks,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalTasks: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Get shared tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update a task
// @access  Private
router.put('/:id', validateTaskUpdate, async (req: Request, res: Response) => {
  console.log('🔥 UPDATE TASK REQUEST RECEIVED');
  console.log('📥 Request body:', JSON.stringify(req.body, null, 2));
  console.log('📥 Task ID:', req.params.id);
  console.log('👤 User ID:', (req.user as IUser)._id);
  
  try {
    if (handleValidationErrors(req, res)) return;

    const { id } = req.params;
    const userId = (req.user as IUser)._id;
    const { title, description, status, priority, dueDate, tags } = req.body;

    // Find task and check if user owns it (only owner can update)
    const task = await Task.findOne({
      _id: id,
      owner: userId
    });

    if (!task) {
      res.status(404).json({
        success: false,
        message: 'Task not found or access denied'
      });
      return;
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
    if (tags !== undefined) updateData.tags = tags;

    // Update task
    const updatedTask = await Task.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('owner', 'displayName email profilePicture')
     .populate('sharedWith', 'displayName email profilePicture');

    if (!updatedTask) {
      res.status(404).json({
        success: false,
        message: 'Task not found'
      });
      return;
    }

    // Emit socket event using helper function
    const io = (req as any).io;
    if (io && updatedTask) {
      console.log('🔌 Emitting task_updated event...');
      const sharedUserIds = updatedTask.sharedWith.map((user: any) => user._id.toString());
      emitTaskUpdated(io, updatedTask, sharedUserIds);
    } else {
      console.log('⚠️ Socket.IO instance not found or task not updated');
    }

    res.json({
      success: true,
      message: 'Task updated successfully',
      task: updatedTask
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete a task
// @access  Private
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user as IUser)._id;

    // Find task and check if user is the owner
    const task = await Task.findOne({
      _id: id,
      owner: userId
    }).populate('sharedWith', '_id');

    if (!task) {
      res.status(404).json({
        success: false,
        message: 'Task not found or you are not the owner'
      });
      return;
    }

    // Get shared users before deletion
    const sharedUserIds = task.sharedWith.map((user: any) => user._id.toString());

    await Task.findByIdAndDelete(id);

    // Emit socket event using helper function
    const io = (req as any).io;
    if (io) {
      console.log('🔌 Emitting task_deleted event...');
      emitTaskDeleted(io, id, userId.toString(), sharedUserIds);
    }

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   POST /api/tasks/:id/share
// @desc    Share a task with another user
// @access  Private
router.post('/:id/share', validateShare, async (req: Request, res: Response) => {
  try {
    if (handleValidationErrors(req, res)) return;

    const { id } = req.params;
    const { email } = req.body;
    const userId = (req.user as IUser)._id;

    // Find the task and check if user is the owner
    const task = await Task.findOne({
      _id: id,
      owner: userId
    });

    if (!task) {
      res.status(404).json({
        success: false,
        message: 'Task not found or you are not the owner'
      });
      return;
    }

    // Find user to share with
    const userToShare = await User.findOne({ email: email.toLowerCase() });

    if (!userToShare) {
      res.status(404).json({
        success: false,
        message: 'User with this email not found'
      });
      return;
    }

    // Check if task is already shared with this user
    if (task.sharedWith.includes(userToShare._id)) {
      res.status(400).json({
        success: false,
        message: 'Task is already shared with this user'
      });
      return;
    }

    // Check if trying to share with self
    if (userToShare._id.toString() === userId.toString()) {
      res.status(400).json({
        success: false,
        message: 'Cannot share task with yourself'
      });
      return;
    }

    // Add user to sharedWith array
    task.sharedWith.push(userToShare._id);
    await task.save();

    // Populate the updated task
    await task.populate('owner', 'displayName email profilePicture');
    await task.populate('sharedWith', 'displayName email profilePicture');

    // Emit socket event using helper function
    const io = (req as any).io;
    if (io) {
      console.log('🔌 Emitting task_shared event...');
      emitTaskShared(io, task, [userToShare._id.toString()]);
    }

    res.json({
      success: true,
      message: 'Task shared successfully',
      task
    });
  } catch (error) {
    console.error('Share task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   DELETE /api/tasks/:taskId/share/:userId
// @desc    Remove a user from a shared task
// @access  Private (Owner only)
router.delete('/:taskId/share/:userId', async (req: Request, res: Response) => {
  console.log('🔥 REMOVE SHARED USER REQUEST RECEIVED');
  console.log('📥 Task ID:', req.params.taskId);
  console.log('📥 User ID to remove:', req.params.userId);
  console.log('👤 Authenticated User ID:', (req.user as IUser)._id);

  try {
    if (handleDBError(res, 'DELETE /api/tasks/:taskId/share/:userId')) return;

    const { taskId, userId } = req.params;
    const authenticatedUserId = (req.user as IUser)._id;

    // Find the task and check if the authenticated user is the owner
    const task = await Task.findOne({
      _id: taskId,
      owner: authenticatedUserId
    });

    if (!task) {
      console.log('❌ Task not found or authenticated user is not the owner');
      res.status(404).json({
        success: false,
        message: 'Task not found or access denied'
      });
      return;
    }

    // Check if the user to remove is actually in the sharedWith list
    const userIndex = task.sharedWith.findIndex(sharedUserId => sharedUserId.toString() === userId);

    if (userIndex === -1) {
      console.log('⚠️ User to remove not found in sharedWith list');
      res.status(404).json({
        success: false,
        message: 'User not found in shared list'
      });
      return;
    }

    // Remove the user from the sharedWith array
    task.sharedWith.splice(userIndex, 1);
    await task.save();

    console.log('✅ User', userId, 'removed from task', taskId);

    // Populate the updated task before sending the response and emitting the socket event
    const updatedTask = await Task.findById(taskId)
      .populate('owner', 'displayName email profilePicture')
      .populate('sharedWith', 'displayName email profilePicture');

    // Emit socket event using helper function
    const io = (req as any).io;
    if (io && updatedTask) {
      console.log('🔌 Emitting task_updated event...');
      // Include the owner and remaining shared users in the recipients list
      const recipients = [updatedTask.owner._id.toString(), ...updatedTask.sharedWith.map((user: any) => user._id.toString())];
      emitTaskUpdated(io, updatedTask, recipients);

      // Also emit a task_unshared event to the user who was removed
      console.log('🔌 Emitting task_unshared event to user:', userId);
      io.to(userId).emit('task_unshared', { taskId: updatedTask._id });

    } else {
      console.log('⚠️ Socket.IO instance not found or task not updated for socket event');
    }

    console.log('📤 Sending success response with updated task');
    res.json({
      success: true,
      message: 'User removed from shared list successfully',
      task: updatedTask // Send the updated task back
    });

  } catch (error) {
    console.error('❌ Error removing shared user from task:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
