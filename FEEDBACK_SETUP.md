# Feedback Feature Setup

The CyberSafe 4B analysis page now includes a feedback feature that sends emails directly to your Gmail account. Here's how to set it up:

## Features Added

1. **Feedback Modal**: Users can send feedback directly from the analysis page
2. **Feedback Types**: General feedback, bug reports, feature requests, and improvement suggestions
3. **Navigation Integration**: Feedback button in the navigation bar
4. **Floating Button**: Always-accessible floating feedback button
5. **Email Integration**: Sends feedback directly to your Gmail

## Setup Instructions

### 1. Gmail App Password Setup

Since this uses Gmail SMTP, you need to create an App Password:

1. Go to your Google Account settings: https://myaccount.google.com
2. Select **Security** from the left panel
3. Under "Signing in to Google," select **2-Step Verification** (enable if not already enabled)
4. At the bottom of the page, select **App passwords**
5. Select **Mail** and your device
6. Follow the instructions to generate an app password
7. Copy the 16-character password (remove spaces)

### 2. Environment Variables

Add these to your `.env.local` file:

```bash
# Your Gmail address
GMAIL_USER=your.email@gmail.com

# Your Gmail App Password (16 characters, no spaces)
GMAIL_APP_PASSWORD=abcdabcdabcdabcd

# Where to send feedback emails (optional, defaults to GMAIL_USER)
FEEDBACK_EMAIL=your.feedback@gmail.com
```

### 3. Dependencies

The following packages are already installed:
- `nodemailer` - For sending emails
- `@types/nodemailer` - TypeScript types

## How It Works

### User Experience
1. Users click the feedback button (navigation or floating button)
2. A modal opens with a form
3. Users can select feedback type and provide details
4. Form validates required fields
5. Success message shows after submission

### Technical Flow
1. Form data is sent to `/api/send-feedback`
2. API validates the data
3. Email is composed with user details
4. Nodemailer sends via Gmail SMTP
5. Fallback: If email fails, feedback is logged to console

### Email Format
```
CyberSafe 4B Feedback Submission
================================

Type: Bug Report
From: John Doe
Email: john@example.com
Subject: Analysis page loading issue

Message:
The analysis page sometimes takes too long to load...

---
Timestamp: 2025-01-20T10:30:00.000Z
User Agent: Mozilla/5.0...
IP: 192.168.1.1
```

## Customization Options

### 1. Change Email Service
Replace the Gmail configuration in `/app/api/send-feedback/route.ts`:

```typescript
const transporter = nodemailer.createTransport({
  // For other email services, replace with appropriate settings
  host: 'smtp.your-email-provider.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});
```

### 2. Add More Feedback Types
Update the feedback form in `/app/analysis/page.tsx`:

```typescript
<select value={feedbackForm.type}>
  <option value="general">General Feedback</option>
  <option value="bug">Bug Report</option>
  <option value="feature">Feature Request</option>
  <option value="improvement">Improvement Suggestion</option>
  <option value="security">Security Concern</option> {/* New option */}
</select>
```

### 3. Style Customization
The feedback modal uses Tailwind CSS classes and can be styled by modifying the className attributes.

## Testing

1. Set up environment variables
2. Start the development server: `npm run dev`
3. Go to the analysis page: `http://localhost:3000/analysis`
4. Click the feedback button
5. Fill out and submit the form
6. Check your Gmail inbox

## Troubleshooting

### Common Issues

1. **"Failed to send feedback"**
   - Check Gmail credentials in `.env.local`
   - Verify App Password is correct (16 characters)
   - Ensure 2-Factor Authentication is enabled

2. **Email not received**
   - Check spam folder
   - Verify GMAIL_USER email address
   - Check Gmail SMTP settings

3. **Console logs show "Email failed"**
   - Feedback is still logged to server console
   - Check environment variables
   - Verify internet connection

### Environment Variable Check
Add this to test your configuration:

```bash
# In your terminal
echo $GMAIL_USER
echo $GMAIL_APP_PASSWORD
```

## Security Notes

- App passwords are safer than regular passwords
- Never commit `.env.local` to version control
- Consider rate limiting for production use
- Validate and sanitize all user inputs

## Alternative Solutions

If Gmail setup is complex, consider these alternatives:

1. **SendGrid**: More reliable for production
2. **Mailgun**: Good for transactional emails  
3. **Contact Form Services**: Formspree, Netlify Forms
4. **Discord/Slack Webhooks**: For internal team feedback

The current implementation provides a fallback by logging to console if email fails, ensuring no feedback is lost.
