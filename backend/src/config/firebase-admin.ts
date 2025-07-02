import admin from 'firebase-admin';
import fs from 'fs'; // ✅ Add this import
import path from 'path'; // You can remove this if not used elsewhere

// Initialize Firebase Admin with service account credentials
if (!admin.apps.length) {
  try {
    // ✅ Load from environment variables (Render best practice)
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      const serviceAccount = {
        type: 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID || 'todo-5adbc',
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL?.replace('@', '%40')}`,
        universe_domain: 'googleapis.com'
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || 'todo-5adbc'
      });

      console.log('✅ Firebase Admin initialized with environment variables');
    } else {
      // ✅ Fallback to Render Secret File
      const serviceAccountPath = '/etc/secrets/todo-5adbc-firebase-adminsdk-fbsvc-6b585fa60d.json';
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });

      console.log('✅ Firebase Admin initialized with service account file:', serviceAccountPath);
    }
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error);

    // ⚠️ Final fallback (bare minimum for development)
    try {
      admin.initializeApp({
        projectId: 'todo-5adbc'
      });
      console.log('⚠️ Firebase Admin initialized with minimal config');
    } catch (fallbackError) {
      console.error('❌ Firebase Admin fallback initialization also failed:', fallbackError);
    }
  }
}

export const adminAuth = admin.auth();
export default admin;
