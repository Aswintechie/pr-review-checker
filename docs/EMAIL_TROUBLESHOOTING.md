# 📧 Email Troubleshooting Guide

If you're not receiving feedback emails, follow this step-by-step debugging guide.

## ✅ **Quick Checklist**

1. **Environment Variables Set?** - Check your `.env` file
2. **Email Provider Settings?** - Verify SMTP settings for your provider
3. **App Passwords?** - Many providers require app-specific passwords
4. **Server Logs?** - Check console for email status messages
5. **Spam Folder?** - Check if emails are going to spam

---

## 🔧 **Step 1: Verify Environment Configuration**

Create/update your `server/.env` file with these variables:

### For Gmail:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password-here
FEEDBACK_EMAIL=feedback-recipient@yourdomain.com
```

### For Outlook/Hotmail:
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password-here
FEEDBACK_EMAIL=feedback-recipient@yourdomain.com
```

### For Yahoo:
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password-here
FEEDBACK_EMAIL=feedback-recipient@yourdomain.com
```

---

## 🔐 **Step 2: App Passwords (IMPORTANT!)**

Most email providers require **App Passwords** instead of your regular password:

### Gmail Setup:
1. **Enable 2FA**: Go to [Google Account Security](https://myaccount.google.com/security)
2. **Generate App Password**: 
   - Search for "App passwords" in your Google Account
   - Select "Mail" as the app
   - Copy the generated 16-character password
   - Use this password in `SMTP_PASS`

### Outlook Setup:
1. **Enable 2FA**: Go to [Microsoft Account Security](https://account.microsoft.com/security)
2. **Generate App Password**:
   - Go to "Additional security options"
   - Click "Create a new app password"
   - Use this password in `SMTP_PASS`

### Yahoo Setup:
1. **Enable 2FA**: Go to [Yahoo Account Security](https://login.yahoo.com/account/security)
2. **Generate App Password**:
   - Go to "Generate app password"
   - Select "Other" and name it "PR Approval Finder"
   - Use this password in `SMTP_PASS`

---

## 🐛 **Step 3: Debug Server Logs**

When you start the server, look for these messages:

### ✅ **Success Messages:**
```
📧 Email server is ready to send feedback notifications
📧 Email notification sent successfully to your-email@domain.com
```

### ⚠️ **Warning Messages:**
```
📧 No email configuration found - feedback will only be logged to console
```
**Solution**: Check your `.env` file has all required variables.

```
⚠️  Email configuration error: Invalid login: 535-5.7.8 Username and Password not accepted
📧 Email notifications will be disabled
```
**Solution**: Use app password instead of regular password.

```
📧 Failed to send email notification: Connection timeout
```
**Solution**: Check firewall/network settings, try different SMTP port.

---

## 🧪 **Step 4: Test Email Configuration**

I've created a test endpoint to verify your email setup:

### Test via API:
```bash
curl -X POST http://localhost:3001/api/test-email
```

### Test via Browser:
Open your browser developer tools and run:
```javascript
fetch('http://localhost:3001/api/test-email', { method: 'POST' })
  .then(res => res.json())
  .then(data => console.log(data));
```

**Expected Response:**
- ✅ **Success**: Test email sent to your inbox
- ❌ **Error**: Detailed error message with troubleshooting tips

---

## 🔧 **Step 5: Common Solutions**

### Problem: "Invalid login" Error
**Solution**: Use App Password instead of regular password (see Step 2)

### Problem: "Connection refused" Error
**Solution**: 
- Check firewall settings
- Try port 465 with `secure: true`
- Verify SMTP host address

### Problem: Emails going to Spam
**Solution**:
- Add sender to your contacts
- Check spam folder settings
- Use a custom domain for `FEEDBACK_EMAIL`

### Problem: "Authentication failed" Error
**Solution**:
- Double-check email and app password
- Ensure 2FA is enabled for app passwords
- Try generating a new app password

---

## 📝 **Step 6: Complete Configuration Example**

Here's a working Gmail configuration example:

```env
# Required for PR review functionality
GITHUB_TOKEN=your_github_token_here
GITHUB_TEAMS_TOKEN=your_teams_token_here

# Email configuration for feedback
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourapp@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
FEEDBACK_EMAIL=feedback@yourdomain.com

# Server settings
PORT=3001
```

**Important Notes:**
- `SMTP_PASS` is your 16-character app password from Gmail
- `FEEDBACK_EMAIL` is where you want to receive feedback (can be different from `SMTP_USER`)
- No quotes needed around values in .env file

---

## 🆘 **Still Having Issues?**

If you're still not receiving emails:

1. **Check Server Logs**: Look for email-related console messages
2. **Verify .env Location**: Must be in `server/.env` (not root directory)
3. **Restart Server**: Changes require server restart
4. **Test with Different Email**: Try with a different email provider
5. **Check Firewall**: Ensure ports 587/465 are not blocked

### Debug Commands:
```bash
# Check if .env is loaded
cd server && node -e "require('dotenv').config(); console.log(process.env.SMTP_USER)"

# Test SMTP connection manually
cd server && node -e "
const nodemailer = require('nodemailer');
require('dotenv').config();
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});
transporter.verify((err, success) => {
  console.log(err ? 'Error: ' + err.message : 'Success: SMTP connection working');
});
"
```

### Email Working? 🎉
Once emails are working, test the feedback form:
1. Open http://localhost:3000
2. Click the 💬 feedback button
3. Submit test feedback
4. Check your email inbox!

---

## 🔧 **Production Deployment**

For production deployment:
- Use environment variables (not .env files)
- Consider using a dedicated email service (SendGrid, AWS SES)
- Set up proper DNS records if using custom domain
- Monitor email delivery rates and bounce handling
</code_block_to_apply_changes_from> 