# 🧪 Test Your App Flow RIGHT NOW

Follow these steps to test the complete registration flow.

---

## 📱 Step-by-Step Testing

### **1. Open Your App**

Make sure both are running:
- ✅ Backend: `cd backend && npm run dev`
- ✅ Frontend: `npm start` (in root folder)

---

### **2. Sign Up in the App**

In your React Native app:

1. Navigate to **Sign Up screen**
2. Fill in:
   - **Name**: `Lucky Pius`
   - **Email**: `test@example.com` (or ANY email)
   - **Password**: `password123`
3. Click **"Sign Up"** button

**Expected Result**: 
- ✅ Alert: "Verification code sent to your email"
- ✅ App automatically moves to **OTP Input Screen**

---

### **3. Get OTP from Backend Console**

1. **Look at your backend terminal** (where `npm run dev` is running)
2. You should see:
   ```
   ✅ OTP email sent successfully to test@example.com
   ```
   OR (if email fails):
   ```
   ⚠️  Email not configured. OTP for test@example.com: 123456
   ```

3. **Copy the 6-digit OTP code** from the console

---

### **4. Enter OTP in App**

1. You should now be on the **"Verify Email"** screen
2. Enter the **6-digit OTP** from the console
3. Click **"Verify"** button

**Expected Result**:
- ✅ OTP verified
- ✅ User logged in
- ✅ App automatically moves to **VoIP Assignment Screen**

---

### **5. Assign VoIP Number**

1. You should see the **"Assign VoIP Number"** screen
2. Click **"Continue"** button

**Expected Result**:
- ✅ VoIP number assigned (e.g., +1 (555) 123-4567)
- ✅ Alert: "Your VoIP number has been assigned"
- ✅ App automatically navigates to **Dashboard (Home Screen)**

---

### **6. You're In! 🎉**

You should now be on your main **Dashboard/Home Screen**!

---

## ✅ Complete Flow Summary

```
Sign Up Screen
     ↓
[Click Sign Up]
     ↓
OTP Input Screen ← (You should see this automatically!)
     ↓
[Enter OTP from console]
     ↓
[Click Verify]
     ↓
VoIP Assignment Screen ← (Automatic!)
     ↓
[Click Continue]
     ↓
Dashboard/Home Screen ← (Your main app screen!)
```

---

## 🐛 Troubleshooting

### **Issue**: App doesn't move to OTP screen after signup
**Check**: Look for errors in React Native console
**Fix**: Make sure `setStep('otp')` is being called

### **Issue**: "Invalid OTP" error
**Check**: Make sure you copied the exact 6-digit code from backend console
**Try**: Click "Resend Code" and get a fresh OTP

### **Issue**: Stuck on VoIP screen
**Check**: Backend console for errors
**Fix**: Make sure backend is running and MongoDB is connected

### **Issue**: Not navigating to dashboard
**Check**: Make sure `navigation.navigate('MainTabs')` exists in your navigation
**Fix**: Check navigation.tsx for 'MainTabs' route

---

## 📧 About Email (For Later)

**Current Status**: 
- ✅ Emails ARE being sent successfully
- ❌ Gmail might be filtering them

**Where to Check**:
1. Gmail "All Mail" folder
2. Spam/Junk folder
3. Search Gmail for: `from:piuslucky469@gmail.com`
4. Check Promotions/Updates tabs

**For Now**: 
- Use OTP from console for testing
- Email issue is a Gmail filtering problem, not your code!

---

## 🎯 Quick Test Commands

### Delete test user and start fresh:
```bash
mongosh lingua_call --eval "db.users.deleteMany({email: 'test@example.com'})"
```

### Check backend is running:
```bash
curl http://localhost:5000/health
```

### Test registration from terminal:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"password123"}'
```

---

## ✅ Success Checklist

- [ ] Backend running on port 5000
- [ ] Frontend running in Expo
- [ ] Signed up with name, email, password
- [ ] App moved to OTP screen automatically
- [ ] Got OTP from backend console
- [ ] Entered OTP and verified successfully
- [ ] App moved to VoIP screen automatically
- [ ] Assigned VoIP number
- [ ] App navigated to Dashboard
- [ ] ✅ YOU'RE IN!

---

**Ready to test? Go for it!** 🚀

The navigation flow is already perfect - just follow the steps above!


