# Multi-Carrier Database Schema Design

## Problem
Different carriers (USPS, FedEx, UPS, DHL) return different data structures:
- USPS: `mailClass`, `expectedDeliveryDate`, `trackingEvents[]`
- FedEx: `serviceType`, `estimatedDeliveryTimestamp`, `scanEvents[]`
- UPS: `service`, `scheduledDeliveryDate`, `packageProgress[]`

How do we store all this without creating a massive table with 100+ nullable columns?

## Solution: Hybrid Schema with JSONB

### Core Table Structure

```sql
CREATE TABLE packages (
  -- Primary identifiers
  id SERIAL PRIMARY KEY,
  tracking_code VARCHAR(100) NOT NULL UNIQUE,

  -- Common fields (all carriers)
  carrier VARCHAR(50) NOT NULL,           -- 'USPS', 'FedEx', 'UPS', 'DHL', etc.
  status VARCHAR(50),                      -- 'Checked In', 'Picked Up', etc.
  check_in_date TIMESTAMP DEFAULT NOW(),
  checkout_date TIMESTAMP,

  -- Recipient info
  recipient_id INTEGER REFERENCES recipients(id),
  recipient_name VARCHAR(255),
  mailbox VARCHAR(50),

  -- Normalized carrier data (common across all carriers)
  carrier_status VARCHAR(100),             -- Latest tracking status from carrier
  service_type VARCHAR(100),               -- Priority Mail, Ground, Express, etc.
  expected_delivery DATE,                  -- Estimated/scheduled delivery date
  last_location VARCHAR(255),              -- Last known location
  last_updated TIMESTAMP,                  -- When tracking was last updated

  -- Carrier-specific data (FLEXIBLE!)
  carrier_data JSONB,                      -- All carrier-specific details

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_packages_tracking ON packages(tracking_code);
CREATE INDEX idx_packages_carrier ON packages(carrier);
CREATE INDEX idx_packages_status ON packages(status);
CREATE INDEX idx_packages_recipient ON packages(recipient_id);
CREATE INDEX idx_packages_check_in_date ON packages(check_in_date);

-- JSONB index for querying carrier-specific data
CREATE INDEX idx_packages_carrier_data ON packages USING GIN (carrier_data);
```

## How It Works

