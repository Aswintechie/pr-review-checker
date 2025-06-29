# 📬 Feedback Setup Guide

This guide explains how to configure where feedback submissions will be received and stored.

## 🖥️ Current Setup (Development)

By default, feedback is logged to the server console:
```
📝 New Feedback Received:
========================
Type: bug
Rating: 4/5
Subject: Minor UI issue
Message: The button hover effect could be smoother
Name: John Doe
Email: john@example.com
Timestamp: 2025-01-27T...
========================
```

## 🚀 Production Setup Options

### 1. 📧 Email Notifications (Recommended)

Receive feedback directly to your email inbox.

#### Setup:
1. Install nodemailer (already added to package.json):
```bash
cd server && npm install
```

2. Configure environment variables in `.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FEEDBACK_EMAIL=feedback@yourdomain.com
```

3. Update server code (server/index.js):
```javascript
const nodemailer = require('nodemailer');

// Email transporter setup
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// In the feedback endpoint, add email sending:
if (process.env.FEEDBACK_EMAIL && process.env.SMTP_USER) {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: process.env.FEEDBACK_EMAIL,
    subject: `[PR Approval Finder] ${type.toUpperCase()}: ${subject}`,
    html: `
      <h2>New Feedback Received</h2>
      <p><strong>Type:</strong> ${type}</p>
      <p><strong>Rating:</strong> ${rating}/5 stars</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong></p>
      <blockquote>${message.replace(/\n/g, '<br>')}</blockquote>
      ${name ? `<p><strong>Name:</strong> ${name}</p>` : ''}
      ${email ? `<p><strong>Email:</strong> ${email}</p>` : ''}
      <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
    `,
  };

  await transporter.sendMail(mailOptions);
}
```

### 2. 💬 Slack Integration

Receive feedback in a Slack channel.

#### Setup:
1. Create a Slack webhook:
   - Go to https://api.slack.com/apps
   - Create new app > Incoming Webhooks
   - Copy webhook URL

2. Add to `.env`:
```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

3. Add to server code:
```javascript
// In feedback endpoint:
if (process.env.SLACK_WEBHOOK_URL) {
  const slackMessage = {
    text: `New ${type} feedback received!`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*New ${type.toUpperCase()} Feedback*\n*Rating:* ${rating}/5 ⭐\n*Subject:* ${subject}`
        }
      },
      {
        type: "section", 
        text: {
          type: "mrkdwn",
          text: `*Message:*\n${message}`
        }
      }
    ]
  };

  await axios.post(process.env.SLACK_WEBHOOK_URL, slackMessage);
}
```

### 3. 🗄️ Database Storage

Store feedback in a database for analytics and management.

#### PostgreSQL Setup:
1. Create database and table:
```sql
CREATE DATABASE pr_approval_feedback;

CREATE TABLE feedback (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255),
  type VARCHAR(50) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  rating INTEGER DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT
);
```

2. Add database client:
```bash
npm install pg
```

3. Update server code:
```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// In feedback endpoint:
const result = await pool.query(
  'INSERT INTO feedback (name, email, type, subject, message, rating, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
  [name, email, type, subject, message, rating, req.ip, req.get('User-Agent')]
);
```

### 4. 📊 GitHub Issues Integration

Create GitHub issues automatically for bug reports and feature requests.

#### Setup:
```javascript
// In feedback endpoint, for bug reports and feature requests:
if (type === 'bug' || type === 'feature') {
  const issueTitle = `[${type.toUpperCase()}] ${subject}`;
  const issueBody = `
**Type:** ${type}
**Rating:** ${rating}/5
**Reporter:** ${name || 'Anonymous'} ${email ? `(${email})` : ''}

**Description:**
${message}

---
*This issue was automatically created from feedback form submission*
  `;

  const issueData = {
    title: issueTitle,
    body: issueBody,
    labels: [type === 'bug' ? 'bug' : 'enhancement', 'feedback']
  };

  await axios.post(
    'https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/issues',
    issueData,
    { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
  );
}
```

## 🔧 Complete Implementation Example

Here's the complete updated feedback endpoint with all options:

```javascript
app.post('/api/feedback', async (req, res) => {
  try {
    const { name, email, type, subject, message, rating } = req.body;

    // Validation (existing code)...

    // 1. Console logging (always enabled)
    console.log('\n📝 New Feedback Received:');
    console.log('========================');
    console.log(`Type: ${type || 'feedback'}`);
    console.log(`Rating: ${rating || 5}/5`);
    console.log(`Subject: ${subject}`);
    console.log(`Message: ${message}`);
    if (name) console.log(`Name: ${name}`);
    if (email) console.log(`Email: ${email}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('========================\n');

    // 2. Email notification
    if (process.env.FEEDBACK_EMAIL && process.env.SMTP_USER) {
      // Email code here...
    }

    // 3. Slack notification  
    if (process.env.SLACK_WEBHOOK_URL) {
      // Slack code here...
    }

    // 4. Database storage
    if (process.env.DATABASE_URL) {
      // Database code here...
    }

    // 5. GitHub issue creation
    if ((type === 'bug' || type === 'feature') && process.env.GITHUB_TOKEN) {
      // GitHub issue code here...
    }

    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      id: `feedback_${Date.now()}`,
    });
  } catch (error) {
    console.error('Error processing feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## 🎯 Recommended Setup

For production, I recommend using **multiple methods**:

1. **Email** - Immediate notifications
2. **Database** - Long-term storage and analytics  
3. **Slack** - Team collaboration
4. **GitHub Issues** - For bugs and feature requests

This ensures you never miss feedback and can track improvements over time!

## 📈 Analytics Dashboard (Future Enhancement)

Consider building a simple dashboard to view feedback analytics:
- Feedback types breakdown
- Rating trends over time
- Common feature requests
- Bug report patterns

The database storage option makes this possible! 