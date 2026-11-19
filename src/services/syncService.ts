import { db } from '../db/database';
import { MatchRecord, MatchSnapshot, TrainingDecisionLog, StrategyConfig } from '../types';

export interface SyncPayload {
  version: number;
  updatedAt: number;
  sourceDevice: string;
  matches: Array<
    Omit<MatchRecord, 'snapshots'> & {
      snapshots: Array<
        Omit<MatchSnapshot, 'imageBlob'> & {
          imageBase64: string;
        }
      >;
    }
  >;
  trainingLogs: TrainingDecisionLog[];
  strategyConfig: StrategyConfig;
}

export class SyncService {
  /**
   * Convertit un Blob en chaîne Base64
   */
  private static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Convertit une chaîne Data URL / Base64 en Blob
   */
  private static base64ToBlob(base64: string, mimeType: string): Blob {
    if (!base64 || !base64.includes(',')) {
      return new Blob([], { type: mimeType || 'image/png' });
    }
    const byteCharacters = atob(base64.split(',')[1]);
    const byteNumbers = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    return new Blob([byteNumbers.buffer], { type: mimeType || 'image/png' });
  }

  /**
   * Pousse (Upload) l'ensemble des données locales (du Téléphone ou du PC) vers le PC central
   */
  static async pushToPC(): Promise<{ success: boolean; matchesCount: number }> {
    const matches = await db.matches.toArray();
    const logs = await db.training_logs.toArray();
    const config = await db.getStrategyConfig();

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const sourceDevice = isMobile ? 'Android Phone' : 'PC Localhost';

    const serializedMatches: SyncPayload['matches'] = [];

    for (const match of matches) {
      const serializedSnapshots: SyncPayload['matches'][0]['snapshots'] = [];

      for (const snap of match.snapshots) {
        let base64 = '';
        if (snap.imageBlob && snap.imageBlob.size > 0) {
          try {
            base64 = await this.blobToBase64(snap.imageBlob);
          } catch (e) {
            console.error('Erreur conversion image base64:', e);
          }
        }

        serializedSnapshots.push({
          id: snap.id,
          slotIndex: snap.slotIndex,
          timeTag: snap.timeTag,
          exactMinute: snap.exactMinute,
          mimeType: snap.mimeType,
          oddsSnapshot: snap.oddsSnapshot,
          imageBase64: base64,
        });
      }

      serializedMatches.push({
        id: match.id,
        createdAt: match.createdAt,
        updatedAt: match.updatedAt,
        label: match.label,
        actualOutcome: match.actualOutcome,
        referenceOdds: match.referenceOdds,
        tags: match.tags,
        notes: match.notes,
        stats: match.stats,
        snapshots: serializedSnapshots,
      });
    }

    const payload: SyncPayload = {
      version: 1,
      updatedAt: Date.now(),
      sourceDevice,
      matches: serializedMatches,
      trainingLogs: logs,
      strategyConfig: config,
    };

    const res = await fetch('/api/sync/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Échec de la synchronisation (Code ${res.status})`);
    }

    localStorage.setItem('bet360-last-sync-time', String(Date.now()));
    return { success: true, matchesCount: matches.length };
  }

  /**
   * Récupère (Download) les données du PC et les fusionne dans la base IndexedDB locale
   */
  static async pullFromPC(): Promise<{ matchesRestored: number; logsRestored: number; sourceDevice?: string }> {
    const res = await fetch('/api/sync/pull');
    if (!res.ok) {
      throw new Error(`Impossible de contacter le PC hôte (Code ${res.status})`);
    }

    const data: SyncPayload | { empty: boolean } = await res.json();
    if ('empty' in data && data.empty) {
      return { matchesRestored: 0, logsRestored: 0 };
    }

    const syncData = data as SyncPayload;
    let matchesRestored = 0;

    await db.transaction('rw', db.matches, db.training_logs, db.user_settings, async () => {
      for (const item of syncData.matches) {
        const restoredSnapshots: MatchSnapshot[] = item.snapshots.map((s) => ({
          id: s.id,
          slotIndex: s.slotIndex,
          timeTag: s.timeTag,
          exactMinute: s.exactMinute,
          mimeType: s.mimeType,
          oddsSnapshot: s.oddsSnapshot,
          imageBlob: this.base64ToBlob(s.imageBase64, s.mimeType),
        }));

        const record: MatchRecord = {
          id: item.id,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt || Date.now(),
          label: item.label,
          actualOutcome: item.actualOutcome,
          referenceOdds: item.referenceOdds,
          tags: item.tags,
          notes: item.notes,
          stats: item.stats,
          snapshots: restoredSnapshots,
        };

        await db.matches.put(record);
        matchesRestored++;
      }

      for (const log of syncData.trainingLogs || []) {
        await db.training_logs.put(log);
      }

      if (syncData.strategyConfig) {
        await db.saveStrategyConfig(syncData.strategyConfig);
      }
    });

    localStorage.setItem('bet360-last-sync-time', String(Date.now()));
    return {
      matchesRestored,
      logsRestored: (syncData.trainingLogs || []).length,
      sourceDevice: syncData.sourceDevice,
    };
  }

  /**
   * Vérifie le statut de la synchronisation sur le PC hôte
   */
  static async checkStatus(): Promise<{ exists: boolean; lastModified: number }> {
    try {
      const res = await fetch('/api/sync/status');
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline ou serveur injoignable
    }
    return { exists: false, lastModified: 0 };
  }
}
