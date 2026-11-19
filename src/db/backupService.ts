import JSZip from 'jszip';
import { db } from './database';
import { MatchRecord, MatchSnapshot, TrainingDecisionLog, StrategyConfig } from '../types';

export const LAST_BACKUP_AT_KEY = 'bet360-last-backup-at';
export const BACKUP_CREATED_EVENT = 'bet360:backup-created';

export interface BackupMatchSnapshot extends Omit<MatchSnapshot, 'imageBlob'> {
  imageFileName: string;
}

export interface BackupMatchRecord extends Omit<MatchRecord, 'snapshots'> {
  snapshots: BackupMatchSnapshot[];
}

export interface BackupData {
  version: number;
  exportedAt: number;
  matches: BackupMatchRecord[];
  trainingLogs: TrainingDecisionLog[];
  strategyConfig: StrategyConfig;
  strategyConfigUpdatedAt?: number;
}

export interface DatabaseStats {
  matchesCount: number;
  snapshotsCount: number;
  logsCount: number;
  estimatedSizeBytes: number;
}

export class BackupService {
  /**
   * Calcule les statistiques d'utilisation de la base locale
   */
  static async getStats(): Promise<DatabaseStats> {
    const matches = await db.matches.toArray();
    const logs = await db.training_logs.toArray();

    let snapshotsCount = 0;
    let totalBytes = 0;

    for (const m of matches) {
      snapshotsCount += m.snapshots.length;
      for (const s of m.snapshots) {
        if (s.imageBlob) {
          totalBytes += s.imageBlob.size;
        }
      }
    }

    return {
      matchesCount: matches.length,
      snapshotsCount,
      logsCount: logs.length,
      estimatedSizeBytes: totalBytes,
    };
  }

  /**
   * Exporte l'ensemble de la base de données (données + images haute-résolution) en archive .zip
   */
  static async exportToZip(): Promise<Blob> {
    const zip = new JSZip();
    const imagesFolder = zip.folder('snapshots');

    const matches = await db.matches.toArray();
    const logs = await db.training_logs.toArray();
    const config = await db.getStrategyConfig();
    const strategyConfigUpdatedAt = await db.getStrategyConfigUpdatedAt();

    const serializableMatches: BackupMatchRecord[] = [];

    for (const match of matches) {
      const serializableSnapshots: BackupMatchSnapshot[] = [];

      for (const snap of match.snapshots) {
        const ext = snap.mimeType === 'image/jpeg' ? 'jpg' : snap.mimeType === 'image/webp' ? 'webp' : 'png';
        const fileName = `${match.id}_slot${snap.slotIndex}_${snap.id}.${ext}`;

        if (snap.imageBlob && imagesFolder) {
          imagesFolder.file(fileName, snap.imageBlob);
        }

        serializableSnapshots.push({
          id: snap.id,
          slotIndex: snap.slotIndex,
          timeTag: snap.timeTag,
          exactMinute: snap.exactMinute,
          mimeType: snap.mimeType,
          oddsSnapshot: snap.oddsSnapshot,
          imageFileName: fileName,
        });
      }

      serializableMatches.push({
        id: match.id,
        createdAt: match.createdAt,
        updatedAt: match.updatedAt,
        label: match.label,
        actualOutcome: match.actualOutcome,
        referenceOdds: match.referenceOdds,
        tags: match.tags,
        notes: match.notes,
        stats: match.stats,
        snapshots: serializableSnapshots,
      });
    }

    const backupManifest: BackupData = {
      version: 1,
      exportedAt: Date.now(),
      matches: serializableMatches,
      trainingLogs: logs,
      strategyConfig: config,
      strategyConfigUpdatedAt,
    };

    zip.file('manifest.json', JSON.stringify(backupManifest, null, 2));

    return await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
  }

  /**
   * Déclenche le téléchargement automatique du fichier ZIP de sauvegarde complète
   */
  static async downloadBackup(): Promise<string> {
    const blob = await this.exportToZip();
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `bet360-aiscore-backup-${dateStr}.zip`;
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    localStorage.setItem(LAST_BACKUP_AT_KEY, String(Date.now()));
    window.dispatchEvent(new Event(BACKUP_CREATED_EVENT));
    return fileName;
  }

  static getLastBackupAt(): number | null {
    const savedAt = Number(localStorage.getItem(LAST_BACKUP_AT_KEY));
    return Number.isFinite(savedAt) && savedAt > 0 ? savedAt : null;
  }

