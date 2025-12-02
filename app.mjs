import 'dotenv/config';
import express from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import uspsAPI from './services/usps-api.js';
import { requirePermission, requireWorker } from './middleware/authorization.js';
import { isConfigured as isDbConfigured } from './services/database.js';
import * as db from './services/db-operations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'una-package-tracker-secret-key';

// Middleware
app.use(cors());
app.use(express.json());


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

// Endpoint to get user permissions (for frontend)
app.get('/api/auth/permissions', authenticateToken, (req, res) => {
  const userType = req.user.type;
  const permissions = {
    packages: {
      create: userType === 'worker',
      read: true, // Both can read (workers: all, students: own)
      update: userType === 'worker',
      delete: userType === 'worker'
    },
    recipients: {
      create: userType === 'worker',
      read: userType === 'worker',
      update: userType === 'worker',
      delete: userType === 'worker'
    },
    userType: userType
  };
  res.json(permissions);
});

// ==================== AUTH ROUTES ====================

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { password, userType, email, fullName, lNumber } = req.body;

    // Validate required fields
    if (!email || !password || !userType) {
      return res.status(400).json({ error: 'Email, password, and userType are required' });
    }

    // Derive username from email (part before @)
    const username = email.split('@')[0];

    // Validate userType
    if (!['student', 'worker'].includes(userType)) {
      return res.status(400).json({ error: 'User type must be either "student" or "worker"' });
    }

    // Students must have L number
    if (userType === 'student' && !lNumber) {
      return res.status(400).json({ error: 'L number is required for students' });
    }

    // Check if database is configured
    if (!isDbConfigured()) {
      return res.status(503).json({
        error: 'Database not configured',
        message: 'Please configure database environment variables'
      });
    }

    // Check if email already exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Check if L number already exists (for students)
    if (userType === 'student' && lNumber) {
      const existingLNumber = await db.getUserByLNumber(lNumber);
      if (existingLNumber) {
        return res.status(400).json({ error: 'L number already registered' });
      }
    }

    // Hash password
    const passwordHash = await bcryptjs.hash(password, 10);

    // Create user
    const newUser = await db.createUser({
      username,
      passwordHash,
      type: userType,
      email: email || null,
      fullName: fullName || null,
      lNumber: userType === 'student' ? lNumber : null
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        id: newUser.id,
        username: newUser.username,
        type: newUser.type,
        lNumber: newUser.l_number
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        type: newUser.type,
        email: newUser.email,
        fullName: newUser.full_name,
        lNumber: newUser.l_number
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, userType } = req.body;

    if (!email || !password || !userType) {
      return res.status(400).json({ error: 'Email, password, and userType are required' });
    }

    // Check if database is configured
    if (!isDbConfigured()) {
      return res.status(503).json({
        error: 'Database not configured',
        message: 'Please configure database environment variables'
      });
    }

    // Get user from database by email
    const user = await db.getUserByEmail(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if user type matches
    if (user.type !== userType) {
      return res.status(401).json({ error: 'Invalid user type for this account' });
    }

    // Verify password
    const passwordMatch = await bcryptjs.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        type: user.type,
        lNumber: user.l_number
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        type: user.type,
        email: user.email,
        fullName: user.full_name,
        lNumber: user.l_number
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ==================== PACKAGE ROUTES ====================
// CRUD Matrix for Packages:
// - Students: READ (own packages only)
// - Workers: CREATE, READ (all), UPDATE, DELETE

// Get all packages (worker only)
app.get('/api/packages', authenticateToken, requireWorker, async (req, res) => {
  try {
    const packages = await db.getAllPackages();
    res.json(packages);
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

// Get packages for specific user (student/staff) - READ OWN
app.get('/api/packages/my-packages', authenticateToken, async (req, res) => {
  try {
    const userLNumber = req.user.lNumber;

    if (!userLNumber) {
      return res.status(400).json({ error: 'User L number not found' });
    }

    const packages = await db.getPackagesByLNumber(userLNumber);
    res.json(packages);
  } catch (error) {
    console.error('Error fetching user packages:', error);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

// Check in new package (worker only) - CREATE
app.post('/api/packages', authenticateToken, requireWorker, async (req, res) => {
  try {
    const { trackingCode, recipientId } = req.body;

    if (!trackingCode || !recipientId) {
      return res.status(400).json({ error: 'Tracking code and recipient ID are required' });
    }

    // Check if package already exists
    const existingPackage = await db.getPackageByTrackingCode(trackingCode);
    if (existingPackage) {
      return res.status(400).json({ error: 'Package with this tracking code already exists' });
    }

    // Get recipient details
    const recipient = await db.getRecipientById(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    // Detect carrier from tracking code
    const carrier = uspsAPI.isUSPSTrackingNumber(trackingCode) ? 'USPS' : 'Other';

    // Optional: Try to validate tracking number with USPS API if configured and it's a USPS package
    // Validation is non-blocking - package will be checked in regardless of validation result
    let trackingInfo = null;
    let carrierData = {};

    if (uspsAPI.isConfigured() && carrier === 'USPS') {
      console.log(`Attempting USPS tracking validation for: ${trackingCode}`);
      try {
        trackingInfo = await uspsAPI.trackPackage(trackingCode);

        if (trackingInfo.success) {
          console.log(`USPS tracking validated successfully: ${trackingInfo.status}`);
          carrierData = trackingInfo;
        } else {
          console.warn(`USPS validation failed, but continuing with check-in: ${trackingInfo.error}`);
          // Continue with check-in anyway
        }
      } catch (error) {
        console.warn(`USPS API error, but continuing with check-in:`, error.message);
        // Continue with check-in anyway - USPS API issues won't block package intake
      }
    }

    // Create package in database
    const newPackage = await db.createPackage({
      trackingCode,
      carrier,
      recipientId: recipient.id,
      recipientName: recipient.name,
      lNumber: recipient.l_number,
      mailbox: recipient.mailbox,
      carrierStatus: trackingInfo?.status || null,
      serviceType: trackingInfo?.service || null,
      expectedDelivery: trackingInfo?.deliveryDate || null,
      lastLocation: trackingInfo?.lastLocation || null,
      carrierData
    });

    // Send email notification to recipient
    await sendPackageNotification(recipient, trackingCode);

    res.status(201).json(newPackage);
  } catch (error) {
    console.error('Error checking in package:', error);
    res.status(500).json({ error: 'Failed to check in package' });
  }
});

// Update package (worker only) - UPDATE
app.put('/api/packages/:id', authenticateToken, requireWorker, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if package exists
    const existingPackage = await db.getPackageById(id);
    if (!existingPackage) {
      return res.status(404).json({ error: 'Package not found' });
    }

    // Update package
    const updatedPackage = await db.updatePackage(id, updateData);

    res.json(updatedPackage);
  } catch (error) {
    console.error('Error updating package:', error);
    res.status(500).json({ error: 'Failed to update package' });
  }
});

// Check out package (worker only) - UPDATE (specific action)
app.patch('/api/packages/:id/checkout', authenticateToken, requireWorker, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if package exists
    const existingPackage = await db.getPackageById(id);
    if (!existingPackage) {
      return res.status(404).json({ error: 'Package not found' });
    }

    if (existingPackage.status === 'Picked Up') {
      return res.status(400).json({ error: 'Package already picked up' });
    }

    // Check out package
    const updatedPackage = await db.checkoutPackage(id);

    res.json(updatedPackage);
  } catch (error) {
    console.error('Error checking out package:', error);
    res.status(500).json({ error: 'Failed to check out package' });
  }
});

// Delete package (worker only) - DELETE
app.delete('/api/packages/:id', authenticateToken, requireWorker, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if package exists
    const existingPackage = await db.getPackageById(id);
    if (!existingPackage) {
      return res.status(404).json({ error: 'Package not found' });
    }

    // Delete package
    const deleted = await db.deletePackage(id);

    if (deleted) {
      res.json({ message: 'Package deleted successfully' });
    } else {
      res.status(500).json({ error: 'Failed to delete package' });
    }
  } catch (error) {
    console.error('Error deleting package:', error);
    res.status(500).json({ error: 'Failed to delete package' });
  }
});

// ==================== USPS TRACKING ROUTES ====================

// Validate and track a USPS package (worker only)
app.post('/api/tracking/usps/validate', authenticateToken, requireWorker, async (req, res) => {
  try {
    const { trackingNumber } = req.body;

    if (!trackingNumber) {
      return res.status(400).json({ error: 'Tracking number is required' });
    }

    // Check if USPS API is configured
    if (!uspsAPI.isConfigured()) {
      return res.status(503).json({
        error: 'USPS API not configured',
        message: 'Please add USPS_CONSUMER_KEY and USPS_CONSUMER_SECRET to environment variables'
      });
    }

    // Check if this is a USPS tracking number
    if (!uspsAPI.isUSPSTrackingNumber(trackingNumber)) {
      return res.status(400).json({
        error: 'Invalid USPS tracking number format',
        trackingNumber: trackingNumber
      });
    }

    // Track the package
    const trackingInfo = await uspsAPI.trackPackage(trackingNumber);

    if (!trackingInfo.success) {
      return res.status(404).json({
        error: trackingInfo.error,
        trackingNumber: trackingInfo.trackingNumber
      });
    }

    res.json(trackingInfo);
  } catch (error) {
    console.error('Error validating USPS tracking:', error);
    res.status(500).json({ error: 'Failed to validate tracking number' });
  }
});

// Check if tracking number is USPS format (public endpoint for frontend validation)
app.get('/api/tracking/usps/check-format/:trackingNumber', (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const isUSPS = uspsAPI.isUSPSTrackingNumber(trackingNumber);

    res.json({
      isUSPS,
      trackingNumber,
      carrier: isUSPS ? 'USPS' : 'Unknown'
    });
  } catch (error) {
    console.error('Error checking tracking format:', error);
    res.status(500).json({ error: 'Failed to check tracking format' });
  }
});

// Get USPS API configuration status
app.get('/api/tracking/usps/status', authenticateToken, requireWorker, (req, res) => {
  res.json({
    configured: uspsAPI.isConfigured(),
    message: uspsAPI.isConfigured()
      ? 'USPS API is configured and ready'
      : 'USPS API credentials not configured'
  });
});

// ==================== RECIPIENT ROUTES ====================
// CRUD Matrix for Recipients:
// - Students: NO ACCESS
// - Workers: CREATE, READ, UPDATE, DELETE

// Get all recipients (worker only) - READ
app.get('/api/recipients', authenticateToken, requireWorker, async (req, res) => {
  try {
    const recipients = await db.getAllRecipients();
    res.json(recipients);
  } catch (error) {
    console.error('Error fetching recipients:', error);
    res.status(500).json({ error: 'Failed to fetch recipients' });
  }
});

// Add new recipient (worker only) - CREATE
app.post('/api/recipients', authenticateToken, requireWorker, async (req, res) => {
  try {
    const { name, lNumber, type, mailbox, email } = req.body;

    if (!name || !lNumber || !type || !mailbox || !email) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if recipient with this L number already exists
    const existingRecipient = await db.getRecipientByLNumber(lNumber);
    if (existingRecipient) {
      return res.status(400).json({ error: 'Recipient with this L number already exists' });
    }

    // Create recipient
    const newRecipient = await db.createRecipient({
      name,
      lNumber,
      type,
      mailbox,
      email
    });

    res.status(201).json(newRecipient);
  } catch (error) {
    console.error('Error adding recipient:', error);
    res.status(500).json({ error: 'Failed to add recipient' });
  }
});

// Update recipient (worker only) - UPDATE
app.put('/api/recipients/:id', authenticateToken, requireWorker, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, lNumber, type, mailbox, email } = req.body;

    if (!name || !lNumber || !type || !mailbox || !email) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if recipient exists
    const existingRecipient = await db.getRecipientById(id);
    if (!existingRecipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    // Update recipient
    const updatedRecipient = await db.updateRecipient(id, {
      name,
      lNumber,
      type,
      mailbox,
      email
    });

    res.json(updatedRecipient);
  } catch (error) {
    console.error('Error updating recipient:', error);
    res.status(500).json({ error: 'Failed to update recipient' });
  }
});

