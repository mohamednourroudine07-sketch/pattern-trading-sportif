# Technical Requirements Document (TRD)
## Architecture Technique — Application d'Entraînement Pattern Trading (Pair/Impair)

---

### 1. Choix Architecturaux & Stack Technique
Pour garantir une vitesse d'affichage instantanée des captures haute résolution, une confidentialité totale des données de trading et zéro coût d'infrastructure, l'architecture repose sur une application web **Local-First (SPA / PWA)**.

* **Frontend :** React 18+ (TypeScript) avec Vite pour un rendu ultra-rapide.
* **Styling & UI :** Tailwind CSS (thème sombre par défaut optimisé pour l'analyse prolongée de cotes, fort contraste sur les variations numériques).
* **Stockage Local Persistant :** **IndexedDB** (via la bibliothèque `Dexie.js`) pour stocker sans limite pratique (contrairement à `localStorage` limité à 5 Mo) les blobs d'images haute résolution et les métadonnées structurées.
* **Gestion d'état :** Zustand ou React Context léger pour les sessions d'entraînement en cours et les filtres de pile.
* **Portabilité / Sauvegarde :** Export/Import complet de la base (métadonnées JSON + images compressées/originales en archive `.zip` via `JSZip`).

---

### 2. Modèle de Données (Schéma IndexedDB)

#### Table `matches` (Fiches d'analyse)
```typescript
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
```

#### Table `training_logs` (Historique des décisions & Calibration)
```typescript
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

  // Résultat réel
  actualOutcome: Outcome;
  isPredictionCorrect: boolean;
  pnlUnits: number;           // Profit/Perte net en unités (0 si NO_BET)
}
```

#### Table `user_settings` (Paramètres Bankroll & Stratégie)
```typescript
export interface StrategyConfig {
  initialBankrollUnits: number; // Défaut : 100
  currentBankrollUnits: number;
  standardStakePct: number;     // Défaut : 1.5 (%)
  maxStakeCapPct: number;       // Défaut : 3.0 (%)
  minOddsThreshold: number;     // Défaut : 1.60
  minConfidenceThreshold: number; // Défaut : 65 (%)
  kellyFraction: number;        // Défaut : 0.25 (Quart de Kelly)
}
```

---

### 3. Moteur de Décision & Calculs Stratégiques (`StrategyEngine.ts`)

Le module logique pur `StrategyEngine` évalue chaque décision en entraînement indépendamment du résultat aléatoire du match :

1. **Calcul de probabilité implicite :**
   $$p_{\text{imp}} = \frac{1}{C}$$
2. **Calcul d'espérance mathématique (EV) :**
   $$\text{EV} = \left(\frac{p}{100} \times C\right) - 1$$
3. **Suggestion de Kelly Fractionné Plafonné :**
   $$f^* = \frac{p_{\text{dec}} \cdot C - 1}{C - 1}$$
   $$\text{Mise}_{\text{Kelly}} = \min\left(\text{Bankroll} \times f^* \times k_{\text{fraction}},\; \text{Bankroll} \times \text{Plafond}_{\max}\right)$$
   *(Où $p_{\text{dec}} = \frac{p}{100}$ et $k_{\text{fraction}} = 0,25$ par défaut ; si $f^* \le 0$, la mise suggérée est $0$).*
4. **Validation de la discipline (`isDisciplineValid`) :**
   * Si l'utilisateur choisit de miser (`stakeUnits > 0`), la décision est marquée **conforme** uniquement si :
     * $C \ge \text{minOddsThreshold}$ ($1,60$)
     * $p > \text{minConfidenceThreshold}$ ($65\,$%)
     * $\text{EV} > 0$
     * $\text{stakeUnits} \le \text{Bankroll} \times \text{maxStakeCapPct}$
   * Si $C < 1,60$ ou $p \le 65\,$%, le choix `NO_BET` est validé comme **discipline optimale**.

---

### 4. Architecture des Composants Frontend

```text
src/
├── db/
│   ├── database.ts           # Initialisation Dexie (IndexedDB)
│   └── backupService.ts      # Import / Export ZIP (JSON + Blobs images)
├── domain/
│   ├── strategyEngine.ts     # Calculs EV, Kelly, validation discipline
│   └── stackSelector.ts      # Algorithme de tirage (aléatoire, erreurs passées, filtres)
├── components/
│   ├── ingestion/
│   │   └── MatchUploader.tsx # Dropzone max 4 images, assignation 1'/2'/22'/23', label Pair/Impair
│   ├── stack/
│   │   ├── StackExplorer.tsx # Grille/Pile filtrable des matchs enregistrés
│   │   └── CompareView.tsx   # Vue côte à côte 2 matchs (alignement 1', 2', 22', 23')
│   ├── training/
│   │   ├── SnapshotViewer.tsx# Lecteur ultra-rapide des 1-4 photos + zoom + raccourcis clavier
│   │   ├── DecisionPanel.tsx # Saisie Pair/Impair, cote, confiance %, action de mise
│   │   └── FeedbackModal.tsx # Révélation issue + audit EV/Discipline + notes pattern
│   └── analytics/
│       └── CalibrationDashboard.tsx # Courbe Bankroll, ROI, Calibration Confiance vs Réel
└── App.tsx
```

---

### 5. Gestion des Performances & Médias
* **Préchargement mémoire (`ObjectURL`) :** Lorsqu'un match est chargé en mode entraînement ou comparaison, les 1 à 4 `Blob` sont convertis en `URL.createObjectURL()` et pré-décodés en mémoire afin que le basculement entre `1'`, `2'`, `22'` et `23'` s'effectue sans aucun clignotement ni latence réseau. Les URLs sont révoquées (`URL.revokeObjectURL`) au changement de match pour éviter toute fuite mémoire.
* **Contrainte stricte des 4 slots :** Validation côté UI et modèle de données empêchant l'ajout de plus de 4 images par fiche match, tout en autorisant les matchs incomplets (1, 2 ou 3 captures) avec badge visuel d'état (ex. `4/4` vs `2/4`).
* **Raccourcis clavier globaux :**
  * `1`, `2`, `3`, `4` ou `Flèche Gauche / Droite` : basculer instantanément entre les captures du match.
  * `P` : sélectionner **Pair** | `I` : sélectionner **Impair** | `N` : sélectionner **No-Bet**.
  * `Entrée` : valider la décision / passer au match suivant.