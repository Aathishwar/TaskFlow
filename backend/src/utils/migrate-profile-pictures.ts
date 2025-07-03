import mongoose from 'mongoose';
import User from '../models/user.model';

// Simple migration script to convert base64 profile pictures to URL-based ones
export async function migrateProfilePictures() {
  try {
    console.log('🔄 Starting profile picture migration...');
    
    // Find all users with base64 profile pictures
    const usersWithBase64 = await User.find({
      profilePicture: { $regex: /^data:image/ }
    });
    
    console.log(`📊 Found ${usersWithBase64.length} users with base64 profile pictures`);
    
    let migratedCount = 0;
    
    for (const user of usersWithBase64) {
      try {
        // Remove base64 profile pictures - they can upload new ones via Firebase Storage
        // Don't set any fallback URL
        await User.findByIdAndUpdate(user._id, {
          profilePicture: ''
        });
        
        console.log(`✅ Migrated user ${user.email}: ${user.displayName}`);
        migratedCount++;
      } catch (error) {
        console.error(`❌ Failed to migrate user ${user.email}:`, error);
      }
    }
    
    console.log(`🎉 Migration completed! ${migratedCount}/${usersWithBase64.length} users migrated`);
    return { total: usersWithBase64.length, migrated: migratedCount };
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Add migration endpoint to auth routes
export async function runMigrationEndpoint() {
  return await migrateProfilePictures();
}