  /**
   * Exporte l'historique d'entraînement au format CSV (Excel / Sheets)
   */
  static async exportLogsToCsv(): Promise<void> {
    const logs = await db.training_logs.toArray();
    const headers = [
      'ID',
      'Date',
      'Match ID',
      'Pronostic',
      'Issue Réelle',
      'Résultat',
      'Cote Observée',
      'Confiance %',
      'Mise Type',
      'Mise Unités',
      'EV %',
      'Discipline Valide',
      'PnL Unités',
      'Raison Discipline',
    ];

    const rows = logs.map((l) => [
      l.id,
      new Date(l.timestamp).toISOString(),
      l.matchId,
      l.predictedOutcome || 'NO_BET',
      l.actualOutcome,
      l.predictedOutcome === null ? 'PASSE' : l.isPredictionCorrect ? 'GAGNE' : 'PERDU',
      l.observedOdds.toFixed(2),
      l.estimatedConfidence,
      l.stakeAction,
      l.stakeUnits.toFixed(2),
      (l.expectedValue * 100).toFixed(1),
      l.isDisciplineValid ? 'OUI' : 'NON',
      l.pnlUnits.toFixed(2),
      `"${(l.disciplineReason || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
      type: 'text/csv;charset=utf-8;',
    }); // UTF-8 BOM pour Excel
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bet360-training-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /**
   * Exporte les métadonnées de match au format JSON simple
   */
  static async exportMatchesJson(): Promise<void> {
    const matches = await db.matches.toArray();
    const cleanMatches = matches.map((m) => ({
      ...m,
      snapshots: m.snapshots.map((s) => ({
        id: s.id,
        slotIndex: s.slotIndex,
        timeTag: s.timeTag,
        exactMinute: s.exactMinute,
        oddsSnapshot: s.oddsSnapshot,
      })),
    }));

    const jsonStr = JSON.stringify(cleanMatches, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bet360-matches-metadata-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /**
   * Importe une archive ZIP complète dans la base IndexedDB
   */
  static async importFromZip(
    file: File,
    options: { mergeByUpdatedAt?: boolean } = {}
  ): Promise<{ matchesCount: number; logsCount: number }> {
    const zip = await JSZip.loadAsync(file);
    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) {
      throw new Error("L'archive ne contient pas de fichier manifest.json valide.");
    }

    const manifestText = await manifestFile.async('text');
    const manifest: BackupData = JSON.parse(manifestText);

    const imagesFolder = zip.folder('snapshots');
    const restoredMatches: MatchRecord[] = [];

    for (const item of manifest.matches) {
      const restoredSnapshots: MatchSnapshot[] = [];

      for (const snap of item.snapshots) {
        let blob: Blob;
        const imgFile = imagesFolder?.file(snap.imageFileName);
        if (imgFile) {
          const buffer = await imgFile.async('arraybuffer');
          blob = new Blob([buffer], { type: snap.mimeType || 'image/png' });
        } else {
          blob = new Blob([], { type: snap.mimeType || 'image/png' });
        }

        restoredSnapshots.push({
          id: snap.id,
          slotIndex: snap.slotIndex,
          timeTag: snap.timeTag,
          exactMinute: snap.exactMinute,
          mimeType: snap.mimeType,
          oddsSnapshot: snap.oddsSnapshot,
          imageBlob: blob,
        });
      }

      restoredMatches.push({
        id: item.id,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt || Date.now(),
        label: item.label,
        actualOutcome: item.actualOutcome,
        referenceOdds: item.referenceOdds,
        tags: item.tags || [],
        notes: item.notes,
        stats: item.stats || { attempts: 0, correctPredictions: 0 },
        snapshots: restoredSnapshots,
      });
    }

    await db.transaction('rw', db.matches, db.training_logs, db.user_settings, async () => {
      for (const m of restoredMatches) {
        if (options.mergeByUpdatedAt) {
          const existing = await db.matches.get(m.id);
          if (existing && existing.updatedAt > m.updatedAt) continue;
        }
        await db.matches.put(m);
      }
      for (const log of manifest.trainingLogs || []) {
        await db.training_logs.put(log);
      }
      if (manifest.strategyConfig) {
        const backupConfigUpdatedAt = manifest.strategyConfigUpdatedAt ?? manifest.exportedAt;
        const currentConfigUpdatedAt = options.mergeByUpdatedAt
          ? await db.getStrategyConfigUpdatedAt()
          : 0;
        if (!options.mergeByUpdatedAt || backupConfigUpdatedAt >= currentConfigUpdatedAt) {
          await db.saveStrategyConfig(manifest.strategyConfig, backupConfigUpdatedAt);
        }
      }
    });

    return {
      matchesCount: restoredMatches.length,
      logsCount: (manifest.trainingLogs || []).length,
    };
  }

  /**
   * Efface toutes les données locales
   */
  static async clearAllData(): Promise<void> {
    await db.transaction('rw', db.matches, db.training_logs, db.user_settings, async () => {
      await db.matches.clear();
      await db.training_logs.clear();
      await db.user_settings.clear();
    });
  }
}
