import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Store for tracking active authentication requests
const activeAuthRequests = new Map<string, Promise<any>>();

/**
 * Middleware to prevent duplicate authentication requests for the same user
 * This helps avoid race conditions during user creation
 */
export const authDeduplicationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Only apply to firebase auth endpoint
  if (req.path !== '/firebase' || req.method !== 'POST') {
    return next();
  }

  const { idToken } = req.body;
  if (!idToken) {
    return next(); // Let the auth handler deal with missing token
  }

  // Create a hash of the ID token to use as a key
  const requestKey = crypto.createHash('sha256').update(idToken).digest('hex').substring(0, 16);
  
  // Check if there's already an active request for this token
  const activeRequest = activeAuthRequests.get(requestKey);
  
  if (activeRequest) {
    console.log('🔄 Duplicate auth request detected, waiting for existing request to complete...');
    
    // Wait for the existing request to complete and return its result
    activeRequest
      .then((result) => {
        console.log('✅ Existing auth request completed, returning cached result');
        res.json(result);
      })
      .catch((error) => {
        console.log('❌ Existing auth request failed, returning error');
        res.status(error.status || 401).json({
          success: false,
          message: error.message || 'Authentication failed',
          error: process.env.NODE_ENV === 'development' ? error : undefined
        });
      })
      .finally(() => {
        // Clean up the active request
        activeAuthRequests.delete(requestKey);
      });
    
    return; // Don't call next(), we're handling this request
  }

  // Create a promise for this request
  const requestPromise = new Promise((resolve, reject) => {
    // Store the resolve/reject functions on the request object
    (req as any).authResolve = resolve;
    (req as any).authReject = reject;
    (req as any).authRequestKey = requestKey;
  });

  // Store the promise
  activeAuthRequests.set(requestKey, requestPromise);
  
  console.log(`🔐 New auth request started with key: ${requestKey}`);
  
  // Continue to the actual auth handler
  next();
};

/**
 * Middleware to complete the auth deduplication process
 * Should be called after the auth logic is complete
 */
export const completeAuthRequest = (req: Request, result: any, error?: any) => {
  const authResolve = (req as any).authResolve;
  const authReject = (req as any).authReject;
  const requestKey = (req as any).authRequestKey;

  if (authResolve && authReject) {
    if (error) {
      authReject(error);
    } else {
      authResolve(result);
    }
  }

  // Clean up
  if (requestKey) {
    activeAuthRequests.delete(requestKey);
  }
};

export default authDeduplicationMiddleware;
