export type Outcome = 'PAIR' | 'IMPAIR';
export type TimeSlotTag = "1'" | "2'" | "22'" | "23'" | 'CUSTOM';

export interface MatchSnapshot {
  id: string;                 // UUID
  slotIndex: number;          // 0 à 3 (max 4 photos par match)
  timeTag: TimeSlotTag;       // Repère principal ("1'", "2'", "22'", "23'")
  exactMinute?: number;       // Minute précise optionnelle (ex: 22)
  imageBlob: Blob;            // Image binaire stockée dans IndexedDB
  mimeType: string;           // 'image/png' | 'image/jpeg' | 'image/webp'
  oddsSnapshot?: {            // Optionnel : saisie rapide des cotes vues
    pair?: number;
    impair?: number;
  };
}

export interface MatchRecord {
  id: string;                 // UUID
  createdAt: number;          // Timestamp UNIX
  updatedAt: number;
  label?: string;             // Identifiant libre (ex: "Liga - Match #42")
  actualOutcome: Outcome;     // 'PAIR' | 'IMPAIR'
  referenceOdds?: number;     // Cote de référence sur l'issue réelle
  tags: string[];             // Ex: ["chute-22", "stabilisation-23", "0-0-ht"]
  notes?: string;             // Observations du trader sur le pattern
  snapshots: MatchSnapshot[]; // Tableau de 1 à 4 éléments maximum
  stats: {
    attempts: number;         // Nombre de fois joué en entraînement
    correctPredictions: number;
    lastReviewedAt?: number;
  };
}

export type StakeAction = 'NO_BET' | 'STANDARD' | 'REINFORCED_CAPPED' | 'REDUCED';

export interface TrainingDecisionLog {
  id: string;                 // UUID
  sessionId: string;          // Regroupement par session d'entraînement
  matchId: string;            // Référence vers MatchRecord.id
  timestamp: number;

  // Décision du trader
  predictedOutcome: Outcome | null; // null si NO_BET
  observedOdds: number;       // Cote évaluée au moment de la décision (ex: 1.68)
  estimatedConfidence: number;// Confiance déclarée en % (ex: 68)
  stakeAction: StakeAction;
  stakeUnits: number;         // Mise engagée en unités (0 si NO_BET)

  // Métriques calculées automatiquement
  impliedProbability: number; // 1 / observedOdds
  expectedValue: number;      // (estimatedConfidence / 100) * observedOdds - 1
  isDisciplineValid: boolean; // True si règles C >= 1.60, p > 65% et plafond respectés
  disciplineReason?: string;  // Explication détaillée de la validation de discipline

  // Résultat réel
  actualOutcome: Outcome;
  isPredictionCorrect: boolean;
  pnlUnits: number;           // Profit/Perte net en unités (0 si NO_BET)
}

export interface StrategyConfig {
  initialBankrollUnits: number; // Défaut : 100
  currentBankrollUnits: number;
  standardStakePct: number;     // Défaut : 1.5 (%)
  maxStakeCapPct: number;       // Défaut : 3.0 (%)
  minOddsThreshold: number;     // Défaut : 1.60
  minConfidenceThreshold: number; // Défaut : 65 (%)
  kellyFraction: number;        // Défaut : 0.25 (Quart de Kelly)
}

export type TrainingMode = 'RANDOM' | 'MISTAKES_FIRST' | 'TAG_FILTERED' | 'ALL_ORDERED';

export interface TrainingFilterOptions {
  mode: TrainingMode;
  selectedTag?: string;
  minSnapshots?: number;
}
