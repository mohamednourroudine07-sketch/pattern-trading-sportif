import { MatchRecord, TrainingFilterOptions } from '../types';

export class StackSelector {
  /**
   * Sélectionne une liste ordonnée de matchs pour une session selon les critères choisis
   */
  static selectMatchQueue(
    allMatches: MatchRecord[],
    options: TrainingFilterOptions
  ): MatchRecord[] {
    let pool = [...allMatches];

    // Filtre par complétude minimum si spécifié
    if (options.minSnapshots && options.minSnapshots > 0) {
      pool = pool.filter(m => (m.snapshots?.length || 0) >= options.minSnapshots!);
    }

    // Filtre par tag
    if (options.selectedTag && options.selectedTag.trim() !== '') {
      const tagLower = options.selectedTag.trim().toLowerCase();
      pool = pool.filter(m => m.tags.some(t => t.toLowerCase() === tagLower));
    }

    if (pool.length === 0) {
      return [];
    }

    switch (options.mode) {
      case 'MISTAKES_FIRST':
        // Répétition espacée / focus erreurs : trie d'abord ceux avec le plus d'erreurs
        // ou le taux de réussite le plus faible
        return pool.sort((a, b) => {
          const aAttempts = a.stats.attempts || 0;
          const bAttempts = b.stats.attempts || 0;
          const aRate = aAttempts > 0 ? a.stats.correctPredictions / aAttempts : 0.5;
          const bRate = bAttempts > 0 ? b.stats.correctPredictions / bAttempts : 0.5;

          // Moins bon taux en premier
          if (aRate !== bRate) return aRate - bRate;
          // Plus d'essais manqués en premier
          const aErrors = aAttempts - (a.stats.correctPredictions || 0);
          const bErrors = bAttempts - (b.stats.correctPredictions || 0);
          return bErrors - aErrors;
        });

      case 'RANDOM':
        // Tirage aléatoire (Fisher-Yates shuffle)
        return this.shuffle([...pool]);

      case 'ALL_ORDERED':
      case 'TAG_FILTERED':
      default:
        // Ordre antichronologique ou selon création
        return pool.sort((a, b) => b.createdAt - a.createdAt);
    }
  }

  private static shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
