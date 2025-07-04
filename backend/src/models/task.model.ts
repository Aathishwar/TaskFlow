import mongoose, { Schema, Document, Types } from 'mongoose';
import { IUser } from './user.model';

export interface ITask extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date;
  owner: Types.ObjectId;
  sharedWith: Types.ObjectId[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema: Schema = new Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed'],
    default: 'pending',
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
    required: true
  },
  dueDate: {
    type: Date,
    validate: {
      validator: function(date: Date) {
        if (!date) return true; // Allow no due date
        const now = new Date();
        const inputDate = new Date(date);
        // Allow dates that are at least 1 minute in the future
        const bufferTime = new Date(now.getTime() + 60000); // 1 minute buffer
        return inputDate >= bufferTime;
      },
      message: 'Due date must be at least 1 minute in the future'
    }
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Task owner is required'],
    index: true
  },
  sharedWith: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }]
}, {
  timestamps: true,
  versionKey: false
});

// Indexes for better query performance
TaskSchema.index({ owner: 1, status: 1 }); // Most common query pattern
TaskSchema.index({ owner: 1, createdAt: -1 }); // For pagination with sorting
TaskSchema.index({ sharedWith: 1, status: 1 }); // For shared tasks filtering
TaskSchema.index({ createdAt: -1 }); // For general sorting
TaskSchema.index({ dueDate: 1, status: 1 }); // For due date queries
TaskSchema.index({ owner: 1, priority: 1 }); // For priority filtering
TaskSchema.index({ 
  title: 'text', 
  description: 'text' 
}, {
  weights: { title: 10, description: 5 }, // Title is more important for search
  name: 'task_text_index'
}); // For text search

// Virtual for checking if task is overdue
TaskSchema.virtual('isOverdue').get(function() {
  return this.dueDate && new Date() > this.dueDate && this.status !== 'completed';
});

// Instance methods
TaskSchema.methods.toJSON = function() {
  const task = this.toObject({ virtuals: true });
  delete task.__v;
  return task;
};

// Static methods
TaskSchema.statics.findByOwnerOrShared = function(userId: string) {
  return this.find({
    $or: [
      { owner: userId },
      { sharedWith: userId }
    ]
  }).populate('owner', 'displayName email profilePicture')
    .populate('sharedWith', 'displayName email profilePicture');
};

export default mongoose.model<ITask>('Task', TaskSchema);