// Delete recipient (worker only) - DELETE
app.delete('/api/recipients/:id', authenticateToken, requireWorker, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if recipient exists
    const existingRecipient = await db.getRecipientById(id);
    if (!existingRecipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    // Delete recipient
    const deleted = await db.deleteRecipient(id);

    if (deleted) {
      res.json({ message: 'Recipient deleted successfully' });
    } else {
      res.status(500).json({ error: 'Failed to delete recipient' });
    }
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

// Email notification endpoint (worker only)
app.post('/api/packages/:id/notify', authenticateToken, requireWorker, async (req, res) => {
  try {
    const { id } = req.params;

    // Get package from database
    const pkg = await db.getPackageById(id);
    if (!pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }

    // Get recipient details
    const recipient = await db.getRecipientById(pkg.recipient_id);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    // Send notification
    await sendPackageNotification(recipient, pkg.tracking_code);

    res.json({ message: 'Notification sent successfully' });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// ==================== SERVE FRONTEND ====================

// Serve static files (CSS, JS, images) - AFTER API routes to avoid conflicts
app.use(express.static('public'));

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

// ==================== START SERVER (for local spinup only) ====================

app.listen(PORT, () => {
  console.log(`UNA Package Tracker Server running on port ${PORT}`);
  console.log(`Access the application at http://localhost:${PORT}`);
  console.log('NOTE: Database not configured - backend team needs to implement database integration');
});
