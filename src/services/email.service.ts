import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: process.env.ETHEREAL_USER,
        pass: process.env.ETHEREAL_PASS,
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<{ messageId: string; previewUrl: string }> {
    try {
      const info = await this.transporter.sendMail({
        from: '"Event Management App" <noreply@eventapp.com>',
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html || options.text,
      });

      // Get the preview URL for Ethereal emails
      const previewUrl = nodemailer.getTestMessageUrl(info);
      
      return {
        messageId: info.messageId,
        previewUrl: previewUrl || 'Preview not available'
      };
    } catch (error) {
      console.error('Email sending failed:', error);
      throw new Error('Failed to send email');
    }
  }

  async sendWelcomeEmail(email: string, role: string): Promise<{ messageId: string; previewUrl: string }> {
    const subject = 'Welcome to Event Management App!';
    const text = `Welcome to our Event Management App! You have been registered as a ${role}.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Event Management App!</h2>
        <p>Thank you for registering with our event management platform.</p>
        <p>Your account has been created with the role: <strong>${role}</strong></p>
        <p>You can now:</p>
        <ul>
          <li>View and RSVP to events</li>
          ${role === 'ORGANIZER' ? '<li>Create and manage your own events</li>' : ''}
          ${role === 'ADMIN' ? '<li>Approve events and manage the platform</li>' : ''}
        </ul>
        <p>Best regards,<br>The Event Management Team</p>
      </div>
    `;

    return this.sendEmail({ to: email, subject, text, html });
  }

  async sendEventNotificationEmail(email: string, eventTitle: string, action: string): Promise<{ messageId: string; previewUrl: string }> {
    const subject = `Event Update: ${eventTitle}`;
    const text = `The event "${eventTitle}" has been ${action}.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Event Update</h2>
        <p>The event <strong>"${eventTitle}"</strong> has been ${action}.</p>
        <p>Check out the latest updates in our event management app!</p>
        <p>Best regards,<br>The Event Management Team</p>
      </div>
    `;

    return this.sendEmail({ to: email, subject, text, html });
  }
}

export const emailService = new EmailService();

