/**
 * MongoDB Database Connection
 * Connects to MongoDB Atlas
 */

import 'dotenv/config';
import { MongoClient } from 'mongodb';

// MongoDB connection URI from environment
const uri = process.env.MONGODB_URI;

// Create MongoDB client
const client = new MongoClient(uri, {
  maxPoolSize: 20,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});

let db;
let isConnected = false;

/**
 * Connect to MongoDB
 */
async function connect() {
  if (isConnected) {
    return db;
  }

  try {
    await client.connect();
    db = client.db(); // Uses database from connection string
    isConnected = true;
    console.log('✓ Connected to MongoDB Atlas');
    return db;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    throw error;
  }
}

/**
 * Get database instance
 * @returns {Promise<Db>} MongoDB database instance
 */
export async function getDb() {
  if (!isConnected) {
    await connect();
  }
  return db;
}

/**
 * Get a collection
 * @param {string} collectionName - Name of the collection
 * @returns {Promise<Collection>} MongoDB collection
 */
export async function getCollection(collectionName) {
  const database = await getDb();
  return database.collection(collectionName);
}

/**
 * Check if database is configured
 * @returns {boolean}
 */
export function isConfigured() {
  return !!(process.env.MONGODB_URI);
}

/**
 * Test connection
 */
export async function testConnection() {
  try {
    const database = await getDb();
    await database.command({ ping: 1 });
    console.log("✅ MongoDB connection test successful");
    return true;
  } catch (err) {
    console.error("❌ MongoDB connection test failed:", err.message);
    return false;
  }
}

/**
 * Close all database connections
 */
export async function close() {
  if (client) {
    await client.close();
    isConnected = false;
    console.log('MongoDB connections closed');
  }
}

// Initialize connection on module load
connect().catch(err => {
  console.error('Failed to initialize MongoDB connection:', err.message);
});

// Export client for advanced usage
export { client };
export default { getDb, getCollection, isConfigured, testConnection, close };
