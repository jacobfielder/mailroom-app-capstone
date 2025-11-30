/**
 * Database Operations Module
 * Handles all CRUD operations for the UNA Package Tracker
 * Uses MongoDB instead of PostgreSQL
 */

import { ObjectId } from 'mongodb';
import { getCollection } from './database.js';

// ==================== USER OPERATIONS ====================

/**
 * Get user by username
 * @param {string} username
 * @returns {Promise<Object|null>}
 */
export async function getUserByUsername(username) {
  const users = await getCollection('users');
  return await users.findOne({ username });
}

/**
 * Get user by email
 * @param {string} email
 * @returns {Promise<Object|null>}
 */
export async function getUserByEmail(email) {
  const users = await getCollection('users');
  return await users.findOne({ email });
}

/**
 * Get user by L number
 * @param {string} lNumber
 * @returns {Promise<Object|null>}
 */
export async function getUserByLNumber(lNumber) {
  const users = await getCollection('users');
  return await users.findOne({ l_number: lNumber });
}

/**
 * Create new user
 * @param {Object} userData
 * @returns {Promise<Object>}
 */
export async function createUser(userData) {
  const { username, passwordHash, type, email, fullName, lNumber } = userData;

  const users = await getCollection('users');

  const newUser = {
    username,
    password_hash: passwordHash,
    type,
    email: email || null,
    full_name: fullName || null,
    l_number: lNumber || null,
    created_at: new Date(),
    updated_at: new Date()
  };

  const result = await users.insertOne(newUser);

  return {
    id: result.insertedId,
    ...newUser
  };
}

// ==================== RECIPIENT OPERATIONS ====================

/**
 * Get all recipients
 * @returns {Promise<Array>}
 */
export async function getAllRecipients() {
  const recipients = await getCollection('recipients');
  return await recipients.find({}).sort({ name: 1 }).toArray();
}

/**
 * Get recipient by ID
 * @param {string|number} id
 * @returns {Promise<Object|null>}
 */
export async function getRecipientById(id) {
  const recipients = await getCollection('recipients');
  // Handle both MongoDB ObjectId and numeric IDs
  const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id: parseInt(id) };
  return await recipients.findOne(query);
}

/**
 * Get recipient by L number
 * @param {string} lNumber
 * @returns {Promise<Object|null>}
 */
export async function getRecipientByLNumber(lNumber) {
  const recipients = await getCollection('recipients');
  return await recipients.findOne({ l_number: lNumber });
}

/**
 * Create new recipient
 * @param {Object} recipientData
 * @returns {Promise<Object>}
 */
export async function createRecipient(recipientData) {
  const { name, lNumber, type, mailbox, email } = recipientData;

  const recipients = await getCollection('recipients');

  const newRecipient = {
    name,
    l_number: lNumber,
    type,
    mailbox,
    email,
    created_at: new Date(),
    updated_at: new Date()
  };

  const result = await recipients.insertOne(newRecipient);

  return {
    id: result.insertedId,
    ...newRecipient
  };
}

/**
 * Update recipient
 * @param {string|number} id
 * @param {Object} recipientData
 * @returns {Promise<Object|null>}
 */
export async function updateRecipient(id, recipientData) {
  const { name, lNumber, type, mailbox, email } = recipientData;

  const recipients = await getCollection('recipients');
  const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id: parseInt(id) };

  const updateDoc = {
    $set: {
      name,
      l_number: lNumber,
      type,
      mailbox,
      email,
      updated_at: new Date()
    }
  };

  const result = await recipients.findOneAndUpdate(
    query,
    updateDoc,
    { returnDocument: 'after' }
  );

  return result.value;
}

/**
 * Delete recipient
 * @param {string|number} id
 * @returns {Promise<boolean>}
 */
export async function deleteRecipient(id) {
  const recipients = await getCollection('recipients');
  const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id: parseInt(id) };

  const result = await recipients.deleteOne(query);
  return result.deletedCount > 0;
}

// ==================== PACKAGE OPERATIONS ====================

/**
 * Get all packages
 * @returns {Promise<Array>}
 */
export async function getAllPackages() {
  const packages = await getCollection('packages');
  return await packages.find({}).sort({ check_in_date: -1 }).toArray();
}

/**
 * Get packages by L number (for students to view their packages)
 * @param {string} lNumber
 * @returns {Promise<Array>}
 */
export async function getPackagesByLNumber(lNumber) {
  const packages = await getCollection('packages');
  return await packages.find({ l_number: lNumber }).sort({ check_in_date: -1 }).toArray();
}

/**
 * Get package by ID
 * @param {string|number} id
 * @returns {Promise<Object|null>}
 */
export async function getPackageById(id) {
  const packages = await getCollection('packages');
  const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id: parseInt(id) };
  return await packages.findOne(query);
}

/**
 * Get package by tracking code
 * @param {string} trackingCode
 * @returns {Promise<Object|null>}
 */
export async function getPackageByTrackingCode(trackingCode) {
  const packages = await getCollection('packages');
  return await packages.findOne({ tracking_code: trackingCode });
}

/**
 * Create new package (check-in)
 * @param {Object} packageData
 * @returns {Promise<Object>}
 */
