import { appDb } from '../db';
import { Device, TransferJob } from '../../../shared/types';

export class DeviceRepository {
  public getAll(): Device[] {
    const db = appDb.getRawDb();
    const rows = db.prepare(`
      SELECT id, serial, model, android_version as androidVersion, status,
             battery_level as batteryLevel, available_storage_mb as availableStorageMb,
             total_storage_mb as totalStorageMb, installed_apps as installedApps,
             last_connected_at as lastConnectedAt
      FROM devices
      ORDER BY last_connected_at DESC
    `).all() as any[];

    return rows.map(r => ({
      ...r,
      installedApps: typeof r.installedApps === 'string' ? JSON.parse(r.installedApps || '[]') : [],
    }));
  }

  public getBySerial(serial: string): Device | null {
    const db = appDb.getRawDb();
    const r = db.prepare(`
      SELECT id, serial, model, android_version as androidVersion, status,
             battery_level as batteryLevel, available_storage_mb as availableStorageMb,
             total_storage_mb as totalStorageMb, installed_apps as installedApps,
             last_connected_at as lastConnectedAt
      FROM devices
      WHERE serial = ?
    `).get(serial) as any;

    if (!r) return null;
    return {
      ...r,
      installedApps: typeof r.installedApps === 'string' ? JSON.parse(r.installedApps || '[]') : [],
    };
  }

  public getById(id: string): Device | null {
    const db = appDb.getRawDb();
    const r = db.prepare(`
      SELECT id, serial, model, android_version as androidVersion, status,
             battery_level as batteryLevel, available_storage_mb as availableStorageMb,
             total_storage_mb as totalStorageMb, installed_apps as installedApps,
             last_connected_at as lastConnectedAt
      FROM devices
      WHERE id = ?
    `).get(id) as any;

    if (!r) return null;
    return {
      ...r,
      installedApps: typeof r.installedApps === 'string' ? JSON.parse(r.installedApps || '[]') : [],
    };
  }

  public upsertDevice(device: Omit<Device, 'id' | 'lastConnectedAt'>): Device {
    const db = appDb.getRawDb();
    const existing = this.getBySerial(device.serial);
    const id = existing ? existing.id : 'dev_' + Math.random().toString(36).substring(2, 11);

    const stmt = db.prepare(`
      INSERT INTO devices (
        id, serial, model, android_version, status, battery_level,
        available_storage_mb, total_storage_mb, installed_apps, last_connected_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, datetime('now')
      )
      ON CONFLICT(serial) DO UPDATE SET
        model = excluded.model,
        android_version = excluded.android_version,
        status = excluded.status,
        battery_level = excluded.battery_level,
        available_storage_mb = excluded.available_storage_mb,
        total_storage_mb = excluded.total_storage_mb,
        installed_apps = excluded.installed_apps,
        last_connected_at = datetime('now')
    `);

    stmt.run(
      id,
      device.serial,
      device.model,
      device.androidVersion,
      device.status,
      device.batteryLevel ?? null,
      device.availableStorageMb ?? null,
      device.totalStorageMb ?? null,
      JSON.stringify(device.installedApps || [])
    );

    const saved = this.getBySerial(device.serial)!;
    return {
      ...saved,
      ipAddress: device.ipAddress,
    };
  }

  public createTransferJob(job: Omit<TransferJob, 'id' | 'createdAt' | 'transferredBytes' | 'status'>): TransferJob {
    const db = appDb.getRawDb();
    const id = 'xfer_' + Math.random().toString(36).substring(2, 11);

    const stmt = db.prepare(`
      INSERT INTO transfer_jobs (
        id, device_id, source_file_path, destination_path, file_size,
        transferred_bytes, status, error, created_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        0, 'pending', NULL, datetime('now')
      )
    `);

    stmt.run(
      id,
      job.deviceId,
      job.sourceFilePath,
      job.destinationPath,
      job.fileSize
    );

    return this.getTransferJobById(id)!;
  }

  public getTransferJobById(id: string): TransferJob | null {
    const db = appDb.getRawDb();
    const r = db.prepare(`
      SELECT id, device_id as deviceId, source_file_path as sourceFilePath,
             destination_path as destinationPath, file_size as fileSize,
             transferred_bytes as transferredBytes, status, error,
             created_at as createdAt, completed_at as completedAt
      FROM transfer_jobs
      WHERE id = ?
    `).get(id) as any;

    return r || null;
  }

  public updateTransferJob(id: string, updates: Partial<TransferJob>): TransferJob {
    const db = appDb.getRawDb();
    const current = this.getTransferJobById(id);
    if (!current) throw new Error(`TransferJob not found: ${id}`);

    const newObj = { ...current, ...updates };
    const stmt = db.prepare(`
      UPDATE transfer_jobs
      SET transferred_bytes = ?, status = ?, error = ?,
          completed_at = CASE WHEN ? = 'completed' OR ? = 'failed' THEN datetime('now') ELSE completed_at END
      WHERE id = ?
    `);

    stmt.run(
      newObj.transferredBytes,
      newObj.status,
      newObj.error || null,
      newObj.status,
      newObj.status,
      id
    );

    return this.getTransferJobById(id)!;
  }

  public getTransferJobs(deviceId?: string): TransferJob[] {
    const db = appDb.getRawDb();
    let query = `
      SELECT id, device_id as deviceId, source_file_path as sourceFilePath,
             destination_path as destinationPath, file_size as fileSize,
             transferred_bytes as transferredBytes, status, error,
             created_at as createdAt, completed_at as completedAt
      FROM transfer_jobs
    `;
    const params: any[] = [];
    if (deviceId) {
      query += ' WHERE device_id = ?';
      params.push(deviceId);
    }
    query += ' ORDER BY created_at DESC LIMIT 50';

    return db.prepare(query).all(...params) as TransferJob[];
  }
}

export const deviceRepo = new DeviceRepository();
