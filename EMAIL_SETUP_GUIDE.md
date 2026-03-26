# 📧 Email Setup Guide for LinguaAICall

## ✅ Quick Setup (5 minutes)

Follow these steps to enable real email sending for OTP verification codes.

---

## Step 1: Get Gmail App Password

### Option A: Using Gmail (Recommended)

1. **Go to your Google Account Settings**
   - Visit: https://myaccount.google.com/
   - Or click your profile picture → "Manage your Google Account"

2. **Enable 2-Step Verification** (if not already enabled)
   - Go to Security → 2-Step Verification
   - Click "Get Started"
   - Follow the prompts to set up 2-Step Verification
   - ⚠️ **You MUST have 2-Step Verification enabled to create App Passwords**

3. **Create an App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Or: Security → 2-Step Verification → App passwords (at the bottom)
   - Select app: "Mail"
   - Select device: "Other (Custom name)" → Type: "LinguaAICall"
   - Click "Generate"
   - **Copy the 16-character password** (looks like: `abcd efgh ijkl mnop`)

4. **Save this password** - you'll need it in the next step

---

## Step 2: Update Backend .env File

1. **Open** `/Users/mac/Desktop/LinguaAICall/backend/.env` in your code editor

2. **Update these lines** with your information:
   ```env
   EMAIL_USER=your.email@gmail.com
   EMAIL_PASSWORD=abcd efgh ijkl mnop
   ```

   **Example**:
   ```env
   EMAIL_USER=john.doe@gmail.com
   EMAIL_PASSWORD=abcdefghijklmnop
   ```

3. **Save the file**

---

## Step 3: Restart Backend Server

1. **Stop the current backend server** (Press `Ctrl + C` in the terminal)

2. **Start it again**:
   ```bash
   cd /Users/mac/Desktop/LinguaAICall/backend
   npm run dev
   ```

3. You should see:
   ```
   🚀 Server running in development mode on port 5000
   ```

---

## Step 4: Test It!

1. **Open your app**
2. **Sign up with your REAL email address**:
   - Name: `Your Name`
   - Email: `your.real.email@gmail.com` ← **Use your actual email!**
   - Password: `password123`

3. **Check your email inbox** - you should receive:
   - Subject: "Your LinguaAICall Verification Code"
   - A beautiful HTML email with your 6-digit OTP code

4. **Enter the OTP in the app** to verify

---

## 🎯 Expected Results

### ✅ Success:
- Backend console shows: `✅ OTP email sent successfully to your.email@gmail.com`
- You receive an email in your inbox with the OTP
- Email has subject: "Your LinguaAICall Verification Code"
- Beautiful HTML formatted email

### ❌ If Email Not Configured:
- Backend console shows: `⚠️  Email not configured. OTP for your.email@gmail.com: 123456`
- OTP printed to console instead (fallback mode)

### ❌ If Email Fails:
- Backend console shows: `❌ Error sending OTP email: [error message]`
- Fallback: OTP printed to console
- Check your EMAIL_USER and EMAIL_PASSWORD in .env

---

## 🔧 Troubleshooting

### Problem: "App password not available"
**Solution**: 
- Make sure 2-Step Verification is enabled
- Wait a few minutes after enabling 2-Step Verification
- Try accessing: https://myaccount.google.com/apppasswords directly

### Problem: "Invalid credentials" or "Username and password not accepted"
**Solution**:
- Double-check EMAIL_USER is your full Gmail address
- Make sure EMAIL_PASSWORD is the 16-character App Password (no spaces)
- Don't use your regular Gmail password - use the App Password!

### Problem: "Less secure app access"
**Solution**:
- Gmail no longer supports "Less secure apps"
- You MUST use App Passwords (see Step 1)

### Problem: Email goes to Spam
**Solution**:
- Check your spam/junk folder
- Mark as "Not Spam" / "Not Junk"
- Add the sender to your contacts

### Problem: Still not working
**Solutions**:
1. Restart the backend server after updating .env
2. Check for typos in .env file
3. Make sure there are no extra spaces
4. Try creating a new App Password
5. Check backend console for specific error messages

---

## 📋 Quick Checklist

- [ ] Gmail 2-Step Verification is enabled
- [ ] App Password created for "Mail"
- [ ] EMAIL_USER set to your Gmail address
- [ ] EMAIL_PASSWORD set to the 16-character App Password
- [ ] Backend .env file saved
- [ ] Backend server restarted
- [ ] Tested with your real email address
- [ ] Received OTP email in inbox

---

## 🌟 Bonus Features

The email system now sends:

1. **OTP Verification Email** (When you sign up)
   - Beautiful HTML design
   - Clear 6-digit code
   - Expires in 10 minutes

2. **Welcome Email** (After verifying OTP)
   - Welcome message
   - Feature highlights
   - Automatic after verification

3. **Password Reset Email** (When you forget password)
   - Secure reset link
   - Expires in 10 minutes

---

## 🔐 Security Notes

- ✅ Never share your App Password with anyone
- ✅ App Password only works for this app
- ✅ You can revoke it anytime from Google Account settings
- ✅ Use a different App Password for each application
- ✅ OTP codes expire after 10 minutes
- ✅ Emails are sent via secure SMTP connection

---

## 🚀 Alternative Email Providers

### Using Outlook/Hotmail:
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-outlook-password
```

### Using SendGrid:
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
```

### Using Mailgun:
```env
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=your-mailgun-username
EMAIL_PASSWORD=your-mailgun-password
```

---

## 📞 Need Help?

If you're still having issues:
1. Check the backend console for error messages
2. Review the troubleshooting section above
3. Make sure all steps were followed correctly
4. Try with a fresh Gmail account if problems persist

---

**Happy Emailing! 📧** You can now receive OTP codes directly in your inbox!


