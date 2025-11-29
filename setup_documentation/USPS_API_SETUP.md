# USPS Tracking API Integration Setup

## Overview
Your mailroom application now includes USPS Tracking API integration to validate tracking numbers when packages are checked in.

## What Was Implemented

### 1. Backend Components

#### `services/usps-api.js`
- USPS API service with OAuth authentication
- `trackPackage(trackingNumber)` - Validates and retrieves tracking information
- `isUSPSTrackingNumber(trackingNumber)` - Pattern matching for USPS formats
- `isConfigured()` - Checks if credentials are set
- Automatic token caching and refresh

#### API Endpoints in `app.mjs`
- `POST /api/tracking/usps/validate` - Validate and track a USPS package (requires auth)
- `GET /api/tracking/usps/check-format/:trackingNumber` - Check if tracking number is USPS format
- `GET /api/tracking/usps/status` - Check if USPS API is configured (requires auth)

### 2. Frontend Components

#### Updated `public/scripts/api-client.js`
- `validateUSPSTracking(trackingNumber)` - Call validation endpoint
- `checkUSPSFormat(trackingNumber)` - Check tracking format
- `getUSPSStatus()` - Get API configuration status

#### Updated `public/scripts/worker.js`
- Automatic USPS validation during package check-in
- Shows validation status messages
- Allows override if validation fails (with confirmation)

## Setup Instructions

### Step 1: Get USPS API Credentials

1. Go to https://developers.usps.com/
2. Register for a developer account
3. Create a new application
4. Obtain your credentials (USPS calls them):
   - **Consumer Key**
   - **Consumer Secret**

### Step 2: Configure Environment Variables

1. Create a `.env` file in your project root (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

2. Add your USPS credentials to `.env`:
   ```env
   USPS_CONSUMER_KEY=your-actual-consumer-key
   USPS_CONSUMER_SECRET=your-actual-consumer-secret
   ```

### Step 3: Install Dependencies & Run

Dependencies are already installed (Express uses native fetch in Node 18+).

Start your server:
```bash
npm start
```

## How It Works

### Package Check-In Flow

1. **Worker enters tracking number** in the check-in form
2. **Carrier detection** identifies if it's a USPS package
3. **USPS validation** (if configured and it's a USPS package):
   - Calls USPS API to validate tracking number
   - Shows service type and current status
   - If validation fails, prompts worker to continue or cancel
4. **Package check-in** proceeds to database (when implemented)

### USPS Tracking Number Patterns Supported

- 20 digits: `12345678901234567890`
- 22 digits starting with 94/93/92/95: `9400123456789012345678`
- Priority Mail Express: `940712345678901234567`
- International formats: `EA123456789US`, `CP123456789US`

## API Response Format

### Successful Validation
```json
{
  "success": true,
  "trackingNumber": "9400123456789012345678",
  "carrier": "USPS",
  "status": "Delivered",
  "deliveryDate": "2025-01-15",
  "service": "Priority Mail",
  "events": [...],
  "lastUpdate": "2025-01-15T14:30:00Z",
  "lastLocation": "NEW YORK, NY 10001"
}
```

### Failed Validation
```json
{
  "success": false,
  "error": "Tracking number not found",
  "trackingNumber": "9400123456789012345678"
}
```

## Testing

### Without USPS Credentials
- Application works normally
- USPS validation is skipped
- All packages can still be checked in

### With USPS Credentials

1. **Test valid USPS tracking number:**
   - Use a real USPS tracking number
   - System should validate and show service/status

2. **Test invalid USPS tracking number:**
   - Use format: `94001234567890123456XX`
   - System should show error and prompt to continue

3. **Test non-USPS tracking number:**
   - Use UPS format: `1Z999AA10123456784`
   - System should skip USPS validation

## Configuration Status Check

Workers can check if USPS API is configured:
```javascript
const status = await apiClient.getUSPSStatus()
// Returns: { configured: true/false, message: "..." }
```

## Error Handling

- **No credentials**: Validation is skipped, package check-in continues
- **Invalid credentials**: Returns error, prompts worker to proceed
- **Network error**: Gracefully falls back, allows manual override
- **Invalid tracking**: Shows error but allows check-in with confirmation

## Future Enhancements

Potential improvements to consider:
- Track package status updates automatically
- Store USPS tracking data in database
- Show tracking history to recipients
- Add support for other carriers (FedEx, UPS APIs)
- Webhook integration for automatic status updates

## API Rate Limits

USPS API has rate limits. Monitor your usage at https://developers.usps.com/

## Troubleshooting

### "USPS API not configured" error
- Check that `.env` file exists
- Verify `USPS_CONSUMER_KEY` and `USPS_CONSUMER_SECRET` are set
- Restart the server after adding credentials

### "OAuth failed" error
- Verify credentials are correct
- Check if your USPS developer account is active
- Ensure your app is approved in the USPS developer portal

### Validation always fails
- Check server console logs for detailed errors
- Verify tracking number is a valid USPS format
- Test with a known valid tracking number from USPS.com

## Security Notes

- Never commit `.env` file to git (already in `.gitignore`)
- Keep USPS credentials secure
- USPS API calls require worker authentication
- Tokens are cached securely server-side

## Support

For USPS API issues:
- Documentation: https://developers.usps.com/apis
- Support: Contact USPS Developer Support

For application issues:
- Check server console logs
- Review browser console for frontend errors