export async function createPackage(packageData) {
  const {
    trackingCode,
    carrier,
    recipientId,
    recipientName,
    lNumber,
    mailbox,
    carrierStatus,
    serviceType,
    expectedDelivery,
    lastLocation,
    carrierData
  } = packageData;

  const packages = await getCollection('packages');

  const newPackage = {
    tracking_code: trackingCode,
    carrier,
    status: 'Checked In',
    recipient_id: recipientId,
    recipient_name: recipientName,
    l_number: lNumber,
    mailbox,
    carrier_status: carrierStatus || null,
    service_type: serviceType || null,
    expected_delivery: expectedDelivery || null,
    last_location: lastLocation || null,
    carrier_data: carrierData || {},
    check_in_date: new Date(),
    checkout_date: null,
    last_updated: new Date(),
    created_at: new Date()
  };

  const result = await packages.insertOne(newPackage);

  return {
    id: result.insertedId,
    ...newPackage
  };
}

/**
 * Update package
 * @param {string|number} id
 * @param {Object} packageData
 * @returns {Promise<Object|null>}
 */
export async function updatePackage(id, packageData) {
  const packages = await getCollection('packages');
  const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id: parseInt(id) };

  // Build update object with only provided fields
  const updateFields = {};

  if (packageData.trackingCode !== undefined) updateFields.tracking_code = packageData.trackingCode;
  if (packageData.carrier !== undefined) updateFields.carrier = packageData.carrier;
  if (packageData.status !== undefined) updateFields.status = packageData.status;
  if (packageData.recipientId !== undefined) updateFields.recipient_id = packageData.recipientId;
  if (packageData.recipientName !== undefined) updateFields.recipient_name = packageData.recipientName;
  if (packageData.lNumber !== undefined) updateFields.l_number = packageData.lNumber;
  if (packageData.mailbox !== undefined) updateFields.mailbox = packageData.mailbox;
  if (packageData.carrierStatus !== undefined) updateFields.carrier_status = packageData.carrierStatus;
  if (packageData.serviceType !== undefined) updateFields.service_type = packageData.serviceType;
  if (packageData.expectedDelivery !== undefined) updateFields.expected_delivery = packageData.expectedDelivery;
  if (packageData.lastLocation !== undefined) updateFields.last_location = packageData.lastLocation;
  if (packageData.carrierData !== undefined) updateFields.carrier_data = packageData.carrierData;

  updateFields.last_updated = new Date();

  const result = await packages.findOneAndUpdate(
    query,
    { $set: updateFields },
    { returnDocument: 'after' }
  );

  return result.value;
}

/**
 * Check out package (mark as picked up)
 * @param {string|number} id
 * @returns {Promise<Object|null>}
 */
export async function checkoutPackage(id) {
  const packages = await getCollection('packages');
  const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id: parseInt(id) };

  const result = await packages.findOneAndUpdate(
    query,
    {
      $set: {
        status: 'Picked Up',
        checkout_date: new Date()
      }
    },
    { returnDocument: 'after' }
  );

  return result.value;
}

/**
 * Delete package
 * @param {string|number} id
 * @returns {Promise<boolean>}
 */
export async function deletePackage(id) {
  const packages = await getCollection('packages');
  const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id: parseInt(id) };

  const result = await packages.deleteOne(query);
  return result.deletedCount > 0;
}

/**
 * Get package statistics
 * @returns {Promise<Object>}
 */
export async function getPackageStats() {
  const packages = await getCollection('packages');

  const stats = await packages.aggregate([
    {
      $facet: {
        total: [{ $count: 'count' }],
        checkedIn: [
          { $match: { status: 'Checked In' } },
          { $count: 'count' }
        ],
        pickedUp: [
          { $match: { status: 'Picked Up' } },
          { $count: 'count' }
        ],
        carriers: [
          { $group: { _id: '$carrier' } },
          { $count: 'count' }
        ],
        recipients: [
          { $group: { _id: '$l_number' } },
          { $count: 'count' }
        ]
      }
    }
  ]).toArray();

  const result = stats[0];

  return {
    total_packages: result.total[0]?.count || 0,
    checked_in: result.checkedIn[0]?.count || 0,
    picked_up: result.pickedUp[0]?.count || 0,
    unique_carriers: result.carriers[0]?.count || 0,
    unique_recipients: result.recipients[0]?.count || 0
  };
}

// ==================== AUDIT LOG OPERATIONS ====================

/**
 * Log an audit event
 * @param {Object} auditData
 * @returns {Promise<Object>}
 */
export async function logAuditEvent(auditData) {
  const { userId, action, entityType, entityId, details } = auditData;

  const logs = await getCollection('logs');

  const logEntry = {
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details: details || null,
    created_at: new Date()
  };

  const result = await logs.insertOne(logEntry);

  return {
    id: result.insertedId,
    ...logEntry
  };
}

/**
 * Get audit logs
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function getAuditLogs(limit = 100) {
  const logs = await getCollection('logs');

  // Aggregate with users collection to get user details
  const result = await logs.aggregate([
    {
      $lookup: {
        from: 'users',
        localField: 'user_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: {
        path: '$user',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        _id: 1,
        user_id: 1,
        action: 1,
        entity_type: 1,
        entity_id: 1,
        details: 1,
        created_at: 1,
        username: '$user.username',
        user_type: '$user.type'
      }
    },
    { $sort: { created_at: -1 } },
    { $limit: limit }
  ]).toArray();

  return result;
}

export default {
  // Users
  getUserByUsername,
  getUserByEmail,
  getUserByLNumber,
  createUser,

  // Recipients
  getAllRecipients,
  getRecipientById,
  getRecipientByLNumber,
  createRecipient,
  updateRecipient,
  deleteRecipient,

  // Packages
  getAllPackages,
  getPackagesByLNumber,
  getPackageById,
  getPackageByTrackingCode,
  createPackage,
  updatePackage,
  checkoutPackage,
  deletePackage,
  getPackageStats,

  // Audit
  logAuditEvent,
  getAuditLogs
};
