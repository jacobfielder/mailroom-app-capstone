import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcrypt';
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

// Initialize SQLite database
let db;

async function initializeDatabase() {
  db = await open({
    filename: process.env.DATABASE_PATH || './una-packages.db',
    driver: sqlite3.Database
  });

  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('student', 'worker', 'faculty', 'staff')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS recipients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      l_number TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('Student', 'Faculty', 'Staff', 'Department')),
      mailbox TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      check_in_date DATE NOT NULL,
      recipient_name TEXT NOT NULL,
      l_number TEXT NOT NULL,
      tracking_code TEXT NOT NULL,
      mailbox TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Checked In' CHECK(status IN ('Checked In', 'Picked Up')),
      email TEXT NOT NULL,
      checked_out_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (l_number) REFERENCES recipients(l_number)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_packages_lnumber ON packages(l_number);
    CREATE INDEX IF NOT EXISTS idx_packages_status ON packages(status);
    CREATE INDEX IF NOT EXISTS idx_recipients_lnumber ON recipients(l_number);
  `);

  // Insert demo data if tables are empty
  const userCount = await db.get('SELECT COUNT(*) as count FROM users');
  if (userCount.count === 0) {
    await seedDatabase();
  }

  console.log('Database initialized successfully');
}

async function seedDatabase() {
  // Create demo worker account
  const hashedPassword = await bcrypt.hash('password', 10);
  
  await db.run(`
    INSERT INTO users (username, password, email, type)
    VALUES (?, ?, ?, ?)
  `, ['worker@una.edu', hashedPassword, 'worker@una.edu', 'worker']);

  // Create demo student account
  await db.run(`
    INSERT INTO users (username, password, email, type)
    VALUES (?, ?, ?, ?)
  `, ['L12345', hashedPassword, 'jsmith@una.edu', 'student']);

  // Insert demo recipients
  const recipients = [
    { name: 'John Smith', lNumber: 'L12345', type: 'Student', mailbox: '101', email: 'jsmith@una.edu' },
    { name: 'Sarah Johnson', lNumber: 'L12346', type: 'Student', mailbox: '102', email: 'sjohnson@una.edu' },
    { name: 'Dr. Michael Brown', lNumber: 'L98765', type: 'Faculty', mailbox: '201', email: 'mbrown@una.edu' },
    { name: 'Emily Davis', lNumber: 'L12347', type: 'Student', mailbox: '103', email: 'edavis@una.edu' },
    { name: 'Computer Science Dept', lNumber: 'L99999', type: 'Department', mailbox: '301', email: 'cs@una.edu' }
  ];

  for (const recipient of recipients) {
    await db.run(`
      INSERT INTO recipients (name, l_number, type, mailbox, email)
      VALUES (?, ?, ?, ?, ?)
    `, [recipient.name, recipient.lNumber, recipient.type, recipient.mailbox, recipient.email]);
  }

  // Insert demo packages
  await db.run(`
    INSERT INTO packages (check_in_date, recipient_name, l_number, tracking_code, mailbox, status, email)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [new Date().toISOString().split('T')[0], 'John Smith', 'L12345', 'USPS1234567890', '101', 'Checked In', 'jsmith@una.edu']);

  console.log('Demo data seeded successfully');
}

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

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, userType } = req.body;

    const user = await db.get(
      'SELECT * FROM users WHERE username = ? AND type = ?',
      [username, userType]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, type: user.type },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        type: user.type
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ==================== PACKAGE ROUTES ====================

