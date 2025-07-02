# 🔥 TaskFlow - Multi-User Task Management System

A production-ready, multi-user task management application with real-time collaboration, secure authentication, and complete data isolation between users. Built with React, Node.js, Express, MongoDB, and Socket.io.

## 🌟 Key Features

✅ **Multi-User Support**: Multiple users can use the application simultaneously  
✅ **Data Isolation**: Each user sees only their own tasks  
✅ **Real-time Updates**: Live task updates via WebSocket connections  
✅ **Secure Authentication**: Firebase Authentication with JWT tokens  
✅ **Task Sharing**: Share tasks with other users via email  
✅ **Notifications**: Smart reminders for tasks due soon  
✅ **Profile Management**: Full user profile control with picture upload  
✅ **Production Ready**: Fully configured for deployment  
✅ **Fixed Realtime Issues**: Resolved socket connection and time validation problems 

## 🚀 Production Deployment

- **Netlify**: [Live App](https://astonishing-sfogliatella-579b6f.netlify.app/)
- **Vercel**: [Live App](https://task-flow-frontend-azure.vercel.app/)
## 🎥 Multi-User Demo

📹 **Test with Multiple Users:**
1. Open multiple browser windows/incognito tabs
2. Login with different Firebase accounts
3. Create tasks in each account
4. Verify complete data isolation
5. Test real-time updates and task sharing

## 🎥 Demo Video

📹 [Watch the Loom Demo Video](https://www.loom.com/share/your-video-id)

## 🏗️ Architecture

The application follows a modern microservices architecture:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│   React Client  │────│  Express API    │────│   MongoDB       │
│   (Frontend)    │    │   (Backend)     │    │  (Database)     │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │                       │
         └───────────────────────┘
              WebSocket (Socket.io)
              Real-time Updates
```

### Application Flow:
1. **Authentication**: Users sign in with Firebase Authentication
2. **Task Management**: Create, read, update, delete tasks with CRUD operations
3. **Real-time Updates**: Socket.io enables live task updates across all connected clients
4. **Task Sharing**: Share tasks with other users via email
5. **Responsive UI**: Chakra UI provides a modern, mobile-friendly interface

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Chakra UI** - Component library
- **React Router** - Client-side routing
- **Socket.io Client** - Real-time communication
- **Axios** - HTTP client
- **React Toastify** - Notifications
- **Date-fns** - Date utilities

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **Socket.io** - Real-time communication
- **Firebase Admin SDK** - Authentication
- **JWT** - Token-based authentication
- **Express Validator** - Input validation
- **Express Rate Limit** - API rate limiting

### Authentication & Security
- **Firebase Authentication** - Secure user authentication
- **JWT** - Session management
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - API protection

### Deployment & Infrastructure
- **Netlify** - Frontend hosting
- **Render** - Backend hosting
- **MongoDB Atlas** - Database hosting

## 🚀 Features

### Core Features
✅ **User Authentication**  
✅ **Task CRUD Operations**  
✅ **Real-time Updates**  
✅ **Task Sharing**  
✅ **Responsive Design**  

### Task Management
✅ Title, description, status, priority, due date  
✅ Status: Pending, In Progress, Completed  
✅ Priority: Low, Medium, High  
✅ Due tracking with visual indicators  
✅ Filter by status, priority, search terms  
✅ Pagination support  

### Notifications System
⏰ Alerts 1 hour before due time  
🎯 Only for incomplete tasks  
🔄 Auto-sync across logged-in devices  
💾 Persistent toggle in localStorage  
🔔 Can be toggled in profile settings  
✅ No server-side tracking, browser-only  

### Profile Management
👤 View & edit display name, bio, phone, location  
🖼 Upload profile picture (Cloudinary or base64 fallback)  
🗑 Secure account deletion with full data cleanup  
📦 Settings saved and validated with error handling  
✅ Responsive Chakra UI layout  

### User Experience
✅ Modern UI, toast notifications, form validation, loading states, mobile responsive  


## 📁 Project Structure

```
Katomaran/
├── backend/                 # Node.js/Express backend
│   ├── src/
│   │   ├── config/         # Database and Firebase configuration
│   │   ├── middleware/     # Authentication and validation middleware
│   │   ├── models/         # Mongoose schemas
│   │   ├── routes/         # API route handlers
│   │   ├── socket/         # Socket.io configuration
│   │   └── server.ts       # Express server setup
│   ├── package.json
│   └── tsconfig.json
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # React contexts (Auth, Socket)
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service functions
│   │   ├── types/          # TypeScript type definitions
│   │   ├── utils/          # Utility functions
│   │   └── theme/          # Chakra UI theme configuration
│   ├── package.json
│   └── vite.config.ts
└── README.md              # This file
```

## 🏃‍♂️ Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- MongoDB Atlas account
- Firebase project with Authentication enabled

### 1. Clone the Repository
```bash
git clone <repository-url>
cd TaskFlow
```

### 2. Environment Setup

Create `.env` file in the root directory:
```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/katomaran

# Server Configuration
PORT=5000
HOST=0.0.0.0
NODE_ENV=development

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="your-private-key"
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=your-cert-url

# Client URLs
CLIENT_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. Install Dependencies
```bash
npm run install:all
```

### 4. Start Development Servers
```bash
npm run dev
```

This will start both frontend (port 3000) and backend (port 5000) servers.

## 🔒 Security Features

- **Firebase Authentication** with JWT
- **Rate Limiting** to prevent abuse
- **Input Validation** with Express Validator
- **Security Headers** with Helmet
- **CORS Protection** for cross-origin requests
- **MongoDB Injection Protection** with Mongoose

## 📱 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section above
- Review the API documentation


This project is a part of a hackathon run by https://www.katomaran.com
