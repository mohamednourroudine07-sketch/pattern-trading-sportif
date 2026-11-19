import { db } from './database';
import { MatchRecord, MatchSnapshot, TimeSlotTag, Outcome, TrainingDecisionLog } from '../types';

/**
 * Crée un Blob d'image synthétique réaliste imitant l'interface Bet360
 * avec thème sombre, horloge de jeu, score, et tableau de cotes Pair/Impair.
 */
function createBet360MockCanvas(
  matchTitle: string,
  minuteTag: string,
  clockMinute: number,
  clockSeconds: number,
  score: string,
  pairOdds: number,
  impairOdds: number,
  pairTrend: 'up' | 'down' | 'neutral',
  impairTrend: 'up' | 'down' | 'neutral'
): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 540;
    const ctx = canvas.getContext('2d')!;

    // Fond sombre style bookmaker pro
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Barre supérieure header
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, 60);

    // Logo / titre Bet360 mock
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('BET360', 30, 38);

    ctx.fillStyle = '#64748b';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText('LIVE IN-PLAY TRADING CONSOLE', 130, 38);

    // Badge Repère Temporel (ex: 22' STACK FOCUS)
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.roundRect(canvas.width - 200, 15, 170, 32, 6);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`SLOT CIBLE : ${minuteTag}`, canvas.width - 115, 36);
    ctx.textAlign = 'left';

    // Carte Match Info
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(30, 80, canvas.width - 60, 100, 8);
    ctx.fill();

    // Match Nom
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText(matchTitle, 55, 122);

    // Horloge & Score
    const secStr = clockSeconds < 10 ? `0${clockSeconds}` : `${clockSeconds}`;
    const timeStr = `${clockMinute}:${secStr}`;

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(`⏱ ${timeStr}`, 55, 158);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(`Score : ${score}`, 220, 158);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText('Football — Marché Total Buts Pair / Impair', 400, 158);

    // Section Marché des Cotes
    const panelY = 200;
    const panelHeight = 280;
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.roundRect(30, panelY, canvas.width - 60, panelHeight, 8);
    ctx.fill();

    // Titre de marché
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText('SCORE TOTAL DU MATCH (PAIR / IMPAIR)', 55, panelY + 36);

    // Grille Cotes : Boîte PAIR
    const boxWidth = 410;
    const boxHeight = 170;
    const pairBoxX = 55;
    const boxY = panelY + 60;

    // Fond Boîte Pair
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = pairTrend === 'down' ? '#10b981' : pairTrend === 'up' ? '#ef4444' : '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(pairBoxX, boxY, boxWidth, boxHeight, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#93c5fd';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText('PAIR (EVEN)', pairBoxX + 25, boxY + 45);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px monospace';
    ctx.fillText(pairOdds.toFixed(2), pairBoxX + 25, boxY + 115);

    // Indicateur tendance Pair
    if (pairTrend === 'down') {
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText('▼ CHUTE / PRESSION FORTE', pairBoxX + 25, boxY + 145);
    } else if (pairTrend === 'up') {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText('▲ HAUSSE / DÉLAISSEMENT', pairBoxX + 25, boxY + 145);
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText('━ COTE STABLE', pairBoxX + 25, boxY + 145);
    }

    // Grille Cotes : Boîte IMPAIR
    const impairBoxX = pairBoxX + boxWidth + 20;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = impairTrend === 'down' ? '#10b981' : impairTrend === 'up' ? '#ef4444' : '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(impairBoxX, boxY, boxWidth, boxHeight, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f472b6';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText('IMPAIR (ODD)', impairBoxX + 25, boxY + 45);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px monospace';
    ctx.fillText(impairOdds.toFixed(2), impairBoxX + 25, boxY + 115);

    // Indicateur tendance Impair
    if (impairTrend === 'down') {
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText('▼ CHUTE / PRESSION FORTE', impairBoxX + 25, boxY + 145);
    } else if (impairTrend === 'up') {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText('▲ HAUSSE / DÉLAISSEMENT', impairBoxX + 25, boxY + 145);
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText('━ COTE STABLE', impairBoxX + 25, boxY + 145);
    }

    // Horodatage capture au bas
    ctx.fillStyle = '#475569';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(`CAPTURE HORODATÉE BET360 — MINUTE ${minuteTag} — ANALYSE PATTERN MULTI-SLOT`, 30, 515);

    canvas.toBlob((blob) => {
      resolve(blob || new Blob([], { type: 'image/png' }));
    }, 'image/png');
  });
}

