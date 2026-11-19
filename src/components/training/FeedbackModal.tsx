import React, { useEffect } from 'react';
import { MatchRecord, TrainingDecisionLog } from '../../types';
import {
  CheckCircle2,
  XCircle,
  AlertOctagon,
  ShieldCheck,
  ArrowRight,
  BookOpen,
} from 'lucide-react';

interface FeedbackModalProps {
  match: MatchRecord;
  log: TrainingDecisionLog;
  onNextMatch: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  match,
  log,
  onNextMatch,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onNextMatch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNextMatch]);

  const isNoBet = log.stakeAction === 'NO_BET' || log.predictedOutcome === null;
  const isWin = !isNoBet && log.isPredictionCorrect;
  const isLoss = !isNoBet && !log.isPredictionCorrect;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[#0e131f] dark:bg-[#0e131f] light:bg-white border border-white/10 dark:border-white/10 light:border-slate-200 max-w-lg w-full rounded-3xl p-6 shadow-2xl space-y-5 text-slate-100 dark:text-slate-100 light:text-slate-900">
        {/* En-tête : Résultat Réel */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 dark:border-white/10 light:border-slate-200">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Débriefing Analytique
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-100 dark:text-white light:text-slate-900 mt-0.5 line-clamp-1">
              {match.label || 'Match Analysé'}
            </h2>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
              Issue Réelle
            </span>
            <span
              className={`px-3 py-1 rounded-full font-black text-xs uppercase ${
                match.actualOutcome === 'PAIR'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-pink-600 text-white shadow-md'
              }`}
            >
              {match.actualOutcome}
            </span>
          </div>
        </div>

        {/* Double Évaluation : Résultat Financier & Processus EV */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Résultat Financier */}
          <div
            className={`p-4 rounded-2xl border flex flex-col justify-between ${
              isNoBet
                ? 'bg-amber-500/10 border-amber-500/30'
                : isWin
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                {isNoBet ? (
                  <AlertOctagon className="w-4 h-4 text-amber-400" />
                ) : isWin ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                <span className="text-xs font-bold uppercase tracking-wider">
                  {isNoBet ? 'Position Passée' : isWin ? 'Pronostic Gagnant' : 'Pronostic Perdant'}
                </span>
              </div>

              <div className="text-xs opacity-80">
                Choix :{' '}
                <strong>
                  {log.predictedOutcome ? log.predictedOutcome : 'NO-BET'}
                </strong>{' '}
                @{log.observedOdds.toFixed(2)}
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-white/10 dark:border-white/10 light:border-slate-200 flex items-baseline justify-between">
              <span className="text-xs opacity-70">Impact Bankroll :</span>
              <span
                className={`font-mono text-base font-black ${
                  log.pnlUnits > 0
                    ? 'text-emerald-400'
                    : log.pnlUnits < 0
                    ? 'text-red-400'
                    : 'text-slate-400'
                }`}
              >
                {log.pnlUnits > 0 ? `+${log.pnlUnits.toFixed(2)}` : log.pnlUnits.toFixed(2)} u
              </span>
            </div>
          </div>

          {/* Qualité de la Discipline */}
          <div
            className={`p-4 rounded-2xl border flex flex-col justify-between ${
              log.isDisciplineValid
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <ShieldCheck
                  className={`w-4 h-4 ${
                    log.isDisciplineValid ? 'text-emerald-400' : 'text-red-400'
                  }`}
                />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Processus & Discipline
                </span>
              </div>

              <div className="text-xs opacity-80">
                Confiance : <strong>{log.estimatedConfidence}%</strong> | EV :{' '}
                <strong
                  className={`font-mono ${
                    log.expectedValue > 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {(log.expectedValue * 100).toFixed(1)}%
                </strong>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-white/10 dark:border-white/10 light:border-slate-200">
              <span
                className={`text-[11px] font-bold block line-clamp-2 ${
                  log.isDisciplineValid ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {log.disciplineReason || (log.isDisciplineValid ? 'Discipline stricte respectée.' : 'Règles non respectées.')}
              </span>
            </div>
          </div>
        </div>

        {/* Notes d'Analyse du Pattern */}
        {match.notes && (
          <div className="bg-black/30 dark:bg-black/30 light:bg-slate-50 border border-white/10 dark:border-white/10 light:border-slate-200 rounded-2xl p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5" />
              Notes d'Analyse du Trader
            </div>
            <p className="text-xs text-slate-300 dark:text-slate-300 light:text-slate-700 italic leading-relaxed">
              "{match.notes}"
            </p>
          </div>
        )}

        {/* Bouton Match Suivant */}
        <div className="pt-2">
          <button
            onClick={onNextMatch}
            autoFocus
            className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm shadow-xl shadow-blue-600/30 transition flex items-center justify-center gap-2 active:scale-95 touch-manipulation"
          >
            <span>Match Suivant</span>
            <span className="font-mono text-xs opacity-75 hidden sm:inline">[Entrée]</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};
