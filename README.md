# 🌐 LinguaAICall

A React Native mobile application with Express.js backend for AI-powered language calling and translation.

![Status](https://img.shields.io/badge/status-active-success.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [Development](#development)
- [Contributing](#contributing)

---

## 🎯 Overview

LinguaAICall is a mobile application that enables users to make AI-powered calls with real-time language translation. The app features user authentication, VoIP number assignment, credit management, and chat functionality.

---

## ✨ Features

### Current Features
- ✅ **User Authentication**
  - Email/Phone registration
  - OTP verification
  - JWT-based authentication
  - Secure password hashing
  - Persistent login sessions

- ✅ **VoIP Integration**
  - Automatic phone number assignment
  - Unique number generation

- ✅ **User Management**
  - User profiles
  - Credit system
  - Language preferences

### Coming Soon
- 🚧 AI-powered voice calls
- 🚧 Real-time translation
- 🚧 Chat messaging
- 🚧 Call history
- 🚧 Payment integration

---

## 🛠 Tech Stack

### Frontend
- **React Native** - Mobile app framework
- **Expo** - Development and build toolchain
- **TypeScript** - Type-safe development
- **Axios** - HTTP client
- **AsyncStorage** - Local data persistence
- **React Navigation** - App navigation

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **Express Validator** - Input validation

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- iOS Simulator / Android Emulator / Expo Go app

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd LinguaAICall
   ```

2. **Run the setup script**
   ```bash
   ./setup.sh
   ```
   This installs all dependencies and creates the backend `.env` file.

3. **Start MongoDB**
   ```bash
   # macOS
   brew services start mongodb-community
   
   # or use Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

4. **Start the backend** (Terminal 1)
   ```bash
   cd backend
   npm run dev
   ```

5. **Start the frontend** (Terminal 2)
   ```bash
   npm start
   ```

6. **Run the app**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan QR code with Expo Go on physical device

📚 **For detailed setup instructions, see [QUICKSTART.md](./QUICKSTART.md)**

---

## 📁 Project Structure

```
LinguaAICall/
├── backend/                  # Backend API
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── controllers/     # Route controllers
│   │   ├── middleware/      # Custom middleware
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Utility functions
│   │   ├── app.ts           # Express app setup
│   │   └── server.ts        # Server entry point
│   ├── .env.example         # Environment variables template
│   ├── package.json
│   └── tsconfig.json
│
├── screens/                 # App screens
│   ├── OnboardingScreen.tsx
│   ├── SignUpScreen.tsx
│   ├── DashboardScreen.tsx
│   ├── CallScreen.tsx
│   ├── ChatScreen.tsx
│   ├── ChatsScreen.tsx
│   ├── CreditsScreen.tsx
│   └── SettingsScreen.tsx
│
├── contexts/                # React contexts
│   └── AuthContext.tsx      # Authentication context
│
├── components/              # Reusable components
│   └── LoadingScreen.tsx
│
├── services/                # API services
│   └── api.ts               # API client and endpoints
│
├── config/                  # App configuration
│   └── constants.ts         # App constants
│
├── navigation.tsx           # Navigation setup
├── App.tsx                  # App entry point
├── package.json
└── tsconfig.json
```

---

## 📚 Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - 5-minute setup guide
- **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)** - Detailed integration documentation
- **[INTEGRATION_SUMMARY.md](./INTEGRATION_SUMMARY.md)** - Summary of integration work

---

## 💻 Development

### Backend Development

```bash
cd backend

# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Frontend Development

```bash
# Start Expo development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on web
npm run web
```

### Environment Variables

Backend requires a `.env` file (created automatically by setup script):

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/linguacall
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
```

---

## 🔐 API Endpoints

### Authentication
```
POST   /api/auth/register      - Register new user
POST   /api/auth/login         - Login user
POST   /api/auth/verify-otp    - Verify OTP
POST   /api/auth/resend-otp    - Resend OTP
POST   /api/auth/assign-voip   - Assign VoIP number (protected)
```

### User
```
GET    /api/user/profile       - Get user profile (protected)
PUT    /api/user/profile       - Update user profile (protected)
```

### Chat
```
GET    /api/chat              - Get all chats (protected)
GET    /api/chat/:id          - Get specific chat (protected)
POST   /api/chat/:id/message  - Send message (protected)
```

### Call
```
POST   /api/call/initiate     - Initiate call (protected)
GET    /api/call/history      - Get call history (protected)
POST   /api/call/:id/end      - End call (protected)
```

### Credit
```
GET    /api/credit            - Get credits (protected)
POST   /api/credit/purchase   - Purchase credits (protected)
```

---

## 🧪 Testing

### Test User Registration
1. Open the app and navigate to Sign Up
2. Fill in the form
3. Check backend console for OTP
4. Enter OTP to verify
5. Complete VoIP assignment

### Test Login
1. Use registered credentials
2. Login should work and persist

### Verify Integration
```bash
# Test backend health
curl http://localhost:5000/health

# Test registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
```

---

## 🚧 Troubleshooting

### Common Issues

**Network Request Failed**
- Check backend is running on correct port
- For Android Emulator: Use `http://10.0.2.2:5000/api`
- For physical device: Use your computer's local IP

**MongoDB Connection Error**
- Ensure MongoDB is running: `brew services start mongodb-community`
- Check `MONGODB_URI` in `backend/.env`

**OTP Not Showing**
- OTP is printed in the backend console during development
- Look for: `OTP for email@example.com: 123456`

See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for more troubleshooting tips.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- React Native community
- Express.js team
- MongoDB team
- All contributors

---

## 📞 Contact

For questions or support, please open an issue in the repository.

---

**Happy Coding!** 🎉


