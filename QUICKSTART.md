# LinguaAICall - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or MongoDB Atlas account)
- iOS Simulator or Android Emulator (or Expo Go on physical device)

---

## Step 1: Run Setup Script

```bash
chmod +x setup.sh
./setup.sh
```

This will:
- ✅ Install all frontend dependencies
- ✅ Install all backend dependencies
- ✅ Create backend `.env` file
- ✅ Check MongoDB status

---

## Step 2: Start MongoDB

### Option A: Local MongoDB
```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Option B: MongoDB Atlas (Cloud)
1. Create account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get connection string
4. Update `backend/.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/linguacall
   ```

---

## Step 3: Start Backend

```bash
cd backend
npm run dev
```

You should see:
```
🚀 Server running in development mode on port 5000
📱 API available at http://localhost:5000
```

---

## Step 4: Update API URL (Important!)

### For iOS Simulator:
No changes needed! Already configured for `localhost`.

### For Android Emulator:
Edit `/services/api.ts`:
```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://10.0.2.2:5000/api' // Android emulator
  : 'https://your-production-api.com/api';
```

### For Physical Device:
1. Find your computer's IP:
   ```bash
   # macOS/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Windows
   ipconfig
   ```

2. Update `/services/api.ts`:
   ```typescript
   const API_BASE_URL = __DEV__ 
     ? 'http://YOUR_LOCAL_IP:5000/api' // e.g., http://192.168.1.100:5000/api
     : 'https://your-production-api.com/api';
   ```

---

## Step 5: Start Frontend

Open a new terminal:
```bash
npm start
```

Then:
- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan QR code with Expo Go app on physical device

---

## Step 6: Test the App

### Test Sign Up:
1. Open the app → Navigate to Sign Up
2. Fill in:
   - Name: `John Doe`
   - Email: `test@example.com`
   - Password: `password123`
3. Click "Sign Up"
4. **Check backend console for OTP** (e.g., `OTP for test@example.com: 123456`)
5. Enter OTP in the app
6. Complete VoIP number assignment

### Test Login:
1. Click "Log in"
2. Enter email and password
3. Click "Log in"
4. You should see the main dashboard

---

## ✅ Verification Checklist

- [ ] Backend running on port 5000
- [ ] MongoDB connected
- [ ] Frontend running in Expo
- [ ] Can register new user
- [ ] Can see OTP in backend console
- [ ] Can verify OTP
- [ ] Can login with credentials
- [ ] Can see user dashboard

---

## 🐛 Common Issues

### "Network request failed"
- Make sure backend is running
- Check API URL matches your setup (localhost vs IP address)
- On physical device, ensure same WiFi network

### "MongoDB connection error"
- Start MongoDB: `brew services start mongodb-community`
- Or use MongoDB Atlas connection string

### "OTP not showing"
- OTP is printed in backend console (terminal)
- Look for: `OTP for email@example.com: 123456`

### Backend not starting
- Check if port 5000 is already in use
- Update `PORT` in `backend/.env`

---

## 📚 Next Steps

- Read [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for detailed documentation
- Customize the UI in `/screens`
- Add more API endpoints in `/backend/src/routes`
- Configure email sending for OTPs
- Add more features!

---

## 🆘 Need Help?

1. Check backend console for errors
2. Check React Native console for errors
3. Review [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
4. Check MongoDB connection

Happy coding! 🎉