// Get all packages (worker only)
app.get('/api/packages', authenticateToken, authorizeWorker, async (req, res) => {
  try {
    const packages = await db.all(`
      SELECT * FROM packages
      ORDER BY check_in_date DESC, created_at DESC
    `);
    res.json(packages);
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

// Get packages for specific user (student/staff)
app.get('/api/packages/my-packages', authenticateToken, async (req, res) => {
  try {
    const packages = await db.all(`
      SELECT * FROM packages
      WHERE l_number = ? AND status = 'Checked In'
      ORDER BY check_in_date DESC
    `, [req.user.username]);
    
    res.json(packages);
  } catch (error) {
    console.error('Error fetching user packages:', error);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

// Check in new package (worker only)
app.post('/api/packages', authenticateToken, authorizeWorker, async (req, res) => {
  try {
    const { trackingCode, recipientId } = req.body;

    const recipient = await db.get('SELECT * FROM recipients WHERE id = ?', [recipientId]);
    
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const result = await db.run(`
      INSERT INTO packages (check_in_date, recipient_name, l_number, tracking_code, mailbox, status, email)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      new Date().toISOString().split('T')[0],
      recipient.name,
      recipient.l_number,
      trackingCode,
      recipient.mailbox,
      'Checked In',
      recipient.email
    ]);

    // Log action
    await db.run(`
      INSERT INTO audit_log (user_id, action, entity_type, entity_id, details)
      VALUES (?, ?, ?, ?, ?)
    `, [req.user.id, 'CREATE', 'package', result.lastID, `Checked in package ${trackingCode}`]);

    // Send email notification
    await sendPackageNotification(recipient, trackingCode);

    const newPackage = await db.get('SELECT * FROM packages WHERE id = ?', [result.lastID]);
    res.status(201).json(newPackage);
  } catch (error) {
    console.error('Error checking in package:', error);
    res.status(500).json({ error: 'Failed to check in package' });
  }
});

// Check out package (worker only)
app.patch('/api/packages/:id/checkout', authenticateToken, authorizeWorker, async (req, res) => {
  try {
    await db.run(`
      UPDATE packages
      SET status = 'Picked Up', checked_out_date = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [req.params.id]);

    // Log action
    await db.run(`
      INSERT INTO audit_log (user_id, action, entity_type, entity_id, details)
      VALUES (?, ?, ?, ?, ?)
    `, [req.user.id, 'UPDATE', 'package', req.params.id, 'Checked out package']);

    const updatedPackage = await db.get('SELECT * FROM packages WHERE id = ?', [req.params.id]);
    res.json(updatedPackage);
  } catch (error) {
    console.error('Error checking out package:', error);
    res.status(500).json({ error: 'Failed to check out package' });
  }
});

// Delete package (worker only)
app.delete('/api/packages/:id', authenticateToken, authorizeWorker, async (req, res) => {
  try {
    await db.run('DELETE FROM packages WHERE id = ?', [req.params.id]);

    // Log action
    await db.run(`
      INSERT INTO audit_log (user_id, action, entity_type, entity_id, details)
      VALUES (?, ?, ?, ?, ?)
    `, [req.user.id, 'DELETE', 'package', req.params.id, 'Deleted package']);

    res.json({ message: 'Package deleted successfully' });
  } catch (error) {
    console.error('Error deleting package:', error);
    res.status(500).json({ error: 'Failed to delete package' });
  }
});

// ==================== RECIPIENT ROUTES ====================

// Get all recipients (worker only)
app.get('/api/recipients', authenticateToken, authorizeWorker, async (req, res) => {
  try {
    const recipients = await db.all('SELECT * FROM recipients ORDER BY name ASC');
    res.json(recipients);
  } catch (error) {
    console.error('Error fetching recipients:', error);
    res.status(500).json({ error: 'Failed to fetch recipients' });
  }
});

// Add new recipient (worker only)
app.post('/api/recipients', authenticateToken, authorizeWorker, async (req, res) => {
  try {
    const { name, lNumber, type, mailbox, email } = req.body;

    const result = await db.run(`
      INSERT INTO recipients (name, l_number, type, mailbox, email)
      VALUES (?, ?, ?, ?, ?)
    `, [name, lNumber, type, mailbox, email]);

    // Log action
    await db.run(`
      INSERT INTO audit_log (user_id, action, entity_type, entity_id, details)
      VALUES (?, ?, ?, ?, ?)
    `, [req.user.id, 'CREATE', 'recipient', result.lastID, `Added recipient ${name}`]);

    const newRecipient = await db.get('SELECT * FROM recipients WHERE id = ?', [result.lastID]);
    res.status(201).json(newRecipient);
  } catch (error) {
    console.error('Error adding recipient:', error);
    if (error.message.includes('UNIQUE constraint')) {
      res.status(409).json({ error: 'L Number already exists' });
    } else {
      res.status(500).json({ error: 'Failed to add recipient' });
    }
  }
});

// Delete recipient (worker only)
app.delete('/api/recipients/:id', authenticateToken, authorizeWorker, async (req, res) => {
  try {
    const recipient = await db.get('SELECT * FROM recipients WHERE id = ?', [req.params.id]);
    
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    // Check if recipient has pending packages
    const pendingPackages = await db.get(
      'SELECT COUNT(*) as count FROM packages WHERE l_number = ? AND status = "Checked In"',
      [recipient.l_number]
    );

    if (pendingPackages.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete recipient with pending packages. Please check out all packages first.' 
      });
    }

    await db.run('DELETE FROM recipients WHERE id = ?', [req.params.id]);

    // Log action
    await db.run(`
      INSERT INTO audit_log (user_id, action, entity_type, entity_id, details)
      VALUES (?, ?, ?, ?, ?)
    `, [req.user.id, 'DELETE', 'recipient', req.params.id, `Deleted recipient ${recipient.name}`]);

    res.json({ message: 'Recipient deleted successfully' });
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
app.post('/api/packages/:id/notify', authenticateToken, authorizeWorker, async (req, res) => {
  try {
    const pkg = await db.get('SELECT * FROM packages WHERE id = ?', [req.params.id]);
    
    if (!pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }

    await sendPackageNotification(
      { name: pkg.recipient_name, email: pkg.email, mailbox: pkg.mailbox },
      pkg.tracking_code
    );

    res.json({ message: 'Notification sent successfully' });
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

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`UNA Package Tracker Server running on port ${PORT}`);
      console.log(`Access the application at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });
