-- UNA Package Tracker Database Schema
-- PostgreSQL Database Schema for Users and Logs tables

-- Drop existing tables if they exist (for fresh setup)
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS packages CASCADE;
DROP TABLE IF EXISTS recipients CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ==================== USERS TABLE ====================
-- Stores authentication and user information for both workers and students
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('student', 'worker')),
  email VARCHAR(255) UNIQUE,
  full_name VARCHAR(255),
  l_number VARCHAR(50) UNIQUE, -- Student L number (null for workers)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_l_number ON users(l_number);
CREATE INDEX idx_users_type ON users(type);

-- ==================== RECIPIENTS TABLE ====================
-- Stores package recipient information
CREATE TABLE recipients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  l_number VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('student', 'staff', 'faculty')),
  mailbox VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on l_number for faster lookups
CREATE INDEX idx_recipients_l_number ON recipients(l_number);
CREATE INDEX idx_recipients_email ON recipients(email);

-- ==================== PACKAGES TABLE ====================
-- Stores package tracking information
CREATE TABLE packages (
  id SERIAL PRIMARY KEY,
  tracking_code VARCHAR(255) UNIQUE NOT NULL,
  carrier VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'Checked In' CHECK (status IN ('Checked In', 'Picked Up')),

  -- Recipient information (denormalized for performance)
  recipient_id INTEGER REFERENCES recipients(id) ON DELETE SET NULL,
  recipient_name VARCHAR(255) NOT NULL,
  l_number VARCHAR(50) NOT NULL,
  mailbox VARCHAR(50) NOT NULL,

  -- Carrier tracking information
  carrier_status VARCHAR(255), -- Status from carrier API
  service_type VARCHAR(100), -- Service type (e.g., Priority Mail, First Class)
  expected_delivery DATE, -- Expected delivery date
  last_location VARCHAR(255), -- Last known location
  carrier_data JSONB, -- Full carrier API response

  -- Timestamps
  check_in_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  checkout_date TIMESTAMP,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX idx_packages_tracking_code ON packages(tracking_code);
CREATE INDEX idx_packages_l_number ON packages(l_number);
CREATE INDEX idx_packages_status ON packages(status);
CREATE INDEX idx_packages_recipient_id ON packages(recipient_id);
CREATE INDEX idx_packages_check_in_date ON packages(check_in_date DESC);

-- ==================== AUDIT LOG TABLE ====================
-- Stores audit trail of all system actions
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL, -- e.g., 'CREATE', 'UPDATE', 'DELETE'
  entity_type VARCHAR(100) NOT NULL, -- e.g., 'package', 'recipient', 'user'
  entity_id INTEGER, -- ID of the affected entity
  details TEXT, -- Additional details about the action
  ip_address VARCHAR(45), -- IP address of user
  user_agent TEXT, -- Browser/client information
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for audit log queries
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_entity_type ON audit_log(entity_type);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_action ON audit_log(action);

-- ==================== TRIGGERS ====================
-- Update updated_at timestamp automatically

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipients_updated_at BEFORE UPDATE ON recipients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_packages_last_updated BEFORE UPDATE ON packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== SAMPLE DATA (Optional) ====================
-- Uncomment to insert sample data for testing

-- Sample worker user (password: worker123)
INSERT INTO users (username, password_hash, type, email, full_name) VALUES
  ('worker1', '$2a$10$YourHashedPasswordHere', 'worker', 'worker@una.edu', 'John Worker');

-- Sample student user (password: student123)
-- INSERT INTO users (username, password_hash, type, email, full_name, l_number) VALUES
--   ('student1', '$2a$10$YourHashedPasswordHere', 'student', 'student@una.edu', 'Jane Student', 'L00123456');

-- Sample recipients
-- INSERT INTO recipients (name, l_number, type, mailbox, email) VALUES
--   ('Jane Smith', 'L00123456', 'student', 'MB-101', 'jsmith@una.edu'),
--   ('Dr. John Doe', 'L00789012', 'faculty', 'MB-202', 'jdoe@una.edu');

COMMIT;
