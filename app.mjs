import express from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'una-package-tracker-secret-key';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));


// Email configuration (using nodemailer)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Worker authorization middleware
function authorizeWorker(req, res, next) {
  if (req.user.type !== 'worker') {
    return res.status(403).json({ error: 'Worker access required' });
  }
  next();
}

// ==================== AUTH ROUTES ====================

// Login endpoint - TODO: Add database integration
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, userType } = req.body;

    // TODO: Query database for user
    // const user = await db.get('SELECT * FROM users WHERE username = ? AND type = ?', [username, userType]);

    res.status(501).json({ error: 'Database not configured. Backend team needs to implement.' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ==================== PACKAGE ROUTES ====================

// Get all packages (worker only) - TODO: Add database integration
app.get('/api/packages', authenticateToken, authorizeWorker, async (req, res) => {
  try {
    // TODO: Query database for packages
    res.status(501).json({ error: 'Database not configured. Backend team needs to implement.' });
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

// Get packages for specific user (student/staff) - TODO: Add database integration
app.get('/api/packages/my-packages', authenticateToken, async (req, res) => {
  try {
    // TODO: Query database for user's packages
    res.status(501).json({ error: 'Database not configured. Backend team needs to implement.' });
  } catch (error) {
    console.error('Error fetching user packages:', error);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

// Check in new package (worker only) - TODO: Add database integration
app.post('/api/packages', authenticateToken, authorizeWorker, async (req, res) => {
  try {
    const { trackingCode, recipientId } = req.body;

    // TODO: Implement package check-in with database
    res.status(501).json({ error: 'Database not configured. Backend team needs to implement.' });
  } catch (error) {
    console.error('Error checking in package:', error);
    res.status(500).json({ error: 'Failed to check in package' });
  }
});

// Check out package (worker only) - TODO: Add database integration
app.patch('/api/packages/:id/checkout', authenticateToken, authorizeWorker, async (req, res) => {
  try {
    // TODO: Update package status in database
    res.status(501).json({ error: 'Database not configured. Backend team needs to implement.' });
  } catch (error) {
    console.error('Error checking out package:', error);
    res.status(500).json({ error: 'Failed to check out package' });
  }
});

// Delete package (worker only) - TODO: Add database integration
app.delete('/api/packages/:id', authenticateToken, authorizeWorker, async (req, res) => {
  try {
    // TODO: Delete package from database
    res.status(501).json({ error: 'Database not configured. Backend team needs to implement.' });
  } catch (error) {
    console.error('Error deleting package:', error);
    res.status(500).json({ error: 'Failed to delete package' });
  }
});

// ==================== RECIPIENT ROUTES ====================

// Get all recipients (worker only) - TODO: Add database integration
app.get('/api/recipients', authenticateToken, authorizeWorker, async (req, res) => {
  try {
    // TODO: Query database for recipients
    res.status(501).json({ error: 'Database not configured. Backend team needs to implement.' });
  } catch (error) {
    console.error('Error fetching recipients:', error);
    res.status(500).json({ error: 'Failed to fetch recipients' });
  }
});

// Add new recipient (worker only) - TODO: Add database integration
app.post('/api/recipients', authenticateToken, authorizeWorker, async (req, res) => {
  try {
    const { name, lNumber, type, mailbox, email } = req.body;

    // TODO: Insert recipient into database
    res.status(501).json({ error: 'Database not configured. Backend team needs to implement.' });
  } catch (error) {
    console.error('Error adding recipient:', error);
    res.status(500).json({ error: 'Failed to add recipient' });
  }
});

// Delete recipient (worker only) - TODO: Add database integration
app.delete('/api/recipients/:id', authenticateToken, authorizeWorker, async (req, res) => {
  try {
    // TODO: Delete recipient from database
    res.status(501).json({ error: 'Database not configured. Backend team needs to implement.' });
  } catch (error) {
    console.error('Error deleting recipient:', error);
    res.status(500).json({ error: 'Failed to delete recipient' });
  }
});

// ==================== EMAIL NOTIFICATION ====================

async function sendPackageNotification(recipient, trackingCode) {
  try {
    // Only send email if SMTP is configured
    if (!process.env.SMTP_USER) {
      console.log(`[DEMO] Email notification would be sent to ${recipient.email}`);
      console.log(`Subject: Package Arrival Notification - UNA Mailroom`);
      console.log(`Tracking Code: ${trackingCode}`);
      return;
    }

    const mailOptions = {
      from: `"UNA Mailroom" <${process.env.SMTP_USER}>`,
      to: recipient.email,
      subject: 'Package Arrival Notification - UNA Mailroom',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #00A3E0;">Package Ready for Pickup</h2>
          <p>Dear ${recipient.name},</p>
          <p>You have a package waiting for pickup at the UNA mailroom.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Tracking Code:</strong> ${trackingCode}</p>
            <p><strong>Mailbox:</strong> #${recipient.mailbox}</p>
            <p><strong>Location:</strong> UNA Mailroom</p>
          </div>
          <p>Please bring your student ID to pick up your package during mailroom hours.</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This is an automated notification from the UNA Package Tracking System.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email notification sent to ${recipient.email}`);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

// Email notification endpoint (worker only) - TODO: Add database integration
app.post('/api/packages/:id/notify', authenticateToken, authorizeWorker, async (req, res) => {
  try {
    // TODO: Get package from database and send notification
    res.status(501).json({ error: 'Database not configured. Backend team needs to implement.' });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// ==================== SERVE FRONTEND ====================

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/worker', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'worker-dashboard.html'));
});

app.get('/student', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'student-dashboard.html'));
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`UNA Package Tracker Server running on port ${PORT}`);
  console.log(`Access the application at http://localhost:${PORT}`);
  console.log('NOTE: Database not configured - backend team needs to implement database integration');
});
