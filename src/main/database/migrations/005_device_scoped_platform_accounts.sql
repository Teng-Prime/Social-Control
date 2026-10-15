-- Migration 005: Device-scoped platform account uniqueness and legacy alignment
-- 1. Deduplicate any legacy accounts by (device_id, platform), keeping the latest row
DELETE FROM phone_account_credentials
WHERE rowid NOT IN (
  SELECT MAX(rowid)
  FROM phone_account_credentials
  WHERE device_id IS NOT NULL AND device_id != ''
  GROUP BY device_id, platform
) AND device_id IS NOT NULL AND device_id != '';

-- 2. Link any legacy records where device_id was internal database ID to the stable device serial
UPDATE phone_account_credentials
SET device_id = (SELECT serial FROM devices WHERE devices.id = phone_account_credentials.device_id)
WHERE device_id IN (SELECT id FROM devices WHERE id != serial);

-- 3. Add UNIQUE constraint index on (device_id, platform) to guarantee 100% database-level device isolation
CREATE UNIQUE INDEX IF NOT EXISTS idx_phone_acc_dev_platform ON phone_account_credentials(device_id, platform);
