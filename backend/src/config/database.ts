import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      console.warn('⚠️  MONGODB_URI environment variable is not defined');
      console.log('💡 Please set up MongoDB connection or use MongoDB Atlas');
      return;
    }

    console.log('🔄 Connecting to MongoDB Atlas...'); 
    
    // Add connection options to improve reliability
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000, // 5 second timeout
      socketTimeoutMS: 45000, // 45 second socket timeout
      maxPoolSize: 10, // Maximum number of connections
      retryWrites: true,
      w: 'majority'
    });
    
    console.log(`🍃 MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    console.log(`✅ Connection state: ${conn.connection.readyState}`);
    
    // Test the connection with a simple query
    if (conn.connection.db) {
      const collections = await conn.connection.db.listCollections().toArray();
      console.log(`📁 Available collections: ${collections.length > 0 ? collections.map(c => c.name).join(', ') : 'None (new database)'}`);
    }
  } catch (error) {
    console.error('❌ MongoDB Atlas connection failed!');
    
    // Provide specific error diagnosis
    if (error instanceof Error) {
      if (error.message.includes('IP') || error.message.includes('ECONNREFUSED')) {
        console.log('🚨 NETWORK/IP WHITELIST ISSUE DETECTED!');
        console.log('📋 SOLUTION STEPS:');
        console.log('   1. Go to https://cloud.mongodb.com');
        console.log('   2. Select your project and cluster');
        console.log('   3. Go to "Network Access" in the left sidebar');
        console.log('   4. Click "Add IP Address"');
        console.log('   5. Click "Allow access from anywhere" (0.0.0.0/0)');
        console.log('   6. Click "Confirm"');
        console.log('   7. Wait 2-3 minutes for changes to apply');
        console.log('   8. Check your internet connection and firewall settings');
      } else if (error.message.includes('authentication')) {
        console.log('🚨 AUTHENTICATION ISSUE DETECTED!');
        console.log('📋 Check your username/password in the connection string');
      } else if (error.message.includes('SSL') || error.message.includes('TLS')) {
        console.log('🚨 SSL/TLS ISSUE DETECTED!');
        console.log('📋 This might be a network or firewall issue');
      }
      
      console.log(`🔍 Error details: ${error.message}`);
    }
    
    // Skip local MongoDB fallback to avoid further connection attempts
    console.log('\n⚠️  CONTINUING WITHOUT DATABASE CONNECTION');
    console.log('💡 Backend API endpoints will work with in-memory data');
    console.log('💡 Data won\'t persist between server restarts');
    console.log('🎯 Focus on fixing MongoDB Atlas connection for production');
    
    // Prevent mongoose from attempting further connections
    mongoose.connection.removeAllListeners();
  }
};

// Handle connection events with better error handling
mongoose.connection.on('connected', () => {
  console.log('🍃 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err.message);
  // Don't exit the process, just log the error
});

mongoose.connection.on('disconnected', () => {
  console.log('🍃 Mongoose disconnected');
  // Don't attempt to reconnect automatically to avoid loops
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('🍃 Mongoose connection closed through app termination');
  } catch (error) {
    console.log('🍃 Mongoose connection already closed');
  }
  process.exit(0);
});
