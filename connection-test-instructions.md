# MongoDB Atlas Connection Fix - Quick Reference

## The Problem
You're getting an SSL error when trying to connect to MongoDB Atlas.

## Most Likely Cause
Your IP address is not whitelisted in MongoDB Atlas Network Access.

---

## Quick Fix (Do This First!)

### 1. Go to MongoDB Atlas
- Open: https://cloud.mongodb.com
- Log in

### 2. Whitelist Your IP
1. Click **"Network Access"** (left sidebar, under Security)
2. Click **"Add IP Address"** (green button)
3. Click **"Allow Access from Anywhere"**
4. Click **"Confirm"**
5. **Wait 1-2 minutes**

### 3. Test Again
```bash
node test-db-connection.js
```

---

## If Still Not Working

### Check Database User
1. Click **"Database Access"** (left sidebar)
2. Verify user `mduran` exists and is Active
3. If needed, edit and reset the password

### Check Cluster
1. Click **"Database"** (left sidebar)
2. Make sure cluster status is "Active" (not "Paused")

### Get Fresh Connection String
1. Click "Database" → "Connect" on your cluster
2. Choose "Drivers"
3. Copy connection string
4. Replace `<password>` with actual password
5. Add `/mailroom` before the `?`
6. Update `.env` file

---

## Current Connection String Format

Your connection string should look like this:

```
mongodb+srv://mduran:PASSWORD@main.dujgk7d.mongodb.net/mailroom?retryWrites=true&w=majority
```

**Important parts:**
- ✅ Username: `mduran`
- ✅ Password: Your actual password (special chars need encoding)
- ✅ Host: `main.dujgk7d.mongodb.net`
- ✅ Database: `/mailroom` (must be there!)

**Special Character Encoding:**
- `!` → `%21`
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `^` → `%5E`
- `&` → `%26`
- `*` → `%2A`

---

## Success Looks Like

When it works, you'll see:
```
✓ Successfully connected to MongoDB Atlas!
✓ MongoDB Version: 7.x.x
✓ Database name: mailroom
```

Then run:
```bash
node mongodb-setup.js
npm run dev
```

---

## Still Stuck?

Common issues:
1. **Didn't wait after adding IP** → Wait 1-2 minutes
2. **Wrong password** → Reset it in Database Access
3. **Cluster paused** → Resume it in Database view
4. **Special chars in password** → URL encode them
5. **Missing /mailroom in connection string** → Add it before the ?
