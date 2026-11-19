import React, { useState, useEffect, useMemo } from 'react';
import { Outcome, StakeAction, StrategyConfig } from '../../types';
import { StrategyEngine } from '../../domain/strategyEngine';
import { ShieldCheck, AlertTriangle, Calculator, Send, Plus, Minus, Percent } from 'lucide-react';

interface DecisionPanelProps {
  currentBankroll: number;
  strategyConfig: StrategyConfig;
  defaultOdds?: number;
  onSubmitDecision: (decision: {
    predictedOutcome: Outcome | null;
    observedOdds: number;
    estimatedConfidence: number;
    stakeAction: StakeAction;
    stakeUnits: number;
  }) => void;
}

export const DecisionPanel: React.FC<DecisionPanelProps> = ({
  currentBankroll,
  strategyConfig,
  defaultOdds = 1.85,
  onSubmitDecision,
}) => {
  const [selectedOutcome, setSelectedOutcome] = useState<Outcome | null>('PAIR');
  const [oddsInput, setOddsInput] = useState<string>(String(defaultOdds));
  const [confidence, setConfidence] = useState<number>(70);

  // Le trader décide LIBREMENT de son pourcentage de mise ou de son montant exact
  const [stakeMode, setStakeMode] = useState<'PERCENT' | 'UNITS'>('PERCENT');
  const [customStakePct, setCustomStakePct] = useState<string>(
    String(strategyConfig.standardStakePct || 1.5)
  );
  const [customStakeUnits, setCustomStakeUnits] = useState<string>('');

  const parsedOdds = parseFloat(oddsInput) || 1.85;

  // Calcul dynamique de la mise selon le choix libre du trader
  const activeStakeUnits = useMemo(() => {
    if (selectedOutcome === null) {
      return 0;
    }
    if (stakeMode === 'PERCENT') {
      const pct = parseFloat(customStakePct) || 0;
      return Number(((currentBankroll * pct) / 100).toFixed(2));
    } else {
      return parseFloat(customStakeUnits) || 0;
    }
  }, [selectedOutcome, stakeMode, customStakePct, customStakeUnits, currentBankroll]);

  // Déduit l'action de mise
  const stakeAction: StakeAction = useMemo(() => {
    if (selectedOutcome === null || activeStakeUnits === 0) return 'NO_BET';
    const pct = (activeStakeUnits / (currentBankroll || 1)) * 100;
    if (pct >= strategyConfig.maxStakeCapPct) return 'REINFORCED_CAPPED';
    if (pct <= strategyConfig.standardStakePct * 0.6) return 'REDUCED';
    return 'STANDARD';
  }, [selectedOutcome, activeStakeUnits, currentBankroll, strategyConfig]);

  const evaluation = useMemo(() => {
    return StrategyEngine.evaluateDecision(
      parsedOdds,
      confidence,
      stakeAction,
      activeStakeUnits,
      currentBankroll,
      strategyConfig
    );
  }, [parsedOdds, confidence, stakeAction, activeStakeUnits, currentBankroll, strategyConfig]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSubmit();
        }
        return;
      }

      if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setSelectedOutcome('PAIR');
      } else if (e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setSelectedOutcome('IMPAIR');
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setSelectedOutcome(null);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedOutcome, parsedOdds, confidence, stakeAction, activeStakeUnits]);

  const handleSubmit = () => {
    onSubmitDecision({
      predictedOutcome: selectedOutcome,
      observedOdds: parsedOdds,
      estimatedConfidence: confidence,
      stakeAction,
      stakeUnits: activeStakeUnits,
    });
  };

  const adjustStakePct = (delta: number) => {
    const current = parseFloat(customStakePct) || 0;
    const next = Math.max(0.1, Number((current + delta).toFixed(2)));
    setCustomStakePct(String(next));
  };

  return (
    <div className="bg-[#0e131f] dark:bg-[#0e131f] light:bg-white border border-white/10 dark:border-white/10 light:border-slate-200 rounded-3xl p-5 shadow-xl space-y-4">
      {/* Header pur & sain */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 dark:border-white/10 light:border-slate-200">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 dark:text-slate-300 light:text-slate-700 flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5 text-blue-400" />
            Console Décisionnelle
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Protocole : Cote ≥ 1.60 · Confiance &gt; 65% · EV &gt; 0
          </p>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Bankroll</span>
          <span className="font-mono font-bold text-emerald-400 text-sm">
            {currentBankroll.toFixed(2)} u
          </span>
        </div>
      </div>

      {/* 1. Choix du Pronostic */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400 light:text-slate-600 mb-1.5">
          1. Issue Visée
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setSelectedOutcome('PAIR')}
            className={`py-3 px-3 rounded-2xl font-bold transition-all flex flex-col items-center justify-center gap-0.5 border active:scale-95 touch-manipulation ${
              selectedOutcome === 'PAIR'
                ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-600/30 ring-2 ring-blue-400'
                : 'bg-black/30 dark:bg-black/30 light:bg-slate-100 text-slate-400 border-white/5 hover:border-blue-500/50'
            }`}
          >
            <span className="text-sm font-black tracking-wide">PAIR</span>
            <span className="text-[9px] opacity-70 font-mono hidden sm:inline">[P]</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedOutcome('IMPAIR')}
            className={`py-3 px-3 rounded-2xl font-bold transition-all flex flex-col items-center justify-center gap-0.5 border active:scale-95 touch-manipulation ${
              selectedOutcome === 'IMPAIR'
                ? 'bg-pink-600 text-white border-pink-400 shadow-lg shadow-pink-600/30 ring-2 ring-pink-400'
                : 'bg-black/30 dark:bg-black/30 light:bg-slate-100 text-slate-400 border-white/5 hover:border-pink-500/50'
            }`}
          >
            <span className="text-sm font-black tracking-wide">IMPAIR</span>
            <span className="text-[9px] opacity-70 font-mono hidden sm:inline">[I]</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedOutcome(null)}
            className={`py-3 px-3 rounded-2xl font-bold transition-all flex flex-col items-center justify-center gap-0.5 border active:scale-95 touch-manipulation ${
              selectedOutcome === null
                ? 'bg-amber-600 text-white border-amber-400 shadow-lg shadow-amber-600/30 ring-2 ring-amber-400'
                : 'bg-black/30 dark:bg-black/30 light:bg-slate-100 text-slate-400 border-white/5 hover:border-amber-500/50'
            }`}
          >
            <span className="text-sm font-black tracking-wide">NO-BET</span>
            <span className="text-[9px] opacity-70 font-mono hidden sm:inline">[N]</span>
          </button>
        </div>
      </div>

      {/* 2. Cotes & Confiance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400 light:text-slate-600 mb-1">
            Cote Observée ($C$)
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              min="1.05"
              max="15.00"
              value={oddsInput}
              onChange={(e) => setOddsInput(e.target.value)}
              className="w-full bg-black/40 dark:bg-black/40 light:bg-slate-50 border border-white/10 dark:border-white/10 light:border-slate-300 rounded-2xl px-3.5 py-2 text-slate-100 dark:text-white light:text-slate-900 font-mono text-base font-bold focus:outline-none focus:border-blue-500"
            />
            <span className="absolute right-3 top-2.5 text-[10px] text-slate-500 font-mono">
              $p_{'{imp}'} = {(evaluation.impliedProbability * 100).toFixed(0)}%$
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400 light:text-slate-600">
              Confiance ($p$)
            </label>
            <span
              className={`font-mono font-bold text-xs ${
                confidence > 65 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {confidence}%
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setConfidence((c) => Math.max(50, c - 5))}
              className="p-2 rounded-xl bg-black/40 dark:bg-black/40 light:bg-slate-100 border border-white/10 text-slate-400 hover:text-white transition active:scale-95"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <input
              type="range"
              min="50"
              max="95"
              step="1"
              value={confidence}
              onChange={(e) => setConfidence(parseInt(e.target.value, 10))}
              className="flex-1 accent-blue-500 h-2 bg-black/40 rounded-lg cursor-pointer"
            />

            <button
              type="button"
              onClick={() => setConfidence((c) => Math.min(95, c + 5))}
              className="p-2 rounded-xl bg-black/40 dark:bg-black/40 light:bg-slate-100 border border-white/10 text-slate-400 hover:text-white transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Calibrage LIBRE de la Mise (Décidé par le trader, non préfixé) */}
      {selectedOutcome !== null && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400 light:text-slate-600">
              3. Dimensionnement de Mise Libre (Par Vous)
            </label>
            <div className="flex items-center gap-1 text-[11px]">
              <button
                type="button"
                onClick={() => setStakeMode('PERCENT')}
                className={`px-2 py-0.5 rounded-lg font-bold transition ${
                  stakeMode === 'PERCENT'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                % Bankroll
              </button>
              <button
                type="button"
                onClick={() => setStakeMode('UNITS')}
                className={`px-2 py-0.5 rounded-lg font-bold transition ${
                  stakeMode === 'UNITS'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Unités
              </button>
            </div>
          </div>

          {/* Saisie Libre du % ou des Unités avec boutons d'ajustement */}
          <div className="flex items-center gap-2">
            {stakeMode === 'PERCENT' ? (
              <>
                <button
                  type="button"
                  onClick={() => adjustStakePct(-0.5)}
                  className="p-2.5 rounded-2xl bg-black/40 dark:bg-black/40 light:bg-slate-100 border border-white/10 text-slate-400 hover:text-white font-bold text-xs"
                >
                  -0.5%
                </button>

                <div className="relative flex-1">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="100"
                    value={customStakePct}
                    onChange={(e) => setCustomStakePct(e.target.value)}
                    placeholder="ex: 1.5"
                    className="w-full bg-black/40 dark:bg-black/40 light:bg-slate-50 border border-white/10 dark:border-white/10 light:border-slate-300 rounded-2xl px-3.5 py-2 text-slate-100 dark:text-white light:text-slate-900 font-mono text-base font-bold text-center focus:outline-none focus:border-blue-500"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-blue-400 font-bold">
                    %
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => adjustStakePct(0.5)}
                  className="p-2.5 rounded-2xl bg-black/40 dark:bg-black/40 light:bg-slate-100 border border-white/10 text-slate-400 hover:text-white font-bold text-xs"
                >
                  +0.5%
                </button>
              </>
            ) : (
              <div className="relative flex-1">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={customStakeUnits}
                  onChange={(e) => setCustomStakeUnits(e.target.value)}
                  placeholder="Mise en unités libres (ex: 2.0)"
                  className="w-full bg-black/40 dark:bg-black/40 light:bg-slate-50 border border-white/10 dark:border-white/10 light:border-slate-300 rounded-2xl px-3.5 py-2 text-slate-100 dark:text-white light:text-slate-900 font-mono text-base font-bold text-center focus:outline-none focus:border-blue-500"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-emerald-400 font-bold">
                  unités
                </span>
              </div>
            )}
          </div>

          {/* Raccourcis de suggestion rapides non contraignants */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
            <span className="text-slate-500">Repères :</span>
            <button
              type="button"
              onClick={() => {
                setStakeMode('PERCENT');
                setCustomStakePct('1.5');
              }}
              className="px-2.5 py-1 rounded-xl bg-black/30 hover:bg-white/10 text-slate-300 border border-white/5 font-mono"
            >
              Std (1.5%)
            </button>
            <button
              type="button"
              onClick={() => {
                setStakeMode('PERCENT');
                setCustomStakePct('3.0');
              }}
              className="px-2.5 py-1 rounded-xl bg-black/30 hover:bg-white/10 text-slate-300 border border-white/5 font-mono"
            >
              Plafond (3.0%)
            </button>
            <button
              type="button"
              onClick={() => {
                setStakeMode('UNITS');
                setCustomStakeUnits(evaluation.suggestedKellyUnits.toFixed(2));
              }}
              className="px-2.5 py-1 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 border border-blue-500/20 font-mono"
            >
              Kelly ({evaluation.suggestedKellyUnits.toFixed(2)} u)
            </button>

            <span className="ml-auto font-mono text-xs font-bold text-slate-200 dark:text-slate-200 light:text-slate-800">
              = <strong className="text-emerald-400">{activeStakeUnits.toFixed(2)} u</strong>
            </span>
          </div>
        </div>
      )}

      {/* 4. Indicateur de Processus EV & Bouton de Validation */}
      <div className="bg-black/40 dark:bg-black/40 light:bg-slate-50 border border-white/10 dark:border-white/10 light:border-slate-200 rounded-2xl p-3 flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                evaluation.isDisciplineValid ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
              }`}
            />
            <span
              className={`font-bold ${
                evaluation.isDisciplineValid ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {evaluation.isDisciplineValid ? 'Discipline Validée' : 'Critères Non Réunis'}
            </span>
          </div>

          <span className="font-mono text-xs text-slate-300 dark:text-slate-300 light:text-slate-700">
            EV :{' '}
            <strong className={evaluation.expectedValue > 0 ? 'text-emerald-400' : 'text-red-400'}>
              {(evaluation.expectedValue * 100).toFixed(1)}%
            </strong>
          </span>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 active:scale-95 touch-manipulation"
        >
          <Send className="w-4 h-4" />
          <span>Valider Décision</span>
          <span className="font-mono text-[10px] opacity-75 hidden sm:inline">[Entrée]</span>
        </button>
      </div>
    </div>
  );
};
