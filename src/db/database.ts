import Dexie, { type EntityTable } from 'dexie';
import { MatchRecord, TrainingDecisionLog, StrategyConfig } from '../types';
import { DEFAULT_STRATEGY_CONFIG } from '../domain/strategyEngine';

export interface SettingItem {
  key: string;
  value: any;
}

export class BetPatternDatabase extends Dexie {
  matches!: EntityTable<MatchRecord, 'id'>;
  training_logs!: EntityTable<TrainingDecisionLog, 'id'>;
  user_settings!: EntityTable<SettingItem, 'key'>;

  constructor() {
    super('BetPatternTradingDB');
    this.version(1).stores({
      matches: 'id, createdAt, actualOutcome, *tags',
      training_logs: 'id, sessionId, matchId, timestamp, isPredictionCorrect, isDisciplineValid',
      user_settings: 'key',
    });
  }

  async getStrategyConfig(): Promise<StrategyConfig> {
    const item = await this.user_settings.get('strategy_config');
    if (item && item.value) {
      return { ...DEFAULT_STRATEGY_CONFIG, ...item.value };
    }
    return DEFAULT_STRATEGY_CONFIG;
  }

  async getStrategyConfigUpdatedAt(): Promise<number> {
    const item = await this.user_settings.get('strategy_config_updated_at');
    return typeof item?.value === 'number' ? item.value : 0;
  }

  async saveStrategyConfig(config: StrategyConfig, updatedAt = Date.now()): Promise<void> {
    await this.user_settings.bulkPut([
      { key: 'strategy_config', value: config },
      { key: 'strategy_config_updated_at', value: updatedAt },
    ]);
  }
}

export const db = new BetPatternDatabase();
