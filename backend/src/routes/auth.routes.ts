import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { generateJWT } from '../middleware/auth.middleware';
import { IUser } from '../models/user.model';
import { adminAuth } from '../config/firebase-admin';
import User from '../models/user.model';
import Task from '../models/task.model';
import crypto from 'crypto';
import authDeduplicationMiddleware, { completeAuthRequest } from '../middleware/auth-deduplication.middleware';
import multer from 'multer';
import path from 'path';
// Use Cloudinary for profile picture storage
import { v2 as cloudinary } from 'cloudinary';
import { migrateProfilePictures } from '../utils/migrate-profile-pictures';

// Configure Cloudinary
console.log('✅ Cloudinary configured successfully');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  },
});

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
          profilePicture: user.profilePicture,
          bio: user.bio,
          phone: user.phone,
          location: user.location,
          googleId: user.googleId
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

    // Verify the Firebase ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    console.log('✅ Token verified for user:', decodedToken.email);

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

    if (!user) {
      console.log('👤 Creating new user...');
      // Create new user with proper error handling
      const newUserData: any = {
        email,
        displayName: name || email.split('@')[0],
        firebaseUid: uid
      };
      
      // Only set profile picture if one is provided from Firebase
      if (picture) {
        newUserData.profilePicture = picture;
      }
      
      // Only add googleId if it exists (for Google auth users)
      if (googleId) {
        newUserData.googleId = googleId;
      }
      
      user = new User(newUserData);
      
      // console.log('💾 Firebase Auth: User object before saving:', user); // Added log

      try {
        await user.save();
        console.log('✅ New user created:', user.email);
      } catch (saveError: any) {
        if (saveError.code === 11000) {
          console.log('🔍 Duplicate user detected, finding existing user...');
          
          // Extract the field that caused the duplicate key error
          const duplicateField = Object.keys(saveError.keyPattern || {})[0];
          
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

          // Update display name if it has changed in Firebase (only if user hasn't customized it)
          if (name && name !== user.displayName) {
            // Only update display name if it's still the default format (email prefix)
            const defaultDisplayName = user.email.split('@')[0];
            if (user.displayName === defaultDisplayName || !user.displayName) {
              user.displayName = name;
              needsUpdate = true;
            }
          }

          // For Google users: NEVER update profile picture from Firebase if they have any custom picture
          // This prevents Firebase sync from overwriting user-uploaded profile pictures
          const hasExistingProfilePicture = user.profilePicture && user.profilePicture.trim() !== '';
          const isCustomProfilePicture = hasExistingProfilePicture && 
                                       user.profilePicture && 
                                       (!user.profilePicture.includes('googleusercontent.com') || 
                                        user.profilePicture.includes('cloudinary.com') ||
                                        user.profilePicture.startsWith('data:'));
          
          console.log('🖼️ Firebase Auth (Duplicate Key): Profile picture analysis:', {
            hasFirebasePicture: !!picture,
            hasExistingPicture: hasExistingProfilePicture,
            isCustomPicture: isCustomProfilePicture,
            isGoogleUser: !!googleId,
            currentPicturePreview: user.profilePicture?.substring(0, 80)
          });
          
          // For Google users: NEVER override profile picture if they have ANY existing picture
          if (googleId && hasExistingProfilePicture) {
            console.log('🚫 Firebase Auth: Google user has existing profile picture - NEVER override');
          } else if (picture && !hasExistingProfilePicture) {
            console.log('🖼️ Firebase Auth: Setting initial profile picture from Firebase (user has no picture)');
            user.profilePicture = picture;
            needsUpdate = true;
          } else if (hasExistingProfilePicture) {
            console.log('🖼️ Firebase Auth: Preserving existing profile picture (Firebase sync will NOT override)');
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

      // Update display name if it has changed in Firebase (only if user hasn't customized it)
      if (name && name !== user.displayName) {
        // Only update display name if it's still the default format (email prefix)
        const defaultDisplayName = user.email.split('@')[0];
        if (user.displayName === defaultDisplayName || !user.displayName) {
          user.displayName = name;
          needsUpdate = true;
        }
      }

      // Don't auto-update profile picture for existing users - preserve their custom choices
      // For Google users: NEVER override profile picture if they have any existing picture
      const hasExistingProfilePicture = user.profilePicture && user.profilePicture.trim() !== '';
      // console.log('🖼️ Firebase Auth: Profile picture check:', {
      //   hasFirebasePicture: !!picture,
      //   hasExistingPicture: hasExistingProfilePicture,
      //   isGoogleUser: !!googleId,
      //   currentPicturePreview: user.profilePicture?.substring(0, 50)
      // });
      
      // For Google users: NEVER override profile picture if they have ANY existing picture
      if (googleId && hasExistingProfilePicture) {
        console.log('🚫 Firebase Auth: Google user has existing profile picture - NEVER override');
      } else if (picture && !hasExistingProfilePicture) {
        console.log('🖼️ Firebase Auth: Setting initial profile picture from Firebase (user has no picture)');
        user.profilePicture = picture;
        needsUpdate = true;
      } else if (hasExistingProfilePicture) {
        console.log('🖼️ Firebase Auth: Preserving existing profile picture (Firebase sync will NOT override)');
      }
      
      if (needsUpdate) {
        // console.log('💾 Firebase Auth: User object before updating:', user); // Added log
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
        profilePicture: user.profilePicture,
        bio: user.bio,
        phone: user.phone,
        location: user.location,
        googleId: user.googleId
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

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile',
  passport.authenticate('jwt', { session: false }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user as IUser;
      const { displayName, bio, phone, location } = req.body;

      if (!displayName || !displayName.trim()) {
        res.status(400).json({
          success: false,
          message: 'Display name is required'
        });
        return;
      }

      // Prepare update data - simple direct update
      const updateData: any = {
        displayName: displayName.trim()
      };
      
      if (bio !== undefined) updateData.bio = bio.trim();
      if (phone !== undefined) updateData.phone = phone.trim();
      if (location !== undefined) updateData.location = location.trim();

      // Update user in database directly
      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        updateData,
        { new: true }
      );

      if (!updatedUser) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: updatedUser._id,
          email: updatedUser.email,
          displayName: updatedUser.displayName,
          profilePicture: updatedUser.profilePicture,
          bio: updatedUser.bio,
          phone: updatedUser.phone,
          location: updatedUser.location,
          googleId: updatedUser.googleId
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// @route   PUT /api/auth/profile/picture
// @desc    Update user profile picture
// @access  Private
router.put('/profile/picture',
  passport.authenticate('jwt', { session: false }),
  upload.single('profilePicture'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user as IUser;
      const file = req.file;

      console.log('📸 Profile picture update request for user:', user.email);
      console.log('📸 Current user profile picture:', user.profilePicture);

      if (!file) {
        console.log('❌ No file uploaded');
        res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
        return;
      }

      console.log('📸 File received:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      });

      // Upload to Cloudinary
      let profilePictureUrl = '';
      
      try {
        console.log('☁️ Uploading to Cloudinary...');
        
        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              resource_type: 'image',
              folder: 'taskflow/profiles',
              public_id: `user_${user._id}`,
              overwrite: true,
              transformation: [
                { width: 300, height: 300, crop: 'fill', gravity: 'face' },
                { quality: 'auto:good', fetch_format: 'auto' }
              ]
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(file.buffer);
        });

        const cloudinaryResult = uploadResult as any;
        profilePictureUrl = cloudinaryResult.secure_url;
        console.log('✅ Cloudinary upload successful:', profilePictureUrl);
        
      } catch (cloudinaryError: any) {
        console.error('❌ Cloudinary upload failed:', cloudinaryError);
        
        // Provide helpful error message
        let errorMessage = 'Failed to upload profile picture to Cloudinary';
        
        if (cloudinaryError.message?.includes('API') || cloudinaryError.message?.includes('credentials')) {
          errorMessage = 'Cloudinary not configured. Please add your Cloudinary credentials to .env file.';
        } else if (cloudinaryError.message?.includes('Invalid')) {
          errorMessage = 'Invalid image file. Please upload a valid image (JPG, PNG, GIF, WebP).';
        }
        
        res.status(500).json({
          success: false,
          message: errorMessage,
          cloudinaryError: cloudinaryError.message,
          setupInstructions: 'Please add your Cloudinary credentials to the .env file: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET'
        });
        return;
      }
      
      console.log('🔄 Updating user in database...');
      console.log('🔄 User ID:', user._id);
      console.log('🔄 New profile picture URL:', profilePictureUrl);
      
      // Update user in database
      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        { 
          profilePicture: profilePictureUrl,
          updatedAt: new Date() // Force update timestamp
        },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Profile picture updated successfully',
        user: {
          id: updatedUser._id,
          email: updatedUser.email,
          displayName: updatedUser.displayName,
          profilePicture: updatedUser.profilePicture,
          bio: updatedUser.bio,
          phone: updatedUser.phone,
          location: updatedUser.location,
          googleId: updatedUser.googleId
        }
      });
    } catch (error) {
      console.error('Update profile picture error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile picture'
      });
    }
  }
);

