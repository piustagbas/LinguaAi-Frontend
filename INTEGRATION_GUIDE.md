# LinguaAICall - Frontend-Backend Integration Guide

This guide will help you integrate your React Native frontend with the Express backend.

## Table of Contents
1. [Backend Setup](#backend-setup)
2. [Frontend Setup](#frontend-setup)
3. [Testing the Integration](#testing-the-integration)
4. [API Endpoints](#api-endpoints)
5. [Troubleshooting](#troubleshooting)

---

## Backend Setup

### Step 1: Install Backend Dependencies
```bash
cd backend
npm install
```

### Step 2: Configure Environment Variables
1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/linguacall
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRES_IN=7d
   ```

### Step 3: Start MongoDB
Make sure MongoDB is running on your machine:
```bash
# Using Homebrew on macOS
brew services start mongodb-community

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Step 4: Start Backend Server
```bash
npm run dev
```

The backend should now be running on `http://localhost:5000`

You should see:
```
🚀 Server running in development mode on port 5000
📱 API available at http://localhost:5000
🔗 Health check: http://localhost:5000/health
```

### Step 5: Verify Backend is Running
Test the health check endpoint:
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "success",
  "message": "LinguaCall API is running",
  "timestamp": "2025-10-09T..."
}
```

---

## Frontend Setup

### Step 1: Install Frontend Dependencies
```bash
cd .. # Back to project root
npm install
```

This will install:
- `axios` - For making HTTP requests
- `@react-native-async-storage/async-storage` - For storing tokens and user data

### Step 2: Configure API Base URL

The API base URL is already configured in `/services/api.ts`:

- **iOS Simulator**: Uses `http://localhost:5000/api`
- **Android Emulator**: Change to `http://10.0.2.2:5000/api`
- **Physical Device**: Use your computer's local IP address (e.g., `http://192.168.1.100:5000/api`)

#### To find your local IP:
```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig
```

Then update `/services/api.ts`:
```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://YOUR_LOCAL_IP:5000/api' // e.g., 'http://192.168.1.100:5000/api'
  : 'https://your-production-api.com/api';
```

### Step 3: Start the React Native App
```bash
npm start
```

Then press:
- `i` for iOS simulator
- `a` for Android emulator
- Scan QR code for physical device with Expo Go app

---

## Testing the Integration

### Test 1: Sign Up Flow
1. Open the app and navigate to the Sign Up screen
2. Fill in the form:
   - Name: "John Doe"
   - Email: "john@example.com"
   - Password: "password123"
3. Click "Sign Up"
4. Check the backend console for the OTP code
5. Enter the OTP to verify your account
6. Complete the VoIP number assignment

### Test 2: Login Flow
1. Return to Sign Up screen and click "Log in"
2. Enter the email and password you registered with
3. Click "Log in"
4. You should be redirected to the main dashboard

### Test 3: Backend Console
Watch the backend console for requests:
```
POST /api/auth/register 201 - 245ms
POST /api/auth/verify-otp 200 - 120ms
POST /api/auth/login 200 - 189ms
```

### Test 4: Check MongoDB
Verify user is created in the database:
```bash
# Connect to MongoDB
mongosh

# Switch to linguacall database
use linguacall

# Find all users
db.users.find().pretty()
```

---

## API Endpoints

### Authentication Endpoints

#### 1. Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1234567890" // optional
}
```

#### 2. Verify OTP
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "123456"
}
```

#### 3. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### 4. Resend OTP
```http
POST /api/auth/resend-otp
Content-Type: application/json

{
  "email": "john@example.com"
}
```

#### 5. Assign VoIP Number
```http
POST /api/auth/assign-voip
Authorization: Bearer YOUR_JWT_TOKEN
```

### User Endpoints

#### Get Profile
```http
GET /api/user/profile
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Update Profile
```http
PUT /api/user/profile
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "John Updated",
  "preferredLanguages": ["en", "es"]
}
```

---

## Troubleshooting

### Issue 1: Network Request Failed
**Problem**: Cannot connect to backend from mobile app

**Solutions**:
1. **iOS Simulator**: Use `http://localhost:5000/api`
2. **Android Emulator**: Use `http://10.0.2.2:5000/api`
3. **Physical Device**: 
   - Use your computer's local IP (e.g., `http://192.168.1.100:5000/api`)
   - Make sure your device and computer are on the same WiFi network
   - Disable firewall temporarily to test

### Issue 2: CORS Errors
**Problem**: CORS policy blocking requests

**Solution**: The backend is already configured to accept requests from React Native. If you still have issues, check that the backend is running and accessible.

### Issue 3: JWT Token Invalid
**Problem**: "Invalid token" or "Token expired" errors

**Solution**:
1. Clear AsyncStorage:
   ```javascript
   import AsyncStorage from '@react-native-async-storage/async-storage';
   await AsyncStorage.clear();
   ```
2. Restart the app
3. Login again

### Issue 4: MongoDB Connection Error
**Problem**: "Failed to connect to MongoDB"

**Solutions**:
1. Make sure MongoDB is running:
   ```bash
   brew services start mongodb-community
   ```
2. Check `MONGODB_URI` in `.env`
3. Try using MongoDB Atlas (cloud database) instead of local

### Issue 5: OTP Not Received
**Problem**: OTP code not showing up

**Solution**: 
- In development, the OTP is printed in the backend console
- Check your backend terminal for a log like: `OTP for john@example.com: 123456`
- To send actual emails, configure the email settings in `.env`

---

## Next Steps

### 1. Implement Email Sending
To send actual OTP emails, add this to your backend:

```bash
npm install nodemailer
```

Update `authController.ts` to send emails instead of logging OTPs.

### 2. Add Error Handling UI
Create a custom Alert/Toast component for better error messages.

### 3. Add Loading States
Improve UX by showing loading spinners during API calls.

### 4. Implement Refresh Tokens
Add refresh token logic for better security.

### 5. Add API Request Logging
Use React Query or SWR for better API state management.

---

## Production Deployment

### Backend Deployment (Heroku, Railway, or Render)
1. Set environment variables in production
2. Update `CLIENT_URL` to your production frontend URL
3. Use MongoDB Atlas for production database
4. Enable HTTPS

### Frontend Deployment
1. Update `API_BASE_URL` to production backend URL
2. Build the app:
   ```bash
   expo build:ios
   expo build:android
   ```
3. Submit to App Store / Play Store

---

## Additional Resources

- [Express Documentation](https://expressjs.com/)
- [React Native Documentation](https://reactnative.dev/)
- [Axios Documentation](https://axios-http.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [JWT Documentation](https://jwt.io/)

---

## Support

If you encounter any issues:
1. Check the backend console for error logs
2. Check the React Native debugger console
3. Verify your environment variables
4. Ensure all dependencies are installed
5. Check MongoDB is running and accessible

Happy coding! 🚀


