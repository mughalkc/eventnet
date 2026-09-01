const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const nodemailer = require('nodemailer');

// Shared transporter for the entire application
let transporter = null;

/**
 * Initialize email transporter with Gmail
 * @returns {Object|null} Configured transporter or null if setup fails
 */
function initializeTransporter() {
  try {
    console.log('Initializing email transporter...');
    
    // Validate credentials
    if (!process.env.EMAIL_USER) {
      throw new Error('EMAIL_USER environment variable not set');
    }
    if (!process.env.EMAIL_PASSWORD) {
      throw new Error('EMAIL_PASSWORD environment variable not set');
    }
    
    // Create a transporter with simple auth
    const newTransporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      connectionTimeout: 10000
    });
    
    return newTransporter;
  } catch (error) {
    console.error('Failed to create email transporter:', error);
    return null;
  }
}

/**
 * Initialize the email service and verify connection
 * @returns {Promise<boolean>} True if initialization is successful
 */
async function init() {
  try {
    // Initialize transporter if not already done
    if (!transporter) {
      transporter = initializeTransporter();
    }
    
    // Verify the connection
    const isConnected = await verifyConnection();
    
    if (isConnected) {
      console.log('Email service initialized successfully');
    } else {
      console.log('Email service initialization failed, will use fallback logging');
    }
    
    return isConnected;
  } catch (error) {
    console.error('Error during email service initialization:', error);
    return false;
  }
}

/**
 * Verify the email transporter connection
 * @returns {Promise<boolean>} True if connection is successful
 */
async function verifyConnection() {
  try {
    if (!transporter) {
      console.log('Email transporter not initialized');
      return false;
    }
    
    return new Promise((resolve) => {
      transporter.verify((error, success) => {
        if (error) {
          console.error('SMTP connection error:', error);
          
          if (error.code === 'EAUTH') {
            console.error('Authentication failed. Make sure you are using an App Password, not your regular Google password.');
          } else if (error.code === 'ESOCKET') {
            console.error('Socket connection error. Check network connectivity.');
          }
          
          resolve(false);
        } else {
          console.log('Gmail SMTP server is ready to take our messages');
          resolve(true);
        }
      });
    });
  } catch (error) {
    console.error('Error verifying email connection:', error);
    return false;
  }
}

/**
 * Fallback logging function when email sending fails completely
 * @param {Object} mailOptions - Email options
 * @returns {Object} Mock response object
 */
function logEmailFallback(mailOptions) {
  console.log('========== EMAIL FALLBACK (NOT SENT) ==========');
  console.log(`From: ${mailOptions.from}`);
  console.log(`To: ${mailOptions.to}`);
  console.log(`Subject: ${mailOptions.subject}`);
  console.log('HTML Content: [Email HTML content not shown for brevity]');
  console.log('================================================');
  
  return {
    messageId: 'fallback-' + Date.now(),
    response: 'Email logged (not sent)'
  };
}

/**
 * Send an email with Resend first, fallback to Nodemailer (Gmail) for unverified domain/clients, and lastly console fallback.
 * @param {Object} mailOptions - Email options
 * @returns {Promise<Object>} Email sending response
 */
async function sendEmail(mailOptions) {
  // 1. Try sending via Resend API first
  if (process.env.RESEND_API_KEY) {
    try {
      const fromAddress = 'EventNet <onboarding@resend.dev>';
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: mailOptions.to,
        subject: mailOptions.subject,
        html: mailOptions.html
      });

      if (error) {
        console.warn(`Resend restriction: ${error.message}. Switching to Nodemailer (Gmail)...`);
      } else {
        console.log(`Email sent successfully via Resend to: ${mailOptions.to}`);
        return data;
      }
    } catch (resendError) {
      console.warn(`Resend failed: ${resendError.message}. Switching to Nodemailer (Gmail)...`);
    }
  }

  // 2. Fallback to Nodemailer (Gmail App Password) for external clients
  try {
    if (!transporter) {
      transporter = initializeTransporter();
    }

    if (transporter) {
      const nodemailerOptions = {
        from: mailOptions.from || `"EventNet" <${process.env.EMAIL_USER}>`,
        to: mailOptions.to,
        subject: mailOptions.subject,
        html: mailOptions.html
      };

      const info = await transporter.sendMail(nodemailerOptions);
      console.log(`Email sent successfully via Nodemailer (Gmail) to: ${mailOptions.to}`);
      return info;
    }
  } catch (nodemailerError) {
    console.warn(`Nodemailer failed: ${nodemailerError.message}`);
  }

  // 3. Fallback to console logging if both fail
  console.log('Both Resend and Nodemailer failed. Using fallback logging method.');
  return logEmailFallback(mailOptions);
}

/**
 * Send a login notification email
 */
async function sendLoginNotificationEmail(email, name, role, loginInfo = {}) {
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleString();
  
  const mailOptions = {
    from: `"EventNet Security" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'New Login to Your EventNet Account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #5c6ac4;">New Login Alert</h1>
        </div>
        <div style="margin-bottom: 20px;">
          <p>Hello ${name},</p>
          <p>We detected a new login to your EventNet ${role} account.</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3 style="margin-top: 0;">Login Details:</h3>
            <p><strong>Time:</strong> ${formattedDate}</p>
            <p><strong>IP Address:</strong> ${loginInfo.ip || 'Unknown'}</p>
            <p><strong>Device:</strong> ${loginInfo.device || 'Unknown'}</p>
            <p><strong>Browser:</strong> ${loginInfo.browser || 'Unknown'}</p>
          </div>
          <p>If this was you, you can ignore this email. If you didn't log in recently, please secure your account by changing your password immediately.</p>
        </div>
        <div style="text-align: center; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
          <p style="margin: 0; color: #6c757d; font-size: 14px;">&copy; ${new Date().getFullYear()} EventNet. All rights reserved.</p>
        </div>
      </div>
    `
  };

  return sendEmail(mailOptions);
}

