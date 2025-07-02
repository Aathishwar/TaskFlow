import { Router, Request, Response } from 'express';
import passport from 'passport';
import { generateJWT } from '../middleware/auth.middleware';
import { IUser } from '../models/user.model';
import { adminAuth } from '../config/firebase-admin';
import User from '../models/user.model';
import crypto from 'crypto';
import authDeduplicationMiddleware, { completeAuthRequest } from '../middleware/auth-deduplication.middleware';

const router = Router();

// @route   GET /api/auth/google
// @desc    Start Google OAuth flow
// @access  Public
router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);

// @route   GET /api/auth/google/callback
// @desc    Google OAuth callback
// @access  Public
router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  (req: Request, res: Response) => {
    try {
      const user = req.user as IUser;
      
      if (!user) {
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=authentication_failed`);
      }
      
      // Generate JWT token
      const token = generateJWT(user._id.toString());
      
      // Redirect to frontend with token
      res.redirect(`${process.env.FRONTEND_URL}/dashboard?token=${token}`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
    }
  }
);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', 
  passport.authenticate('jwt', { session: false }),
  (req: Request, res: Response) => {
    try {
      const user = req.user as IUser;
      res.json({
        success: true,
        user: {
          id: user._id,
          email: user.email,
          displayName: user.displayName,
          profilePicture: user.profilePicture
        }
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// @route   POST /api/auth/firebase
// @desc    Authenticate with Firebase ID token
// @access  Public
router.post('/firebase', authDeduplicationMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      const error = { status: 400, message: 'ID token is required' };
      completeAuthRequest(req, null, error);
      res.status(400).json({
        success: false,
        message: 'ID token is required'
      });
      return;
    }

    console.log('🔐 Verifying Firebase ID token...');

    // Verify the Firebase ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    console.log('✅ Token verified successfully');
    console.log('👤 Firebase Auth: Decoded token:', { // Added log
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      firebase: decodedToken.firebase
    });

    const { uid, email, name, picture, firebase } = decodedToken;

    if (!email) {
      const error = { status: 400, message: 'Email is required' };
      completeAuthRequest(req, null, error);
      res.status(400).json({
        success: false,
        message: 'Email is required'
      });
      return;
    }

    // Extract Google ID from Firebase identities
    let googleId: string | undefined;
    if (firebase?.identities?.['google.com']) {
      googleId = firebase.identities['google.com'][0];
      console.log('🆔 Firebase Auth: Extracted Google ID:', googleId); // Added log
    } else {
      // For email/password users, don't set googleId to avoid duplicate key issues
      console.log('🆔 Firebase Auth: No Google identity found, leaving googleId undefined');
    }

    // Check if user exists in database
    // Prioritize firebaseUid lookup, then email
    let user = await User.findOne({ 
      $or: [
        { firebaseUid: uid },
        { email },
        ...(googleId ? [{ googleId }] : [])
      ]
    });

    console.log('🔍 Firebase Auth: Initial user lookup result:', user ? user.email : 'Not found'); // Added log

    if (!user) {
      console.log('👤 Creating new user...');
      // Create new user with proper error handling
      const newUserData = {
        email,
        displayName: name || email.split('@')[0],
        profilePicture: picture || '',
        firebaseUid: uid,
        ...(googleId && { googleId }) // Only add googleId if it exists
      };
      
      user = new User(newUserData);
      
      console.log('💾 Firebase Auth: User object before saving:', user); // Added log

      try {
        await user.save();
        console.log('✅ New user created successfully:', user._id); // Added log
      } catch (saveError: any) {
        console.error('❌ Firebase Auth: Error saving new user:', saveError); // Added log
        if (saveError.code === 11000) {
          console.log('🔍 Duplicate key error, attempting to find existing user...');
          
          // Extract the field that caused the duplicate key error
          const duplicateField = Object.keys(saveError.keyPattern || {})[0];
          console.log('🔍 Duplicate field detected:', duplicateField);
          
          // Try to find the existing user with a more targeted search
          const searchCriteria: any = {};
          if (duplicateField === 'email') {
            searchCriteria.email = email;
          } else if (duplicateField === 'firebaseUid') {
            searchCriteria.firebaseUid = uid;
          } else if (duplicateField === 'googleId' && googleId) {
            searchCriteria.googleId = googleId;
          } else {
            // Fallback to original search
            searchCriteria.$or = [
              { email },
              { firebaseUid: uid },
              ...(googleId ? [{ googleId }] : [])
            ];
          }
          
          user = await User.findOne(searchCriteria);
          
          console.log('🔍 Firebase Auth: User lookup after duplicate key error:', user ? user.email : 'Not found'); // Added log

          if (!user) {
            const error = { status: 500, message: 'User creation failed due to duplicate key but user not found' };
            completeAuthRequest(req, null, error);
            throw new Error('User creation failed due to duplicate key but user not found');
          }
          
          // Update the found user with missing fields
          let needsUpdate = false;
          if (!user.firebaseUid && uid) {
            user.firebaseUid = uid;
            needsUpdate = true;
          }
          if (!user.googleId && googleId) {
            user.googleId = googleId;
            needsUpdate = true;
          }
          
          // Update email if it has changed in Firebase
          if (email && email !== user.email) {
            user.email = email;
            needsUpdate = true;
          }

          // Update display name if it has changed in Firebase
          if (name && name !== user.displayName) {
            user.displayName = name;
            needsUpdate = true;
          }

          // Update profile picture if newer
          if (picture && picture !== user.profilePicture) {
            user.profilePicture = picture;
            needsUpdate = true;
          }
          
          if (needsUpdate) {
            console.log('💾 Firebase Auth: User object before updating after duplicate key:', user); // Added log
            try {
              await user.save();
              console.log('✅ Updated existing user with new identifiers');
            } catch (updateError) {
              console.log('⚠️ User update failed (non-critical):', updateError);
            }
          }
        } else {
          throw saveError;
        }
      }
    } else {
      console.log('👤 User found, updating identifiers and profile info if needed...');
      // Update missing identifiers and profile info
      let needsUpdate = false;
      
      if (!user.firebaseUid && uid) {
        user.firebaseUid = uid;
        needsUpdate = true;
      }
      
      if (!user.googleId && googleId) {
        user.googleId = googleId;
        needsUpdate = true;
      }
      
      // Update email if it has changed in Firebase
      if (email && email !== user.email) {
        user.email = email;
        needsUpdate = true;
      }

      // Update display name if it has changed in Firebase
      if (name && name !== user.displayName) {
        user.displayName = name;
        needsUpdate = true;
      }

      // Update profile picture if newer
      if (picture && picture !== user.profilePicture) {
        user.profilePicture = picture;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        console.log('💾 Firebase Auth: User object before updating:', user); // Added log
        try {
          await user.save();
          console.log('✅ User updated successfully');
        } catch (updateError) {
          console.log('⚠️ User update failed (non-critical):', updateError);
        }
      }
    }

    // Ensure user object is available before generating token
    if (!user) {
        console.error('❌ Firebase Auth: User object is null after authentication process.');
        const error = { status: 500, message: 'Internal server error: User not found or created.' };
        completeAuthRequest(req, null, error);
        res.status(500).json({
            success: false,
            message: 'Internal server error: User not found or created.'
        });
        return;
    }

    // Generate JWT token
    const token = generateJWT(user._id.toString());

    console.log('✅ Authentication successful for user:', user.email);

    const result = {
      success: true,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        profilePicture: user.profilePicture
      },
      token
    };

    // Complete the auth request for deduplication
    completeAuthRequest(req, result);

    res.json(result);
  } catch (error) {
    console.error('❌ Firebase authentication error:', error);
    const errorResponse = {
      success: false,
      message: 'Invalid Firebase token',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    };
    
    // Complete the auth request with error
    completeAuthRequest(req, null, { status: 401, message: 'Invalid Firebase token' });
    
    res.status(401).json(errorResponse);
  }
});

export default router;
