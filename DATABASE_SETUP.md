# PostgreSQL Database Setup Guide

## Overview
This guide will help you set up PostgreSQL database for the UNA Package Tracker application.

## Prerequisites
- PostgreSQL 12+ installed on your system
- Database credentials configured in `.env` file

## Step 1: Verify PostgreSQL is Running

### Windows
1. Open Services (Win + R, type `services.msc`)
2. Look for "postgresql-x64-XX" service
3. Make sure it's running (Status: "Running")
4. If not running, right-click and select "Start"

**OR** using Command Prompt:
```cmd
pg_ctl status -D "C:\Program Files\PostgreSQL\XX\data"
```

### macOS/Linux
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL if not running
sudo systemctl start postgresql

# Or on macOS with Homebrew:
brew services start postgresql
```

## Step 2: Verify Database Configuration

Check your `.env` file has the correct settings:

```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=main
DB_USER=app_user
DB_PASSWORD=SomeStrongPassword123
```

## Step 3: Create Database and User

Connect to PostgreSQL as the postgres superuser:

### Windows
```cmd
psql -U postgres
```

### macOS/Linux
```bash
sudo -u postgres psql
```

Then run these SQL commands:

```sql
-- Create the database
CREATE DATABASE main;

-- Create the user
CREATE USER app_user WITH PASSWORD 'SomeStrongPassword123';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE main TO app_user;

-- Connect to the main database
\c main

-- Grant schema privileges (PostgreSQL 15+)
GRANT ALL ON SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO app_user;

-- Exit psql
\q
```

## Step 4: Run the Schema File

Create the tables by running the schema.sql file:

### Windows (PowerShell or Command Prompt)
```cmd
psql -h 127.0.0.1 -U app_user -d main -f schema.sql
```

### macOS/Linux
```bash
psql -h 127.0.0.1 -U app_user -d main -f schema.sql
```

When prompted, enter the password: `SomeStrongPassword123`

## Step 5: Test the Connection

Run the test script to verify everything is working:

```bash
node test-db-connection.js
```

You should see:
```
✓ Successfully connected to PostgreSQL!
✓ PostgreSQL Version: PostgreSQL XX.X
✓ Found the following tables:
  - users
  - recipients
  - packages
  - audit_log
```

## Step 6: Start the Application

Once the database is set up, start your application:

```bash
npm run dev
```

## Troubleshooting

### Connection Refused (ECONNREFUSED)
**Problem:** PostgreSQL is not running
**Solution:**
- Windows: Start the PostgreSQL service in Services
- Mac/Linux: `sudo systemctl start postgresql` or `brew services start postgresql`

### Authentication Failed
**Problem:** Wrong username or password
**Solution:**
1. Check your `.env` file credentials match what you set in PostgreSQL
2. Verify the user exists: `psql -U postgres -c "\du"`

### Database Does Not Exist
**Problem:** The `main` database hasn't been created
**Solution:**
```sql
-- Connect as postgres user
psql -U postgres

-- Create the database
CREATE DATABASE main;
```

### Permission Denied
**Problem:** User doesn't have privileges
**Solution:**
```sql
-- Connect as postgres user
psql -U postgres -d main

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE main TO app_user;
GRANT ALL ON SCHEMA public TO app_user;
```

### Tables Not Found
**Problem:** Schema hasn't been run yet
**Solution:** Run the schema.sql file (see Step 4)

## Quick Setup Script (Windows PowerShell)

If you're starting fresh, you can use this script:

```powershell
# 1. Create database and user
psql -U postgres -c "CREATE DATABASE main;"
psql -U postgres -c "CREATE USER app_user WITH PASSWORD 'SomeStrongPassword123';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE main TO app_user;"
psql -U postgres -d main -c "GRANT ALL ON SCHEMA public TO app_user;"
psql -U postgres -d main -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;"
psql -U postgres -d main -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_user;"

# 2. Run schema
psql -h 127.0.0.1 -U app_user -d main -f schema.sql

# 3. Test connection
node test-db-connection.js
```

## Database Tables

The schema creates 4 main tables:

1. **users** - Authentication and user management (students and workers)
2. **recipients** - Package recipient information
3. **packages** - Package tracking information
4. **audit_log** - System activity logs (this is your "logs" table)

## Next Steps

After database setup:
1. Create a worker account to access the admin dashboard
2. Test the registration and login features
3. Add some recipients
4. Start checking in packages

## Support

If you encounter issues:
1. Check PostgreSQL is running
2. Verify `.env` credentials are correct
3. Make sure the database and tables exist
4. Check PostgreSQL logs for error details
