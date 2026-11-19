import React, { useMemo } from 'react';
import { TrainingDecisionLog, MatchRecord, StrategyConfig } from '../../types';
import {
  TrendingUp,
  TrendingDown,
  Target,
  ShieldCheck,
  AlertTriangle,
  Award,
  BarChart3,
  Percent,
  Layers,
  ArrowUpRight,
} from 'lucide-react';

interface CalibrationDashboardProps {
  logs: TrainingDecisionLog[];
  matches: MatchRecord[];
  strategyConfig: StrategyConfig;
  onClearLogs?: () => void;
}

export const CalibrationDashboard: React.FC<CalibrationDashboardProps> = ({
  logs,
  matches,
  strategyConfig,
  onClearLogs,
}) => {
  // Calculs métriques globales
  const stats = useMemo(() => {
    const totalDecisions = logs.length;
    const betsTaken = logs.filter((l) => l.stakeAction !== 'NO_BET' && l.predictedOutcome !== null);
    const totalBets = betsTaken.length;
    const correctBets = betsTaken.filter((l) => l.isPredictionCorrect).length;
    const overallWinRate = totalBets > 0 ? (correctBets / totalBets) * 100 : 0;

    // Précision par issue
    const pairBets = betsTaken.filter((l) => l.predictedOutcome === 'PAIR');
    const pairWins = pairBets.filter((l) => l.isPredictionCorrect).length;
    const pairWinRate = pairBets.length > 0 ? (pairWins / pairBets.length) * 100 : 0;

    const impairBets = betsTaken.filter((l) => l.predictedOutcome === 'IMPAIR');
    const impairWins = impairBets.filter((l) => l.isPredictionCorrect).length;
    const impairWinRate = impairBets.length > 0 ? (impairWins / impairBets.length) * 100 : 0;

    // Métriques financières
    const totalStakedUnits = betsTaken.reduce((sum, l) => sum + l.stakeUnits, 0);
    const totalPnlUnits = logs.reduce((sum, l) => sum + l.pnlUnits, 0);
    const roi = totalStakedUnits > 0 ? (totalPnlUnits / totalStakedUnits) * 100 : 0;

    // Discipline de mise
    const disciplinedBets = logs.filter((l) => l.isDisciplineValid).length;
    const disciplineRate = totalDecisions > 0 ? (disciplinedBets / totalDecisions) * 100 : 100;
    const violationsCount = logs.filter((l) => !l.isDisciplineValid).length;

    // Courbe de Bankroll & Drawdown
    let runningBankroll = strategyConfig.initialBankrollUnits || 100;
    let peakBankroll = runningBankroll;
    let maxDrawdownPct = 0;

    const bankrollPoints: { timestamp: number; bankroll: number; pnl: number }[] = [
      { timestamp: logs[0]?.timestamp ? logs[0].timestamp - 3600000 : Date.now(), bankroll: runningBankroll, pnl: 0 },
    ];

    logs.forEach((log) => {
      runningBankroll += log.pnlUnits;
      if (runningBankroll > peakBankroll) {
        peakBankroll = runningBankroll;
      }
      const currentDrawdown = peakBankroll > 0 ? ((peakBankroll - runningBankroll) / peakBankroll) * 100 : 0;
      if (currentDrawdown > maxDrawdownPct) {
        maxDrawdownPct = currentDrawdown;
      }
      bankrollPoints.push({
        timestamp: log.timestamp,
        bankroll: Number(runningBankroll.toFixed(2)),
        pnl: log.pnlUnits,
      });
    });

    // Calibration Confiance vs Réel par tranches
    const brackets = [
      { label: '50% – 60%', min: 50, max: 60 },
      { label: '61% – 65%', min: 61, max: 65 },
      { label: '66% – 70%', min: 66, max: 70 },
      { label: '71% – 75%', min: 71, max: 75 },
      { label: '76% – 80%', min: 76, max: 80 },
      { label: '> 80%', min: 81, max: 100 },
    ];

    const calibrationData = brackets.map((b) => {
      const inBracket = betsTaken.filter(
        (l) => l.estimatedConfidence >= b.min && l.estimatedConfidence <= b.max
      );
      const wins = inBracket.filter((l) => l.isPredictionCorrect).length;
      const actualRate = inBracket.length > 0 ? (wins / inBracket.length) * 100 : null;
      const avgStated =
        inBracket.length > 0
          ? inBracket.reduce((sum, l) => sum + l.estimatedConfidence, 0) / inBracket.length
          : (b.min + b.max) / 2;

      return {
        ...b,
        count: inBracket.length,
        actualRate,
        avgStated,
      };
    });

    // Précision par Tag de pattern
    const tagStatsMap = new Map<string, { attempts: number; wins: number }>();
    betsTaken.forEach((l) => {
      const match = matches.find((m) => m.id === l.matchId);
      if (match) {
        match.tags.forEach((tag) => {
          const entry = tagStatsMap.get(tag) || { attempts: 0, wins: 0 };
          entry.attempts += 1;
          if (l.isPredictionCorrect) entry.wins += 1;
          tagStatsMap.set(tag, entry);
        });
      }
    });

    const tagStats = Array.from(tagStatsMap.entries())
      .map(([tag, data]) => ({
        tag,
        attempts: data.attempts,
        wins: data.wins,
        winRate: (data.wins / data.attempts) * 100,
      }))
      .sort((a, b) => b.attempts - a.attempts);

    return {
      totalDecisions,
      totalBets,
      overallWinRate,
      pairWinRate,
      pairCount: pairBets.length,
      impairWinRate,
      impairCount: impairBets.length,
      totalPnlUnits,
      totalStakedUnits,
      roi,
      currentBankroll: runningBankroll,
      maxDrawdownPct,
      disciplineRate,
      violationsCount,
      bankrollPoints,
      calibrationData,
      tagStats,
    };
  }, [logs, matches, strategyConfig]);

  if (logs.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
        <BarChart3 className="w-12 h-12 mx-auto text-slate-600 mb-3" />
        <p className="text-base font-semibold text-slate-300">Aucune session d'entraînement enregistrée</p>
        <p className="text-xs text-slate-500 mt-1">
          Démarrez une session d'entraînement pour générer vos métriques de précision et votre courbe de bankroll.
        </p>
      </div>
    );
  }

  // Calcul coordonnées SVG pour la courbe de Bankroll
  const svgWidth = 800;
  const svgHeight = 220;
  const padding = { top: 20, right: 30, bottom: 30, left: 50 };

  const bankrollValues = stats.bankrollPoints.map((p) => p.bankroll);
  const minVal = Math.min(...bankrollValues, strategyConfig.initialBankrollUnits * 0.9);
  const maxVal = Math.max(...bankrollValues, strategyConfig.initialBankrollUnits * 1.1);
  const valRange = maxVal - minVal || 1;

  const getSvgX = (index: number) => {
    const usableW = svgWidth - padding.left - padding.right;
    const step = stats.bankrollPoints.length > 1 ? usableW / (stats.bankrollPoints.length - 1) : usableW;
    return padding.left + index * step;
  };

  const getSvgY = (val: number) => {
    const usableH = svgHeight - padding.top - padding.bottom;
    const ratio = (val - minVal) / valRange;
    return svgHeight - padding.bottom - ratio * usableH;
  };

  const linePath = stats.bankrollPoints.reduce((acc, p, idx) => {
    const x = getSvgX(idx);
    const y = getSvgY(p.bankroll);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const areaPath = `${linePath} L ${getSvgX(stats.bankrollPoints.length - 1)} ${svgHeight - padding.bottom} L ${padding.left} ${svgHeight - padding.bottom} Z`;

  return (
    <div className="space-y-6">
      {/* 1. Cartes de Métriques Clés */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Taux de Réussite Global */}
        <div className="bg-[#0e131f] dark:bg-[#0e131f] light:bg-white border border-white/10 dark:border-white/10 light:border-slate-200 rounded-3xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] sm:text-xs uppercase font-bold tracking-wider">Précision Globale</span>
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black font-mono text-slate-100 dark:text-white light:text-slate-900">
              {stats.overallWinRate.toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-500">
              ({stats.totalBets} paris)
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-2 pt-2 border-t border-white/10 dark:border-white/10 light:border-slate-200">
            <span>Pair : <strong className="text-blue-400">{stats.pairWinRate.toFixed(0)}%</strong></span>
            <span>Impair : <strong className="text-pink-400">{stats.impairWinRate.toFixed(0)}%</strong></span>
          </div>
        </div>

        {/* PnL Simulé & Bankroll */}
        <div className="bg-[#0e131f] dark:bg-[#0e131f] light:bg-white border border-white/10 dark:border-white/10 light:border-slate-200 rounded-3xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] sm:text-xs uppercase font-bold tracking-wider">Profit Net (PnL)</span>
            {stats.totalPnlUnits >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-xl sm:text-2xl font-black font-mono ${
                stats.totalPnlUnits >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {stats.totalPnlUnits >= 0 ? `+${stats.totalPnlUnits.toFixed(2)}` : stats.totalPnlUnits.toFixed(2)} u
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-white/10 dark:border-white/10 light:border-slate-200">
            <span>Bankroll : <strong className="text-slate-200 dark:text-slate-200 light:text-slate-800 font-mono">{stats.currentBankroll.toFixed(1)} u</strong></span>
            <span>ROI : <strong className={stats.roi >= 0 ? 'text-emerald-400 font-mono' : 'text-red-400 font-mono'}>{stats.roi.toFixed(1)}%</strong></span>
          </div>
        </div>

        {/* Drawdown Maximal */}
        <div className="bg-[#0e131f] dark:bg-[#0e131f] light:bg-white border border-white/10 dark:border-white/10 light:border-slate-200 rounded-3xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] sm:text-xs uppercase font-bold tracking-wider">Max Drawdown</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black font-mono text-amber-400">
              -{stats.maxDrawdownPct.toFixed(1)}%
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-white/10 dark:border-white/10 light:border-slate-200">
            Perte max depuis le sommet
          </p>
        </div>

        {/* Taux de Discipline de Mise */}
        <div className="bg-[#0e131f] dark:bg-[#0e131f] light:bg-white border border-white/10 dark:border-white/10 light:border-slate-200 rounded-3xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] sm:text-xs uppercase font-bold tracking-wider">Discipline Stricte</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-xl sm:text-2xl font-black font-mono ${
                stats.disciplineRate >= 90 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {stats.disciplineRate.toFixed(1)}%
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-white/10 dark:border-white/10 light:border-slate-200">
            {stats.violationsCount === 0 ? (
              <span className="text-emerald-400">100% conforme</span>
            ) : (
              <span className="text-red-400">{stats.violationsCount} infractions</span>
            )}
          </p>
        </div>
      </div>

      {/* 2. Graphique Évolution de Bankroll */}
      <div className="bg-[#0e131f] dark:bg-[#0e131f] light:bg-white border border-white/10 dark:border-white/10 light:border-slate-200 rounded-3xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200 dark:text-white light:text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Courbe d'Évolution du Capital (Unités)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Trajectoire de la bankroll au fil des décisions d'entraînement
            </p>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Départ : {strategyConfig.initialBankrollUnits} u → Actuel : {stats.currentBankroll.toFixed(2)} u
          </div>
        </div>

        {/* SVG Responsive Chart */}
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-52 overflow-visible">
            <defs>
              <linearGradient id="bankrollGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Ligne de base initiale */}
            <line
              x1={padding.left}
              y1={getSvgY(strategyConfig.initialBankrollUnits)}
              x2={svgWidth - padding.right}
              y2={getSvgY(strategyConfig.initialBankrollUnits)}
              stroke="#475569"
              strokeDasharray="4 4"
              strokeWidth="1"
            />

            {/* Zone remplie dégradée */}
            <path d={areaPath} fill="url(#bankrollGrad)" />

            {/* Courbe principale */}
            <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />

            {/* Points de données */}
            {stats.bankrollPoints.map((p, idx) => (
              <circle
                key={idx}
                cx={getSvgX(idx)}
                cy={getSvgY(p.bankroll)}
                r={idx === stats.bankrollPoints.length - 1 ? 4 : 2.5}
                fill="#10b981"
                stroke="#0f172a"
                strokeWidth="1.5"
              />
            ))}

            {/* Axes & Libellés */}
            <text x={padding.left - 8} y={getSvgY(maxVal)} fill="#94a3b8" fontSize="10" textAnchor="end">
              {maxVal.toFixed(1)} u
            </text>
            <text x={padding.left - 8} y={getSvgY(strategyConfig.initialBankrollUnits)} fill="#94a3b8" fontSize="10" textAnchor="end">
              {strategyConfig.initialBankrollUnits.toFixed(1)} u
            </text>
            <text x={padding.left - 8} y={getSvgY(minVal)} fill="#94a3b8" fontSize="10" textAnchor="end">
              {minVal.toFixed(1)} u
            </text>
          </svg>
        </div>
      </div>

      {/* 3. Table de Calibration : Confiance Déclarée vs Taux de Réussite Réel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                Calibration de Confiance (Stated vs Actual)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Vérifie si votre confiance estimée correspond à la fréquence de gain réelle.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="py-2">Tranche Confiance</th>
                  <th className="py-2 text-center">Échantillons</th>
                  <th className="py-2 text-right">Succès Réel</th>
                  <th className="py-2 text-right">Biais</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {stats.calibrationData.map((row) => {
                  const bias = row.actualRate !== null ? row.actualRate - row.avgStated : null;
                  return (
                    <tr key={row.label} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 font-bold text-slate-200">{row.label}</td>
                      <td className="py-2.5 text-center text-slate-400">{row.count}</td>
                      <td className="py-2.5 text-right font-bold text-slate-100">
                        {row.actualRate !== null ? `${row.actualRate.toFixed(1)}%` : '-'}
                      </td>
                      <td className="py-2.5 text-right">
                        {bias === null ? (
                          <span className="text-slate-600">-</span>
                        ) : bias > 5 ? (
                          <span className="text-emerald-400 font-bold">+{bias.toFixed(1)}% (Sous-confiance)</span>
                        ) : bias < -5 ? (
                          <span className="text-red-400 font-bold">{bias.toFixed(1)}% (Surconfiance)</span>
                        ) : (
                          <span className="text-emerald-300 font-bold">Calibré (~0%)</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Précision par Tag de Pattern */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Performance par Tag de Pattern
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Identifiez les configurations de cotes les plus rentables pour votre trading.
              </p>
            </div>
          </div>

          {stats.tagStats.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-6 text-center">
              Aucun tag de pattern associé aux décisions prises.
            </p>
          ) : (
            <div className="space-y-3 mt-2">
              {stats.tagStats.slice(0, 5).map((item) => (
                <div key={item.tag} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">#{item.tag}</span>
                    <span className="font-mono text-slate-400">
                      <strong
                        className={
                          item.winRate >= 65 ? 'text-emerald-400' : 'text-amber-400'
                        }
                      >
                        {item.winRate.toFixed(1)}%
                      </strong>{' '}
                      ({item.wins}/{item.attempts})
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        item.winRate >= 65 ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, item.winRate)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
