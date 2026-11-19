import { StrategyConfig, StakeAction, Outcome } from '../types';

export const DEFAULT_STRATEGY_CONFIG: StrategyConfig = {
  initialBankrollUnits: 100,
  currentBankrollUnits: 100,
  standardStakePct: 1.5,
  maxStakeCapPct: 3.0,
  minOddsThreshold: 1.60,
  minConfidenceThreshold: 65,
  kellyFraction: 0.25,
};

export interface EvaluationResult {
  impliedProbability: number;
  expectedValue: number;
  suggestedKellyUnits: number;
  isDisciplineValid: boolean;
  disciplineReason: string;
  suggestedStakeByAction: Record<StakeAction, number>;
}

export class StrategyEngine {
  /**
   * Calcul de la probabilité implicite : p_imp = 1 / C
   */
  static calculateImpliedProbability(odds: number): number {
    if (!odds || odds <= 1) return 1;
    return 1 / odds;
  }

  /**
   * Calcul de l'espérance mathématique : EV = (p / 100 * C) - 1
   */
  static calculateEV(confidencePct: number, odds: number): number {
    if (!odds || odds <= 0) return -1;
    const p = confidencePct / 100;
    return (p * odds) - 1;
  }

  /**
   * Calcul du Kelly fractionné plafonné en unités
   */
  static calculateKellyUnits(
    confidencePct: number,
    odds: number,
    bankroll: number,
    config: StrategyConfig = DEFAULT_STRATEGY_CONFIG
  ): number {
    if (odds <= 1 || confidencePct <= 0 || bankroll <= 0) return 0;
    const p = confidencePct / 100;
    const q = 1 - p;
    const b = odds - 1;
    
    // Formule Kelly : f* = (b*p - q) / b = (p*odds - 1) / (odds - 1)
    const fStar = (p * odds - 1) / b;
    if (fStar <= 0) return 0;

    const fraction = config.kellyFraction ?? 0.25;
    const maxCapPct = (config.maxStakeCapPct ?? 3.0) / 100;

    const rawKellyStake = bankroll * fStar * fraction;
    const maxCapStake = bankroll * maxCapPct;

    return Math.min(rawKellyStake, maxCapStake);
  }

  /**
   * Calcul des montants de mise recommandés selon l'action
   */
  static getStakeAmounts(
    bankroll: number,
    confidencePct: number,
    odds: number,
    config: StrategyConfig = DEFAULT_STRATEGY_CONFIG
  ): Record<StakeAction, number> {
    const stdPct = (config.standardStakePct ?? 1.5) / 100;
    const maxPct = (config.maxStakeCapPct ?? 3.0) / 100;

    const standard = Number((bankroll * stdPct).toFixed(2));
    const reduced = Number((standard * 0.5).toFixed(2));
    const reinforced = Number((bankroll * maxPct).toFixed(2));

    return {
      NO_BET: 0,
      STANDARD: standard,
      REINFORCED_CAPPED: reinforced,
      REDUCED: reduced,
    };
  }

  /**
   * Évaluation complète de la prise de décision
   */
  static evaluateDecision(
    observedOdds: number,
    confidencePct: number,
    stakeAction: StakeAction,
    stakeUnits: number,
    bankroll: number,
    config: StrategyConfig = DEFAULT_STRATEGY_CONFIG
  ): EvaluationResult {
    const impliedProbability = this.calculateImpliedProbability(observedOdds);
    const expectedValue = this.calculateEV(confidencePct, observedOdds);
    const suggestedKellyUnits = this.calculateKellyUnits(confidencePct, observedOdds, bankroll, config);
    const suggestedStakeByAction = this.getStakeAmounts(bankroll, confidencePct, observedOdds, config);

    const minOdds = config.minOddsThreshold ?? 1.60;
    const minConf = config.minConfidenceThreshold ?? 65;
    const maxCapPct = (config.maxStakeCapPct ?? 3.0) / 100;
    const maxAllowedStake = (bankroll * maxCapPct) + 0.05; // Marge tolérance float

    let isDisciplineValid = true;
    let disciplineReason = "Décision conforme au protocole de trading.";

    if (stakeAction === 'NO_BET' || stakeUnits === 0) {
      if (observedOdds < minOdds || confidencePct <= minConf || expectedValue <= 0) {
        isDisciplineValid = true;
        disciplineReason = "Discipline optimale : No-Bet rigoureusement appliqué (critères de cote ou de confiance non réunis).";
      } else {
        isDisciplineValid = true;
        disciplineReason = "No-Bet prudent validé : choix de préservation de capital.";
      }
    } else {
      // Le trader a décidé de miser
      const violations: string[] = [];
      if (observedOdds < minOdds) {
        violations.push(`Cote trop basse (${observedOdds.toFixed(2)} < seuil ${minOdds.toFixed(2)})`);
      }
      if (confidencePct <= minConf) {
        violations.push(`Confiance insuffisante (${confidencePct}% ≤ seuil ${minConf}%)`);
      }
      if (expectedValue <= 0) {
        violations.push(`Espérance mathématique négative (${(expectedValue * 100).toFixed(1)}% EV)`);
      }
      if (stakeUnits > maxAllowedStake) {
        violations.push(`Dépassement du plafond de mise autorisé (Mise: ${stakeUnits.toFixed(2)} > Plafond: ${(bankroll * maxCapPct).toFixed(2)})`);
      }

      if (violations.length > 0) {
        isDisciplineValid = false;
        disciplineReason = `Violation de discipline : ${violations.join(', ')}.`;
      } else {
        isDisciplineValid = true;
        disciplineReason = `Position validée : EV positive (+${(expectedValue * 100).toFixed(1)}%), cote ≥ ${minOdds.toFixed(2)}, confiance > ${minConf}%, mise calibrée.`;
      }
    }

    return {
      impliedProbability,
      expectedValue,
      suggestedKellyUnits,
      isDisciplineValid,
      disciplineReason,
      suggestedStakeByAction,
    };
  }

  /**
   * Calcul du résultat financier (PnL)
   */
  static calculatePnL(
    predictedOutcome: Outcome | null,
    actualOutcome: Outcome,
    stakeUnits: number,
    odds: number
  ): number {
    if (!predictedOutcome || stakeUnits <= 0) {
      return 0;
    }
    if (predictedOutcome === actualOutcome) {
      // Gain net = mise * (cote - 1)
      return Number((stakeUnits * (odds - 1)).toFixed(2));
    } else {
      // Perte = mise
      return Number((-stakeUnits).toFixed(2));
    }
  }
}
