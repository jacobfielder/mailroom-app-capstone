-- Quick Database Setup Script
-- Run this as postgres superuser first to create database and user
-- Usage: psql -U postgres -f setup-database.sql

-- Create database
CREATE DATABASE main;

-- Create user
CREATE USER app_user WITH PASSWORD 'SomeStrongPassword123';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE main TO app_user;

-- Connect to the main database
\c main

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO app_user;

\echo 'Database and user created successfully!'
\echo 'Next step: Run schema.sql to create tables'
\echo 'Command: psql -h 127.0.0.1 -U app_user -d main -f schema.sql'
