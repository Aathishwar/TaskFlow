import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User, { IUser } from '../models/user.model';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  io?: any;
}



export const authenticateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Authentication is now enabled for production multi-user system
    console.log('� Authenticating request...');

    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Access token required' });
      return;
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      res.status(401).json({ message: 'Access token required' });
      return;
    }

    // Check database connection first
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ 
        message: 'Database connection unavailable',
        error: 'DB_CONNECTION_FAILED'
      });
      return;
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }
    
    req.user = user as IUser;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ message: 'Invalid token' });
      return;
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: 'Token expired' });
      return;
    }
    
    console.error('JWT authentication error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const generateJWT = (userId: string): string => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET!,
    { 
      expiresIn: '7d',
      issuer: 'todo-app',
      audience: 'todo-app-users'
    }
  );
};
