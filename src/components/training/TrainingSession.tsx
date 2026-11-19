import React, { useState, useEffect } from 'react';
import {
  MatchRecord,
  StrategyConfig,
  TrainingDecisionLog,
  TrainingFilterOptions,
  Outcome,
  StakeAction,
} from '../../types';
import { db } from '../../db/database';
import { StackSelector } from '../../domain/stackSelector';
import { StrategyEngine } from '../../domain/strategyEngine';
import { SnapshotViewer } from './SnapshotViewer';
import { DecisionPanel } from './DecisionPanel';
import { FeedbackModal } from './FeedbackModal';
import {
  Play,
  RotateCcw,
  Target,
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowLeft,
  Filter,
  CheckCircle,
  Sparkles,
} from 'lucide-react';

interface TrainingSessionProps {
  allMatches: MatchRecord[];
  strategyConfig: StrategyConfig;
  onConfigUpdated: (config: StrategyConfig) => void;
  onFinishSession: () => void;
  targetMatch?: MatchRecord | null;
}

export const TrainingSession: React.FC<TrainingSessionProps> = ({
  allMatches,
  strategyConfig,
  onConfigUpdated,
  onFinishSession,
  targetMatch,
}) => {
  const [filterOptions, setFilterOptions] = useState<TrainingFilterOptions>({
    mode: 'RANDOM',
    minSnapshots: 0,
    selectedTag: '',
  });

  const [queue, setQueue] = useState<MatchRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeSlotIndex, setActiveSlotIndex] = useState(0);

  // Stats de la session en cours
  const [sessionLogs, setSessionLogs] = useState<TrainingDecisionLog[]>([]);
  const [currentFeedback, setCurrentFeedback] = useState<{
    match: MatchRecord;
    log: TrainingDecisionLog;
  } | null>(null);

  const [sessionId] = useState(() => `session-${Date.now()}`);

  // Initialisation de la file d'attente
  useEffect(() => {
    if (targetMatch) {
      setQueue([targetMatch]);
      setCurrentIndex(0);
      setActiveSlotIndex(0);
      return;
    }

    const matchesQueue = StackSelector.selectMatchQueue(allMatches, filterOptions);
    setQueue(matchesQueue);
    setCurrentIndex(0);
    setActiveSlotIndex(0);
  }, [allMatches, filterOptions, targetMatch]);

  const currentMatch = queue[currentIndex];

  const handleDecisionSubmit = async (decision: {
    predictedOutcome: Outcome | null;
    observedOdds: number;
    estimatedConfidence: number;
    stakeAction: StakeAction;
    stakeUnits: number;
  }) => {
    if (!currentMatch) return;

    const evaluation = StrategyEngine.evaluateDecision(
      decision.observedOdds,
      decision.estimatedConfidence,
      decision.stakeAction,
      decision.stakeUnits,
      strategyConfig.currentBankrollUnits,
      strategyConfig
    );

    const isPredictionCorrect =
      decision.predictedOutcome !== null &&
      decision.predictedOutcome === currentMatch.actualOutcome;

    const pnlUnits = StrategyEngine.calculatePnL(
      decision.predictedOutcome,
      currentMatch.actualOutcome,
      decision.stakeUnits,
      decision.observedOdds
    );

    const decisionLog: TrainingDecisionLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sessionId,
      matchId: currentMatch.id,
      timestamp: Date.now(),
      predictedOutcome: decision.predictedOutcome,
      observedOdds: decision.observedOdds,
      estimatedConfidence: decision.estimatedConfidence,
      stakeAction: decision.stakeAction,
      stakeUnits: decision.stakeUnits,
      impliedProbability: evaluation.impliedProbability,
      expectedValue: evaluation.expectedValue,
      isDisciplineValid: evaluation.isDisciplineValid,
      disciplineReason: evaluation.disciplineReason,
      actualOutcome: currentMatch.actualOutcome,
      isPredictionCorrect,
      pnlUnits,
    };

    // 1. Enregistre le log dans IndexedDB
    await db.training_logs.put(decisionLog);

    // 2. Met à jour les stats du match
    const updatedStats = {
      attempts: (currentMatch.stats.attempts || 0) + 1,
      correctPredictions:
        (currentMatch.stats.correctPredictions || 0) + (isPredictionCorrect ? 1 : 0),
      lastReviewedAt: Date.now(),
    };

    await db.matches.update(currentMatch.id, {
      stats: updatedStats,
      updatedAt: Date.now(),
    });

    currentMatch.stats = updatedStats;

    // 3. Met à jour la Bankroll globale
    const newBankroll = Number((strategyConfig.currentBankrollUnits + pnlUnits).toFixed(2));
    const newConfig = { ...strategyConfig, currentBankrollUnits: newBankroll };
    await db.saveStrategyConfig(newConfig);
    onConfigUpdated(newConfig);

    // 4. Met à jour la session
    setSessionLogs((prev) => [...prev, decisionLog]);
    setCurrentFeedback({
      match: currentMatch,
      log: decisionLog,
    });
  };

  const handleNextMatch = () => {
    setCurrentFeedback(null);
    setActiveSlotIndex(0);

    if (currentIndex + 1 < queue.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Fin de la file, reshuffle ou fin
      if (queue.length > 1) {
        const reshuffled = StackSelector.selectMatchQueue(allMatches, filterOptions);
        setQueue(reshuffled);
        setCurrentIndex(0);
      }
    }
  };

  const sessionPnL = sessionLogs.reduce((sum, l) => sum + l.pnlUnits, 0);
  const sessionBets = sessionLogs.filter((l) => l.stakeAction !== 'NO_BET');
  const sessionWins = sessionBets.filter((l) => l.isPredictionCorrect).length;
  const sessionWinRate =
    sessionBets.length > 0 ? Math.round((sessionWins / sessionBets.length) * 100) : 0;

  if (allMatches.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
        <Layers className="w-12 h-12 mx-auto text-slate-600 mb-3" />
        <h3 className="text-lg font-bold text-slate-200">Aucun match disponible</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          Veuillez importer des captures de matchs ou charger les données démo pour vous entraîner.
        </p>
        <button
          onClick={onFinishSession}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition"
        >
          Retour à la base
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barre d'outils supérieure de session */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={onFinishSession}
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Quitter Session
          </button>

          <div>
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
              Entraînement : Match {currentIndex + 1} / {queue.length}
            </span>
            <span className="text-[11px] text-slate-500">
              Mode aveugle (issue & notes masquées jusqu'à la décision)
            </span>
          </div>
        </div>

        {/* Sélecteur de mode d'entraînement */}
        {!targetMatch && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Mode :</span>
            <select
              value={filterOptions.mode}
              onChange={(e) =>
                setFilterOptions({ ...filterOptions, mode: e.target.value as any })
              }
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-300 focus:outline-none"
            >
              <option value="RANDOM">Aléatoire Pur</option>
              <option value="MISTAKES_FIRST">Répétition Espacée (Erreurs en Premier)</option>
              <option value="ALL_ORDERED">Ordre Chronologique</option>
            </select>
          </div>
        )}

        {/* Scoreboard Session en direct */}
        <div className="flex items-center gap-4 bg-slate-950 px-3.5 py-1.5 rounded-lg border border-slate-800 text-xs font-mono">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Précision Session</span>
            <span
              className={`font-bold ${
                sessionWinRate >= 65 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {sessionWinRate}% ({sessionWins}/{sessionBets.length})
            </span>
          </div>

          <div className="border-l border-slate-800 pl-4">
            <span className="text-slate-500 block text-[10px] uppercase">PnL Session</span>
            <span
              className={`font-bold ${
                sessionPnL >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {sessionPnL >= 0 ? `+${sessionPnL.toFixed(2)}` : sessionPnL.toFixed(2)} u
            </span>
          </div>

          <div className="border-l border-slate-800 pl-4">
            <span className="text-slate-500 block text-[10px] uppercase">Bankroll</span>
            <span className="font-bold text-slate-200">
              {strategyConfig.currentBankrollUnits.toFixed(2)} u
            </span>
          </div>
        </div>
      </div>

      {/* Contenu Principal d'Entraînement : Lecteur Snapshots + Panneau Décision */}
      {currentMatch && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Lecteur haute-netteté des 1 à 4 captures */}
          <div className="lg:col-span-7 xl:col-span-8">
            <SnapshotViewer
              match={currentMatch}
              activeSlotIndex={activeSlotIndex}
              onSlotChange={setActiveSlotIndex}
            />
          </div>

          {/* Console de Décision & Stratégie */}
          <div className="lg:col-span-5 xl:col-span-4">
            <DecisionPanel
              currentBankroll={strategyConfig.currentBankrollUnits}
              strategyConfig={strategyConfig}
              defaultOdds={currentMatch.referenceOdds || 1.85}
              onSubmitDecision={handleDecisionSubmit}
            />
          </div>
        </div>
      )}

      {/* Feedback Modal lors de la validation */}
      {currentFeedback && (
        <FeedbackModal
          match={currentFeedback.match}
          log={currentFeedback.log}
          onNextMatch={handleNextMatch}
        />
      )}
    </div>
  );
};
