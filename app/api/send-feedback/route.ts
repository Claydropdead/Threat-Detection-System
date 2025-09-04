import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  let body: any;
  
  try {
    body = await request.json();
    const { name, email, subject, message, type } = body;

    // Validate required fields
    if (!subject || !message) {
      return NextResponse.json(
        { error: 'Subject and message are required' },
        { status: 400 }
      );
    }

    // Create email content
    const emailContent = `
      CyberSafe 4B Feedback Submission
      ================================
      
      Type: ${type.charAt(0).toUpperCase() + type.slice(1)}
      From: ${name || 'Anonymous'}
      Email: ${email || 'Not provided'}
      Subject: ${subject}
      
      Message:
      ${message}
      
      ---
      Timestamp: ${new Date().toISOString()}
      User Agent: ${request.headers.get('user-agent') || 'Unknown'}
      IP: ${request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown'}
    `;    // For now, we'll use a simple email service approach
    // You can replace this with your preferred email service (SendGrid, Nodemailer, etc.)
    
    // Using Nodemailer with Gmail SMTP (you'll need to set up environment variables)
      // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER, // Your Gmail address
        pass: process.env.GMAIL_APP_PASSWORD, // Your Gmail App Password
      },
    });

    // Email options
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.FEEDBACK_EMAIL || process.env.GMAIL_USER, // Where to send feedback
      subject: `CyberSafe 4B Feedback: ${subject}`,
      text: emailContent,
      replyTo: email || undefined,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    return NextResponse.json(
      { success: true, message: 'Feedback sent successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Feedback submission error:', error);
      // Fallback: Log feedback to server console if email fails
    console.log('FEEDBACK SUBMISSION (Email failed):', {
      timestamp: new Date().toISOString(),
      type: body.type,
      name: body.name || 'Anonymous',
      email: body.email || 'Not provided',
      subject: body.subject,
      message: body.message,
    });

    return NextResponse.json(
      { error: 'Failed to send feedback', fallback: 'Logged to server' },
      { status: 500 }
    );
  }
}