// @route   DELETE /api/auth/profile
// @desc    Delete user account and all associated data
// @access  Private
router.delete('/profile',
  passport.authenticate('jwt', { session: false }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user as IUser;

      // Delete all tasks owned by the user
      await Task.deleteMany({ owner: user._id });

      // Remove user from tasks they were shared with
      await Task.updateMany(
        { sharedWith: user._id },
        { $pull: { sharedWith: user._id } }
      );

      // Delete user's profile picture from Cloudinary if it exists
      if (user.profilePicture && user.profilePicture.includes('cloudinary.com')) {
        try {
          const publicId = `taskflow/profiles/user_${user._id}`;
          await cloudinary.uploader.destroy(publicId);
          console.log('🗑️ Profile picture deleted from Cloudinary');
        } catch (cloudinaryError) {
          console.error('Error deleting profile picture from Cloudinary:', cloudinaryError);
          // Continue with account deletion even if picture deletion fails
        }
      }

      // Delete the user from Firebase Auth if firebaseUid exists
      if (user.firebaseUid) {
        try {
          await adminAuth.deleteUser(user.firebaseUid);
          console.log('User deleted from Firebase Auth');
        } catch (firebaseError) {
          console.error('Error deleting user from Firebase:', firebaseError);
          // Continue with database deletion even if Firebase deletion fails
        }
      }

      // Delete user from database
      await User.findByIdAndDelete(user._id);

      console.log(`User account deleted: ${user.email}`);

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      console.error('Delete account error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete account'
      });
    }
  }
);

