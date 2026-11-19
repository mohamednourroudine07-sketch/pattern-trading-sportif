import type { SupabaseClient } from '@supabase/supabase-js';
import { BackupService } from '../db/backupService';
import { db } from '../db/database';

const BACKUP_BUCKET = 'pattern-trading-backups';
const DEVICE_ID_KEY = 'bet360-cloud-device-id';

function getDeviceId(): string {
  const savedId = localStorage.getItem(DEVICE_ID_KEY);
  if (savedId) return savedId;

  const deviceId = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_KEY, deviceId);
  return deviceId;
}

async function uploadCurrentDeviceBackup(client: SupabaseClient, userId: string): Promise<string> {
  const storage = client.storage.from(BACKUP_BUCKET);
  const deviceFileName = `${getDeviceId()}.zip`;
  const deviceBackup = await BackupService.exportToZip();
  const { error } = await storage.upload(`${userId}/${deviceFileName}`, deviceBackup, {
    cacheControl: '0',
    contentType: 'application/zip',
    upsert: true,
  });
  if (error) throw error;

  return deviceFileName;
}

export class CloudSyncService {
  static async getLocalDataSignature(): Promise<string> {
    return db.transaction('r', db.matches, db.training_logs, db.user_settings, async () => {
      const matches = await db.matches.toArray();
      const trainingLogs = await db.training_logs.toArray();
      const settings = await db.user_settings.toArray();

      return JSON.stringify({
        matches: matches.map(({ snapshots, ...match }) => [
          match,
          snapshots.map(({ imageBlob, ...snapshot }) => [
            snapshot,
            imageBlob?.size ?? 0,
            imageBlob?.type ?? '',
          ]),
        ]),
        trainingLogs,
        settings,
      });
    });
  }

  static async saveCurrentDeviceBackup(client: SupabaseClient, userId: string): Promise<string> {
    const signature = await this.getLocalDataSignature();
    await uploadCurrentDeviceBackup(client, userId);
    return signature;
  }

  static async synchronize(
    client: SupabaseClient,
    userId: string
  ): Promise<{ matchesCount: number; deviceCount: number; localDataSignature: string }> {
    const storage = client.storage.from(BACKUP_BUCKET);
    const { data: files, error: listError } = await storage.list(userId, { limit: 100 });
    if (listError) throw listError;

    const backups = (files || []).filter((file) => file.name.endsWith('.zip'));
    for (const backup of backups) {
      const { data, error } = await storage.download(`${userId}/${backup.name}`);
      if (error) throw error;

      const zipFile = new File([data], backup.name, { type: 'application/zip' });
      await BackupService.importFromZip(zipFile, { mergeByUpdatedAt: true });
    }

    const localDataSignature = await this.getLocalDataSignature();
    const deviceFileName = await uploadCurrentDeviceBackup(client, userId);

    return {
      matchesCount: await db.matches.count(),
      deviceCount: new Set([...backups.map((file) => file.name), deviceFileName]).size,
      localDataSignature,
    };
  }
}
