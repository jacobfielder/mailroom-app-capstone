/**
 * MongoDB Atlas Setup Script
 * Creates indexes and initial collections for the UNA Package Tracker
 */

import 'dotenv/config';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

async function setupMongoDB() {
  console.log('==============================================');
  console.log('MongoDB Atlas Setup & Initialization');
  console.log('==============================================\n');

  if (!uri || uri.includes('YOUR_USERNAME')) {
    console.error('❌ Error: MONGODB_URI not configured in .env file');
    console.log('\nPlease update your .env file with your MongoDB Atlas connection string:');
    console.log('MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/mailroom?retryWrites=true&w=majority\n');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    // Connect to MongoDB
    console.log('1. Connecting to MongoDB Atlas...');
    await client.connect();
    console.log('✓ Connected successfully!\n');

    const db = client.db();
    console.log(`✓ Database: ${db.databaseName}\n`);

    // Create collections if they don't exist
    console.log('2. Creating collections...');
    const collections = ['users', 'recipients', 'packages', 'logs'];

    for (const collectionName of collections) {
      const collectionsList = await db.listCollections({ name: collectionName }).toArray();
      if (collectionsList.length === 0) {
        await db.createCollection(collectionName);
        console.log(`  ✓ Created collection: ${collectionName}`);
      } else {
        console.log(`  ✓ Collection exists: ${collectionName}`);
      }
    }
    console.log('');

    // Create indexes for users collection
    console.log('3. Creating indexes for users collection...');
    const users = db.collection('users');
    await users.createIndex({ username: 1 }, { unique: true });
    await users.createIndex({ email: 1 }, { unique: true, sparse: true });
    await users.createIndex({ l_number: 1 }, { unique: true, sparse: true });
    await users.createIndex({ type: 1 });
    console.log('  ✓ Created indexes: username, email, l_number, type\n');

    // Create indexes for recipients collection
    console.log('4. Creating indexes for recipients collection...');
    const recipients = db.collection('recipients');
    await recipients.createIndex({ l_number: 1 }, { unique: true });
    await recipients.createIndex({ email: 1 });
    await recipients.createIndex({ name: 1 });
    console.log('  ✓ Created indexes: l_number, email, name\n');

    // Create indexes for packages collection
    console.log('5. Creating indexes for packages collection...');
    const packages = db.collection('packages');
    await packages.createIndex({ tracking_code: 1 }, { unique: true });
    await packages.createIndex({ l_number: 1 });
    await packages.createIndex({ status: 1 });
    await packages.createIndex({ recipient_id: 1 });
    await packages.createIndex({ check_in_date: -1 });
    console.log('  ✓ Created indexes: tracking_code, l_number, status, recipient_id, check_in_date\n');

    // Create indexes for logs collection
    console.log('6. Creating indexes for logs collection...');
    const logs = db.collection('logs');
    await logs.createIndex({ user_id: 1 });
    await logs.createIndex({ entity_type: 1 });
    await logs.createIndex({ created_at: -1 });
    await logs.createIndex({ action: 1 });
    console.log('  ✓ Created indexes: user_id, entity_type, created_at, action\n');

    // Display collection stats
    console.log('7. Database Statistics:');
    for (const collectionName of collections) {
      const collection = db.collection(collectionName);
      const count = await collection.countDocuments();
      console.log(`  ${collectionName}: ${count} document(s)`);
    }
    console.log('');

    console.log('==============================================');
    console.log('✅ MongoDB setup completed successfully!');
    console.log('==============================================\n');
    console.log('Next steps:');
    console.log('1. Start your application: npm run dev');
    console.log('2. Register a worker account to access admin features');
    console.log('3. Start tracking packages!\n');

  } catch (error) {
    console.error('\n❌ Setup failed!');
    console.error('Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Verify your MONGODB_URI in .env is correct');
    console.error('2. Check your MongoDB Atlas network access (whitelist your IP)');
    console.error('3. Verify your database user has read/write permissions');
    console.error('4. Check if your cluster is running\n');
    process.exit(1);
  } finally {
    await client.close();
  }
}

setupMongoDB();