// @route   POST /api/auth/migrate-profile-pictures
// @desc    Migrate base64 profile pictures to URL-based ones (development only)
// @access  Private (development only)
router.post('/migrate-profile-pictures',
  // Only allow in development
  (req: Request, res: Response, next: NextFunction): void => {
    if (process.env.NODE_ENV !== 'development') {
      res.status(403).json({
        success: false,
        message: 'Migration endpoint only available in development mode'
      });
      return;
    }
    next();
  },
  async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('🚀 Starting profile picture migration...');
      const result = await migrateProfilePictures();
      
      res.json({
        success: true,
        message: 'Profile picture migration completed',
        result
      });
    } catch (error) {
      console.error('Migration error:', error);
      res.status(500).json({
        success: false,
        message: 'Migration failed',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
);

// @route   POST /api/auth/cleanup-ui-avatars
// @desc    Remove UI Avatars URLs from existing users (development only)
// @access  Private (development only)
router.post('/cleanup-ui-avatars',
  // Only allow in development
  (req: Request, res: Response, next: NextFunction): void => {
    if (process.env.NODE_ENV !== 'development') {
      res.status(403).json({
        success: false,
        message: 'This endpoint is only available in development mode'
      });
      return;
    }
    next();
  },
  async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('🧹 Starting UI Avatars cleanup...');
      
      // Find all users with UI Avatars URLs
      const usersWithUIAvatars = await User.find({
        profilePicture: { $regex: /ui-avatars\.com/ }
      });
      
      console.log(`📊 Found ${usersWithUIAvatars.length} users with UI Avatars`);
      
      let cleanedCount = 0;
      
      for (const user of usersWithUIAvatars) {
        try {
          await User.findByIdAndUpdate(user._id, {
            profilePicture: ''
          });
          
          console.log(`✅ Cleaned UI Avatar for user ${user.email}: ${user.displayName}`);
          cleanedCount++;
        } catch (error) {
          console.error(`❌ Failed to clean UI Avatar for user ${user.email}:`, error);
        }
      }
      
      console.log(`🎉 UI Avatars cleanup completed! ${cleanedCount}/${usersWithUIAvatars.length} users cleaned`);
      
      res.json({
        success: true,
        message: 'UI Avatars cleanup completed',
        result: { total: usersWithUIAvatars.length, cleaned: cleanedCount }
      });
    } catch (error) {
      console.error('❌ UI Avatars cleanup failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cleanup UI Avatars'
      });
    }
  }
);

export default router;