/**
 * Génère des matchs de démonstration réalistes pour initialiser la base
 */
export async function seedDemoData(): Promise<void> {
  const existingMatches = await db.matches.count();
  if (existingMatches > 0) {
    return; // Ne pas écraser si l'utilisateur a déjà des données
  }

  const sampleMatchConfigs = [
    {
      id: 'demo-match-1',
      label: 'Arsenal vs Aston Villa — Premier League',
      outcome: 'PAIR' as Outcome,
      odds: 1.88,
      tags: ['chute-22', 'pression-pair', '0-0-ht'],
      notes: 'Micro-chute agressive de la cote Pair dès la 22ème minute (de 1.93 à 1.76). Signal fort de volume institutionnel.',
      snapshots: [
        { timeTag: "1'" as TimeSlotTag, exactMin: 1, sec: 14, score: '0 - 0', pair: 1.92, impair: 1.92, pTrend: 'neutral' as const, iTrend: 'neutral' as const },
        { timeTag: "2'" as TimeSlotTag, exactMin: 2, sec: 45, score: '0 - 0', pair: 1.93, impair: 1.91, pTrend: 'neutral' as const, iTrend: 'neutral' as const },
        { timeTag: "22'" as TimeSlotTag, exactMin: 22, sec: 18, score: '0 - 0', pair: 1.84, impair: 1.98, pTrend: 'down' as const, iTrend: 'up' as const },
        { timeTag: "23'" as TimeSlotTag, exactMin: 23, sec: 50, score: '0 - 0', pair: 1.76, impair: 2.06, pTrend: 'down' as const, iTrend: 'up' as const },
      ],
      stats: { attempts: 4, correctPredictions: 3, lastReviewedAt: Date.now() - 3600000 * 24 },
    },
    {
      id: 'demo-match-2',
      label: 'Inter Milan vs AS Roma — Serie A',
      outcome: 'IMPAIR' as Outcome,
      odds: 1.95,
      tags: ['stabilisation-23', 'flux-impair', 'rythme-eleve'],
      notes: 'Résistance nette sur Impair à 22\'-23\' malgré la tendance générale du marché. Sortie Impair confirmée (2-1 score final).',
      snapshots: [
        { timeTag: "1'" as TimeSlotTag, exactMin: 1, sec: 30, score: '0 - 0', pair: 1.90, impair: 1.94, pTrend: 'neutral' as const, iTrend: 'neutral' as const },
        { timeTag: "2'" as TimeSlotTag, exactMin: 2, sec: 15, score: '0 - 0', pair: 1.91, impair: 1.93, pTrend: 'neutral' as const, iTrend: 'neutral' as const },
        { timeTag: "22'" as TimeSlotTag, exactMin: 22, sec: 5, score: '0 - 0', pair: 1.96, impair: 1.86, pTrend: 'up' as const, iTrend: 'down' as const },
        { timeTag: "23'" as TimeSlotTag, exactMin: 23, sec: 40, score: '0 - 0', pair: 2.02, impair: 1.80, pTrend: 'up' as const, iTrend: 'down' as const },
      ],
      stats: { attempts: 3, correctPredictions: 3, lastReviewedAt: Date.now() - 3600000 * 12 },
    },
    {
      id: 'demo-match-3',
      label: 'Atletico Madrid vs Real Sociedad — La Liga',
      outcome: 'PAIR' as Outcome,
      odds: 1.82,
      tags: ['bloc-defensif', 'divergence-1-22', 'chute-22'],
      notes: 'Évolution typique de match verrouillé. Écrasement progressif de la cote Pair à 22\'. Issue 0-0 ou 2-0.',
      snapshots: [
        { timeTag: "1'" as TimeSlotTag, exactMin: 1, sec: 5, score: '0 - 0', pair: 1.91, impair: 1.91, pTrend: 'neutral' as const, iTrend: 'neutral' as const },
        { timeTag: "2'" as TimeSlotTag, exactMin: 2, sec: 32, score: '0 - 0', pair: 1.92, impair: 1.90, pTrend: 'neutral' as const, iTrend: 'neutral' as const },
        { timeTag: "22'" as TimeSlotTag, exactMin: 22, sec: 25, score: '0 - 0', pair: 1.81, impair: 2.00, pTrend: 'down' as const, iTrend: 'up' as const },
        { timeTag: "23'" as TimeSlotTag, exactMin: 23, sec: 15, score: '0 - 0', pair: 1.74, impair: 2.10, pTrend: 'down' as const, iTrend: 'up' as const },
      ],
      stats: { attempts: 5, correctPredictions: 4, lastReviewedAt: Date.now() - 3600000 * 48 },
    },
    {
      id: 'demo-match-4',
      label: 'Dortmund vs Leverkusen — Bundesliga',
      outcome: 'IMPAIR' as Outcome,
      odds: 1.91,
      tags: ['haute-volatilite', 'reversal-23', 'rythme-eleve'],
      notes: 'Faux signal à 1\'/2\' puis retournement net à 22\'/23\' en faveur d\'un match débridé avec score impair (3-2 final).',
      snapshots: [
        { timeTag: "1'" as TimeSlotTag, exactMin: 1, sec: 20, score: '0 - 0', pair: 1.88, impair: 1.96, pTrend: 'neutral' as const, iTrend: 'neutral' as const },
        { timeTag: "2'" as TimeSlotTag, exactMin: 2, sec: 50, score: '0 - 0', pair: 1.86, impair: 1.98, pTrend: 'neutral' as const, iTrend: 'neutral' as const },
        { timeTag: "22'" as TimeSlotTag, exactMin: 22, sec: 40, score: '0 - 0', pair: 2.05, impair: 1.78, pTrend: 'up' as const, iTrend: 'down' as const },
        { timeTag: "23'" as TimeSlotTag, exactMin: 23, sec: 30, score: '0 - 0', pair: 2.12, impair: 1.72, pTrend: 'up' as const, iTrend: 'down' as const },
      ],
      stats: { attempts: 2, correctPredictions: 1, lastReviewedAt: Date.now() - 3600000 * 6 },
    },
    {
      id: 'demo-match-5',
      label: 'Lyon vs Marseille — Ligue 1',
      outcome: 'PAIR' as Outcome,
      odds: 1.85,
      tags: ['chute-22', 'stabilisation-23', 'clasico'],
      notes: 'Convergence des indicateurs de volume dès la 22\'. Stabilisation ferme à la 23\'. Résultat 1-1.',
      snapshots: [
        { timeTag: "1'" as TimeSlotTag, exactMin: 1, sec: 10, score: '0 - 0', pair: 1.92, impair: 1.92, pTrend: 'neutral' as const, iTrend: 'neutral' as const },
        { timeTag: "2'" as TimeSlotTag, exactMin: 2, sec: 20, score: '0 - 0', pair: 1.93, impair: 1.91, pTrend: 'neutral' as const, iTrend: 'neutral' as const },
        { timeTag: "22'" as TimeSlotTag, exactMin: 22, sec: 15, score: '0 - 0', pair: 1.83, impair: 1.98, pTrend: 'down' as const, iTrend: 'up' as const },
        { timeTag: "23'" as TimeSlotTag, exactMin: 23, sec: 45, score: '0 - 0', pair: 1.78, impair: 2.04, pTrend: 'down' as const, iTrend: 'up' as const },
      ],
      stats: { attempts: 3, correctPredictions: 2, lastReviewedAt: Date.now() - 3600000 * 18 },
    },
  ];

  for (const config of sampleMatchConfigs) {
    const snapshots: MatchSnapshot[] = [];

    for (let i = 0; i < config.snapshots.length; i++) {
      const snapCfg = config.snapshots[i];
      const blob = await createBet360MockCanvas(
        config.label,
        snapCfg.timeTag,
        snapCfg.exactMin,
        snapCfg.sec,
        snapCfg.score,
        snapCfg.pair,
        snapCfg.impair,
        snapCfg.pTrend,
        snapCfg.iTrend
      );

      snapshots.push({
        id: `snap-${config.id}-${i}`,
        slotIndex: i,
        timeTag: snapCfg.timeTag,
        exactMinute: snapCfg.exactMin,
        imageBlob: blob,
        mimeType: 'image/png',
        oddsSnapshot: {
          pair: snapCfg.pair,
          impair: snapCfg.impair,
        },
      });
    }

    const matchRecord: MatchRecord = {
      id: config.id,
      createdAt: Date.now() - (Math.floor(Math.random() * 5) + 1) * 86400000,
      updatedAt: Date.now(),
      label: config.label,
      actualOutcome: config.outcome,
      referenceOdds: config.odds,
      tags: config.tags,
      notes: config.notes,
      snapshots,
      stats: config.stats,
    };

    await db.matches.put(matchRecord);
  }

  // Créer également des logs de sessions réalistes pour le tableau de bord
  const sampleLogs: TrainingDecisionLog[] = [
    {
      id: 'log-1',
      sessionId: 'init-session',
      matchId: 'demo-match-1',
      timestamp: Date.now() - 3600000 * 72,
      predictedOutcome: 'PAIR',
      observedOdds: 1.76,
      estimatedConfidence: 72,
      stakeAction: 'STANDARD',
      stakeUnits: 1.5,
      impliedProbability: 1 / 1.76,
      expectedValue: (0.72 * 1.76) - 1,
      isDisciplineValid: true,
      disciplineReason: 'Position conforme : EV positive (+26.7%), cote >= 1.60, confiance > 65%',
      actualOutcome: 'PAIR',
      isPredictionCorrect: true,
      pnlUnits: 1.14,
    },
    {
      id: 'log-2',
      sessionId: 'init-session',
      matchId: 'demo-match-2',
      timestamp: Date.now() - 3600000 * 48,
      predictedOutcome: 'IMPAIR',
      observedOdds: 1.80,
      estimatedConfidence: 68,
      stakeAction: 'STANDARD',
      stakeUnits: 1.5,
      impliedProbability: 1 / 1.80,
      expectedValue: (0.68 * 1.80) - 1,
      isDisciplineValid: true,
      disciplineReason: 'Position conforme : EV positive (+22.4%), cote >= 1.60, confiance > 65%',
      actualOutcome: 'IMPAIR',
      isPredictionCorrect: true,
      pnlUnits: 1.20,
    },
    {
      id: 'log-3',
      sessionId: 'init-session',
      matchId: 'demo-match-3',
      timestamp: Date.now() - 3600000 * 24,
      predictedOutcome: 'PAIR',
      observedOdds: 1.74,
      estimatedConfidence: 75,
      stakeAction: 'REINFORCED_CAPPED',
      stakeUnits: 3.0,
      impliedProbability: 1 / 1.74,
      expectedValue: (0.75 * 1.74) - 1,
      isDisciplineValid: true,
      disciplineReason: 'Position conforme au protocole : mise renforcée plafonnée respectée',
      actualOutcome: 'PAIR',
      isPredictionCorrect: true,
      pnlUnits: 2.22,
    },
    {
      id: 'log-4',
      sessionId: 'init-session',
      matchId: 'demo-match-4',
      timestamp: Date.now() - 3600000 * 12,
      predictedOutcome: 'PAIR',
      observedOdds: 1.55,
      estimatedConfidence: 60,
      stakeAction: 'STANDARD',
      stakeUnits: 1.5,
      impliedProbability: 1 / 1.55,
      expectedValue: (0.60 * 1.55) - 1,
      isDisciplineValid: false,
      disciplineReason: 'Violation de discipline : Cote trop basse (1.55 < 1.60), Confiance insuffisante (60% <= 65%), EV négative',
      actualOutcome: 'IMPAIR',
      isPredictionCorrect: false,
      pnlUnits: -1.50,
    },
    {
      id: 'log-5',
      sessionId: 'init-session',
      matchId: 'demo-match-5',
      timestamp: Date.now() - 3600000 * 2,
      predictedOutcome: null,
      observedOdds: 1.78,
      estimatedConfidence: 58,
      stakeAction: 'NO_BET',
      stakeUnits: 0,
      impliedProbability: 1 / 1.78,
      expectedValue: (0.58 * 1.78) - 1,
      isDisciplineValid: true,
      disciplineReason: 'Discipline optimale : No-Bet rigoureusement appliqué (confiance 58% < 65%)',
      actualOutcome: 'PAIR',
      isPredictionCorrect: false,
      pnlUnits: 0,
    },
  ];

  for (const log of sampleLogs) {
    await db.training_logs.put(log);
  }
}