/**
 * Send a welcome email to a new user
 */
async function sendWelcomeEmail(email, name) {
  const mailOptions = {
    from: `"EventNet" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Welcome to EventNet!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #5c6ac4;">Welcome to EventNet!</h1>
        </div>
        <div style="margin-bottom: 20px;">
          <p>Hello ${name},</p>
          <p>Thank you for joining EventNet! We're excited to have you on board.</p>
          <p>With EventNet, you can:</p>
          <ul>
            <li>Discover amazing events near you</li>
            <li>Register for events with just a few clicks</li>
            <li>Keep track of your tickets in one place</li>
          </ul>
          <p>If you have any questions, feel free to reply to this email.</p>
        </div>
        <div style="text-align: center; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
          <p style="margin: 0; color: #6c757d; font-size: 14px;">&copy; ${new Date().getFullYear()} EventNet. All rights reserved.</p>
        </div>
      </div>
    `
  };

  return sendEmail(mailOptions);
}

/**
 * Send a ticket confirmation email
 */
async function sendTicketConfirmationEmail(email, name, event, ticket) {
  const mailOptions = {
    from: `"EventNet" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Your Ticket for ${event.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #5c6ac4;">Your Ticket Confirmation</h1>
        </div>
        <div style="margin-bottom: 20px;">
          <p>Hello ${name},</p>
          <p>Thank you for purchasing a ticket for <strong>${event.name}</strong>!</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3 style="margin-top: 0;">Event Details:</h3>
            <p><strong>Date:</strong> ${new Date(event.startDate).toLocaleDateString()} at ${event.startTime}</p>
            <p><strong>Location:</strong> ${typeof event.location === 'object' ? (event.location.isVirtual ? 'Virtual Event' : event.location.address) : event.location}</p>
            <p><strong>Ticket Type:</strong> ${ticket.ticketInfo?.name || 'Standard'}</p>
            <p><strong>Ticket Code:</strong> <span style="font-family: monospace; font-weight: bold; font-size: 18px;">${ticket.ticketCode}</span></p>
          </div>
          <p>You can view your ticket in the "My Tickets" section of your EventNet account.</p>
        </div>
        <div style="text-align: center; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
          <p style="margin: 0; color: #6c757d; font-size: 14px;">&copy; ${new Date().getFullYear()} EventNet. All rights reserved.</p>
        </div>
      </div>
    `
  };

  return sendEmail(mailOptions);
}

/**
 * Send a notification to a vendor about a new registration
 */
async function sendVendorRegistrationNotification(vendorEmail, vendorName, event, user) {
  const mailOptions = {
    from: `"EventNet" <${process.env.EMAIL_USER}>`,
    to: vendorEmail,
    subject: `New Registration for ${event.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #5c6ac4;">New Event Registration</h1>
        </div>
        <div style="margin-bottom: 20px;">
          <p>Hello ${vendorName},</p>
          <p>You have a new registration for your event <strong>${event.name}</strong>!</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3 style="margin-top: 0;">Registration Details:</h3>
            <p><strong>User:</strong> ${user.name}</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <p>You can view all registrations in the "Registrations" section of your EventNet vendor dashboard.</p>
        </div>
        <div style="text-align: center; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
          <p style="margin: 0; color: #6c757d; font-size: 14px;">&copy; ${new Date().getFullYear()} EventNet. All rights reserved.</p>
        </div>
      </div>
    `
  };

  return sendEmail(mailOptions);
}

/**
 * Send event notification
 */
async function sendEventNotification(event, userId, type, user = null) {
  try {
    const userData = user || await require('../models/User').findById(userId);
    if (!userData) return;
    
    if (type === 'registration') {
      const mailOptions = {
        from: `"EventNet" <${process.env.EMAIL_USER}>`,
        to: userData.email,
        subject: `Registration Confirmed: ${event.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #5c6ac4;">Registration Confirmed!</h1>
            </div>
            <div style="margin-bottom: 20px;">
              <p>Hello ${userData.name || userData.email},</p>
              <p>Your registration for <strong>${event.name}</strong> has been confirmed!</p>
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <h3 style="margin-top: 0;">Event Details:</h3>
                <p><strong>Date:</strong> ${new Date(event.startDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${event.startTime || new Date(event.startDate).toLocaleTimeString()}</p>
                <p><strong>Location:</strong> ${typeof event.location === 'object' ? (event.location.isVirtual ? 'Virtual Event' : event.location.address) : event.location}</p>
              </div>
              <p>We look forward to seeing you there!</p>
            </div>
            <div style="text-align: center; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
              <p style="margin: 0; color: #6c757d; font-size: 14px;">&copy; ${new Date().getFullYear()} EventNet. All rights reserved.</p>
            </div>
          </div>
        `
      };
      
      return sendEmail(mailOptions);
    }
  } catch (error) {
    console.error('Send notification error:', error);
    return { error: 'Failed to send event notification' };
  }
}

// Export functions and a getter function for transporter to ensure updated reference
module.exports = {
  getTransporter: () => transporter,
  init,
  sendWelcomeEmail,
  sendTicketConfirmationEmail,
  sendVendorRegistrationNotification,
  sendLoginNotificationEmail,
  sendEventNotification,
  verifyConnection,
  sendEmail
};