### Example 1: USPS Package
```javascript
const uspsTracking = await uspsAPI.trackPackage('9400...');

await db.query(`
  INSERT INTO packages (
    tracking_code, carrier, recipient_id,
    carrier_status, service_type, expected_delivery,
    last_location, last_updated, carrier_data
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
`, [
  uspsTracking.trackingNumber,
  'USPS',
  recipientId,
  uspsTracking.status,              // "Delivered"
  uspsTracking.service,             // "Priority Mail"
  uspsTracking.deliveryDate,        // "2025-01-15"
  uspsTracking.lastLocation,        // "NEW YORK, NY 10001"
  {
    // USPS-specific fields stored in JSONB
    mailClass: uspsTracking.mailClass,
    trackingEvents: uspsTracking.events,
    expectedDeliveryTime: uspsTracking.expectedTime,
    proofOfDelivery: uspsTracking.pod,
    // Can add any USPS-specific data without schema changes!
  }
]);
```

### Example 2: FedEx Package (Future)
```javascript
const fedexTracking = await fedexAPI.trackPackage('123456789');

await db.query(`
  INSERT INTO packages (
    tracking_code, carrier, recipient_id,
    carrier_status, service_type, expected_delivery,
    last_location, last_updated, carrier_data
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
`, [
  fedexTracking.trackingNumber,
  'FedEx',
  recipientId,
  fedexTracking.latestStatus,       // "In Transit"
  fedexTracking.serviceType,        // "FedEx Ground"
  fedexTracking.estimatedDelivery,  // "2025-01-16"
  fedexTracking.lastScanLocation,   // "MEMPHIS, TN"
  {
    // FedEx-specific fields stored in JSONB
    shipmentType: fedexTracking.shipmentType,
    scanEvents: fedexTracking.scanEvents,
    deliverySignature: fedexTracking.signatureRequired,
    transitDays: fedexTracking.transitDays,
    weight: fedexTracking.weight,
    // Different structure than USPS - no problem!
  }
]);
```

### Example 3: UPS Package (Future)
```javascript
const upsTracking = await upsAPI.trackPackage('1Z999AA10...');

await db.query(`
  INSERT INTO packages (
    tracking_code, carrier, recipient_id,
    carrier_status, service_type, expected_delivery,
    last_location, last_updated, carrier_data
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
`, [
  upsTracking.trackingNumber,
  'UPS',
  recipientId,
  upsTracking.currentStatus,        // "Out for Delivery"
  upsTracking.service,              // "UPS Ground"
  upsTracking.scheduledDelivery,    // "2025-01-17"
  upsTracking.lastActivity.location,
  {
    // UPS-specific fields stored in JSONB
    packageProgress: upsTracking.packageProgress,
    referenceNumbers: upsTracking.referenceNumbers,
    deliveryAttempts: upsTracking.attempts,
    packageWeight: upsTracking.weight,
    dimensions: upsTracking.dimensions,
    // Yet another different structure - still works!
  }
]);
```

## Benefits of JSONB Approach

### ✅ Flexibility
- Add new carriers without schema changes
- Each carrier can have unique fields
- No NULL columns cluttering your table

### ✅ Queryable
PostgreSQL's JSONB is fully queryable:
```sql
-- Find all packages with specific USPS mail class
SELECT * FROM packages
WHERE carrier = 'USPS'
  AND carrier_data->>'mailClass' = 'Priority Mail Express';

-- Find all FedEx packages requiring signature
SELECT * FROM packages
WHERE carrier = 'FedEx'
  AND carrier_data->>'deliverySignature' = 'true';

-- Check if package has proof of delivery (USPS-specific)
SELECT * FROM packages
WHERE carrier_data ? 'proofOfDelivery';
```

### ✅ Performance
- Common queries use indexed columns (fast!)
- Carrier-specific queries use GIN index on JSONB
- Best of both worlds

### ✅ Backward Compatible
- Can add fields without migrations
- Old data still works when you add new carriers
- No downtime for schema changes

## Example: Retrieving Package Data

```javascript
// Get package with all carrier data
const result = await db.query(
  'SELECT * FROM packages WHERE tracking_code = $1',
  ['9400123456789']
);

const pkg = result.rows[0];

// Access common fields
console.log(pkg.carrier);           // "USPS"
console.log(pkg.carrier_status);    // "Delivered"
console.log(pkg.service_type);      // "Priority Mail"

// Access USPS-specific fields
console.log(pkg.carrier_data.mailClass);
console.log(pkg.carrier_data.trackingEvents);

// For FedEx package, same structure but different carrier_data
// console.log(pkg.carrier_data.scanEvents);
// console.log(pkg.carrier_data.weight);
```

## When to Update carrier_data

### Option 1: Store Everything on Check-In
```javascript
// Store full API response on check-in
carrier_data: uspsTracking.rawData
```

### Option 2: Update Periodically
```javascript
// Update tracking status every hour
async function updateTrackingStatus(trackingCode) {
  const pkg = await getPackage(trackingCode);

  let updatedData;
  if (pkg.carrier === 'USPS') {
    updatedData = await uspsAPI.trackPackage(trackingCode);
  } else if (pkg.carrier === 'FedEx') {
    updatedData = await fedexAPI.trackPackage(trackingCode);
  }

  await db.query(`
    UPDATE packages
    SET carrier_status = $1,
        last_location = $2,
        last_updated = NOW(),
        carrier_data = $3
    WHERE tracking_code = $4
  `, [
    updatedData.status,
    updatedData.location,
    updatedData.fullResponse,
    trackingCode
  ]);
}
```

## Migration Strategy

When adding a new carrier:

1. **No schema changes needed!** Just update your code:

```javascript
// services/tracking.js
export async function trackPackage(trackingCode, carrier) {
  let trackingInfo;

  switch (carrier) {
    case 'USPS':
      trackingInfo = await uspsAPI.trackPackage(trackingCode);
      break;
    case 'FedEx':
      trackingInfo = await fedexAPI.trackPackage(trackingCode);
      break;
    case 'UPS':
      trackingInfo = await upsAPI.trackPackage(trackingCode);
      break;
    case 'DHL':
      trackingInfo = await dhlAPI.trackPackage(trackingCode);
      break;
    default:
      throw new Error('Unsupported carrier');
  }

  return {
    // Normalize to common fields
    status: trackingInfo.status,
    serviceType: trackingInfo.service,
    expectedDelivery: trackingInfo.deliveryDate,
    lastLocation: trackingInfo.location,
    // Store everything else in carrier_data
    carrierData: trackingInfo
  };
}
```

## Common Fields Reference

These fields work across ALL carriers:

| Field | Description | Example |
|-------|-------------|---------|
| `carrier` | Carrier name | "USPS", "FedEx", "UPS" |
| `carrier_status` | Latest status from carrier | "Delivered", "In Transit" |
| `service_type` | Service level | "Priority Mail", "Ground" |
| `expected_delivery` | Delivery date | "2025-01-15" |
| `last_location` | Last scan location | "NEW YORK, NY 10001" |
| `last_updated` | Last tracking update | "2025-01-14 15:30:00" |
| `carrier_data` | Everything else (JSONB) | {...} |

## Summary

✅ **Use regular columns** for data you query often (carrier, status, dates)
✅ **Use JSONB** for carrier-specific details
✅ **No schema changes** needed when adding new carriers
✅ **Fully queryable** with PostgreSQL's JSONB operators
✅ **Scales** to unlimited carriers and data structures

This approach gives you the **flexibility** of NoSQL with the **power** of relational databases!
