/**
 * Test MongoDB Atlas Connection Script
 * Run this to verify your MongoDB connection is working
 */

import 'dotenv/config';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

async function testConnection() {
  console.log('Testing MongoDB Atlas Connection...\n');

  if (!uri) {
    console.error('❌ Error: MONGODB_URI not found in environment variables');
    console.log('\nPlease set MONGODB_URI in your .env file:');
    console.log('MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/mailroom?retryWrites=true&w=majority\n');
    process.exit(1);
  }

  if (uri.includes('YOUR_USERNAME') || uri.includes('YOUR_PASSWORD')) {
    console.error('❌ Error: MONGODB_URI contains placeholder values');
    console.log('\nPlease update your .env file with your actual MongoDB Atlas credentials\n');
    process.exit(1);
  }

  console.log('Configuration:');
  // Parse URI to show safe info
  try {
    const url = new URL(uri);
    console.log(`  Protocol: ${url.protocol}`);
    console.log(`  Host: ${url.hostname}`);
    console.log(`  Database: ${url.pathname.slice(1).split('?')[0] || 'default'}`);
    console.log(`  Username: ${url.username || 'not set'}`);
    console.log(`  Password: ${url.password ? '***' : 'not set'}`);
  } catch (e) {
    console.log('  URI format: Unable to parse (check format)');
  }
  console.log('\n');

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000
  });

  try {
    // Test basic connection
    console.log('1. Testing basic connection...');
    await client.connect();
    console.log('✓ Successfully connected to MongoDB Atlas!\n');

    const db = client.db();

    // Test database version
    console.log('2. Checking MongoDB version...');
    const buildInfo = await db.admin().serverInfo();
    console.log(`✓ MongoDB Version: ${buildInfo.version}\n`);

    // Check database name
    console.log('3. Checking database...');
    console.log(`✓ Database name: ${db.databaseName}\n`);

    // List collections
    console.log('4. Checking for collections...');
    const collections = await db.listCollections().toArray();

    if (collections.length === 0) {
      console.log('⚠ No collections found in database.');
      console.log('  Run the setup script to create collections and indexes:');
      console.log('  node mongodb-setup.js\n');
    } else {
      console.log('✓ Found the following collections:');
      collections.forEach(col => {
        console.log(`  - ${col.name}`);
      });
      console.log('');
    }

    // Check required collections
    const requiredCollections = ['users', 'recipients', 'packages', 'logs'];
    console.log('5. Verifying required collections...');
    const existingCollections = collections.map(col => col.name);

    let allCollectionsExist = true;
    for (const collectionName of requiredCollections) {
      if (existingCollections.includes(collectionName)) {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();
        console.log(`  ✓ ${collectionName} collection exists (${count} documents)`);
      } else {
        console.log(`  ✗ ${collectionName} collection is MISSING`);
        allCollectionsExist = false;
      }
    }
    console.log('');

    if (!allCollectionsExist) {
      console.log('⚠ Some collections are missing. Please run mongodb-setup.js to create them.\n');
    }

    // Test a ping command
    console.log('6. Testing database ping...');
    const pingResult = await db.command({ ping: 1 });
    console.log(`✓ Ping response: ${JSON.stringify(pingResult)}\n`);

    console.log('==============================================');
    console.log('✅ MongoDB connection test completed successfully!');
    console.log('==============================================\n');

    if (allCollectionsExist) {
      console.log('Your database is ready to use!');
      console.log('Start your application with: npm run dev\n');
    } else {
      console.log('Next step: Run setup script to create collections');
      console.log('Command: node mongodb-setup.js\n');
    }

    await client.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database connection failed!');
    console.error('Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Verify your MONGODB_URI in .env is correct');
    console.error('2. Check MongoDB Atlas network access:');
    console.error('   - Go to Network Access in Atlas dashboard');
    console.error('   - Whitelist your IP address or allow access from anywhere (0.0.0.0/0)');
    console.error('3. Verify database user credentials are correct');
    console.error('4. Check if your cluster is running and not paused');
    console.error('5. Make sure your connection string includes the database name\n');

    await client.close();
    process.exit(1);
  }
}

testConnection();
