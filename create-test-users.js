/**
 * Create Test Users Script
 * Creates sample worker and student accounts for testing
 */

import 'dotenv/config';
import bcryptjs from 'bcryptjs';
import { getCollection } from './services/database.js';

async function createTestUsers() {
  console.log('Creating test users...\n');

  try {
    const users = await getCollection('users');

    // Test Worker Account
    const workerPassword = await bcryptjs.hash('worker123', 10);
    const worker = {
      username: 'worker1',
      password_hash: workerPassword,
      type: 'worker',
      email: 'worker@test.com',
      full_name: 'Test Worker',
      l_number: null,
      created_at: new Date(),
      updated_at: new Date()
    };

    // Test Student Account
    const studentPassword = await bcryptjs.hash('student123', 10);
    const student = {
      username: 'student1',
      password_hash: studentPassword,
      type: 'student',
      email: 'student@test.com',
      full_name: 'Test Student',
      l_number: 'L00123456',
      created_at: new Date(),
      updated_at: new Date()
    };

    // Check if users already exist
    const existingWorker = await users.findOne({ username: 'worker1' });
    if (existingWorker) {
      console.log('⚠ Worker account already exists');
    } else {
      await users.insertOne(worker);
      console.log('✓ Created worker account:');
      console.log('  Username: worker1');
      console.log('  Password: worker123');
      console.log('  Type: worker');
      console.log('  Email: worker@test.com\n');
    }

    const existingStudent = await users.findOne({ username: 'student1' });
    if (existingStudent) {
      console.log('⚠ Student account already exists');
    } else {
      await users.insertOne(student);
      console.log('✓ Created student account:');
      console.log('  Username: student1');
      console.log('  Password: student123');
      console.log('  Type: student');
      console.log('  Email: student@test.com');
      console.log('  L Number: L00123456\n');
    }

    // Create a test recipient for the student
    const recipients = await getCollection('recipients');
    const existingRecipient = await recipients.findOne({ l_number: 'L00123456' });

    if (!existingRecipient) {
      const recipient = {
        name: 'Test Student',
        l_number: 'L00123456',
        type: 'student',
        mailbox: 'MB-101',
        email: 'student@test.com',
        created_at: new Date(),
        updated_at: new Date()
      };
      await recipients.insertOne(recipient);
      console.log('✓ Created recipient record for student:');
      console.log('  L Number: L00123456');
      console.log('  Mailbox: MB-101\n');
    } else {
      console.log('⚠ Recipient record already exists\n');
    }

    console.log('==============================================');
    console.log('✅ Test users created successfully!');
    console.log('==============================================\n');
    console.log('You can now log in with:');
    console.log('\nWorker Account (Admin Access):');
    console.log('  Email: worker@test.com');
    console.log('  Password: worker123');
    console.log('\nStudent Account (View Own Packages):');
    console.log('  Email: student@test.com');
    console.log('  Password: student123\n');
    console.log('Go to: http://localhost:3000\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test users:', error.message);
    process.exit(1);
  }
}

createTestUsers();
