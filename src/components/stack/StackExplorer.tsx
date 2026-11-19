import React, { useState, useMemo } from 'react';
import { MatchRecord, Outcome } from '../../types';
import { db } from '../../db/database';
import { BackupService } from '../../db/backupService';
import {
  Layers,
  Search,
  Filter,
  Trash2,
  Edit,
  ArrowRightLeft,
  Play,
  CheckCircle,
  XCircle,
  Tag,
  Clock,
  Download,
  Sparkles,
} from 'lucide-react';

interface StackExplorerProps {
  matches: MatchRecord[];
  onRefresh: () => void;
  onEditMatch: (match: MatchRecord) => void;
  onStartTrainingOnMatch?: (match: MatchRecord) => void;
  onOpenCompare: (matchA: MatchRecord, matchB?: MatchRecord) => void;
}

export const StackExplorer: React.FC<StackExplorerProps> = ({
  matches,
  onRefresh,
  onEditMatch,
  onStartTrainingOnMatch,
  onOpenCompare,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOutcome, setFilterOutcome] = useState<'ALL' | Outcome>('ALL');
  const [filterCompleteness, setFilterCompleteness] = useState<'ALL' | 'FULL_4' | 'INCOMPLETE'>('ALL');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minOdds, setMinOdds] = useState('');
  const [maxOdds, setMaxOdds] = useState('');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'LEAST_ACCURATE' | 'MOST_PLAYED'>('NEWEST');
  const [isExporting, setIsExporting] = useState(false);

  // Multi-selection pour comparaison
  const [compareSelection, setCompareSelection] = useState<string[]>([]);

  const allAvailableTags = useMemo(() => {
    const set = new Set<string>();
    matches.forEach((m) => m.tags.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [matches]);

  const filteredMatches = useMemo(() => {
    return matches
      .filter((m) => {
        if (searchTerm.trim() !== '') {
          const s = searchTerm.trim().toLowerCase();
          const matchLabel = (m.label || '').toLowerCase().includes(s);
          const matchNotes = (m.notes || '').toLowerCase().includes(s);
          const matchTags = m.tags.some((t) => t.toLowerCase().includes(s));
          if (!matchLabel && !matchNotes && !matchTags) return false;
        }

        if (filterOutcome !== 'ALL' && m.actualOutcome !== filterOutcome) {
          return false;
        }

        if (filterCompleteness === 'FULL_4' && m.snapshots.length < 4) {
          return false;
        }
        if (filterCompleteness === 'INCOMPLETE' && m.snapshots.length >= 4) {
          return false;
        }

        if (selectedTag !== 'ALL' && !m.tags.includes(selectedTag)) {
          return false;
        }

        if (dateFrom && m.createdAt < new Date(`${dateFrom}T00:00:00`).getTime()) {
          return false;
        }
        if (dateTo && m.createdAt > new Date(`${dateTo}T23:59:59.999`).getTime()) {
          return false;
        }

        if (minOdds !== '' || maxOdds !== '') {
          if (m.referenceOdds === undefined) return false;
          if (minOdds !== '' && m.referenceOdds < Number(minOdds)) return false;
          if (maxOdds !== '' && m.referenceOdds > Number(maxOdds)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'NEWEST') return b.createdAt - a.createdAt;
        if (sortBy === 'MOST_PLAYED') return (b.stats.attempts || 0) - (a.stats.attempts || 0);
        if (sortBy === 'LEAST_ACCURATE') {
          const aRate = a.stats.attempts > 0 ? a.stats.correctPredictions / a.stats.attempts : 1;
          const bRate = b.stats.attempts > 0 ? b.stats.correctPredictions / b.stats.attempts : 1;
          return aRate - bRate;
        }
        return 0;
      });
  }, [matches, searchTerm, filterOutcome, filterCompleteness, selectedTag, dateFrom, dateTo, minOdds, maxOdds, sortBy]);

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    filterOutcome !== 'ALL' ||
    filterCompleteness !== 'ALL' ||
    selectedTag !== 'ALL' ||
    dateFrom !== '' ||
    dateTo !== '' ||
    minOdds !== '' ||
    maxOdds !== '';

  const handleDelete = async (id: string, label?: string) => {
    if (window.confirm(`Confirmer la suppression de la fiche match "${label || id}" ?`)) {
      await db.matches.delete(id);
      onRefresh();
    }
  };

  const toggleCompareSelect = (id: string) => {
    if (compareSelection.includes(id)) {
      setCompareSelection(compareSelection.filter((item) => item !== id));
    } else {
      if (compareSelection.length >= 2) {
        setCompareSelection([compareSelection[0], id]);
      } else {
        setCompareSelection([...compareSelection, id]);
      }
    }
  };

  const handleLaunchCompare = () => {
    if (compareSelection.length === 2) {
      const matchA = matches.find((m) => m.id === compareSelection[0]);
      const matchB = matches.find((m) => m.id === compareSelection[1]);
      if (matchA && matchB) {
        onOpenCompare(matchA, matchB);
      }
    }
  };

  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      await BackupService.downloadBackup();
    } catch (err: any) {
      alert(`Erreur d'exportation : ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Barre d'outils, Filtres & Recherche AiScore style */}
      <div className="bg-slate-900 dark:bg-[#0f172a] light:bg-white border border-slate-800 dark:border-[#1e2e4f] light:border-slate-200 rounded-2xl p-4 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Rechercher par équipe, tag, note..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 dark:bg-[#090f1d] light:bg-slate-50 border border-slate-800 dark:border-[#1e2e4f] light:border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs md:text-sm text-slate-100 dark:text-white light:text-slate-900 focus:outline-none focus:border-aiscore-500"
            />
          </div>

          {/* Comparaison active bar */}
          {compareSelection.length > 0 && (
            <div className="flex items-center gap-2 bg-aiscore-500/10 border border-aiscore-500/40 px-3 py-1.5 rounded-xl text-xs text-aiscore-400">
              <span className="font-semibold">Comparaison : {compareSelection.length}/2 matchs</span>
              {compareSelection.length === 2 && (
                <button
                  onClick={handleLaunchCompare}
                  className="bg-aiscore-500 hover:bg-aiscore-600 text-white font-bold px-2.5 py-1 rounded-lg transition flex items-center gap-1 shadow-glow-blue"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  Comparer côte à côte
                </button>
              )}
              <button
                onClick={() => setCompareSelection([])}
                className="text-slate-400 hover:text-white ml-1 text-xs underline"
              >
                Annuler
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportAll}
              disabled={isExporting}
              className="px-3 py-1.5 rounded-xl bg-slate-800 dark:bg-slate-800 light:bg-slate-100 hover:bg-slate-700 text-slate-200 dark:text-slate-200 light:text-slate-700 border border-slate-700 dark:border-slate-700 light:border-slate-300 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-aiscore-400" />
              <span>{isExporting ? 'Export...' : 'Exporter la Base (.ZIP)'}</span>
            </button>

            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-aiscore-500" />
              <span className="font-bold text-slate-100 dark:text-white light:text-slate-900">
                {filteredMatches.length}
              </span>{' '}
              sur {matches.length}
            </div>
          </div>
        </div>

        {/* Ligne des sélecteurs de filtre */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-800 dark:border-slate-800/80 light:border-slate-200 text-xs">
          <span className="text-slate-400 font-semibold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filtres :
          </span>

          {/* Issue */}
          <div className="inline-flex rounded-xl bg-slate-950 dark:bg-[#090f1d] light:bg-slate-100 border border-slate-800 dark:border-[#1e2e4f] light:border-slate-200 p-0.5">
            <button
              onClick={() => setFilterOutcome('ALL')}
              className={`px-3 py-1 rounded-lg transition font-bold ${
                filterOutcome === 'ALL'
                  ? 'bg-slate-800 dark:bg-slate-800 light:bg-white text-white dark:text-white light:text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setFilterOutcome('PAIR')}
              className={`px-3 py-1 rounded-lg transition font-bold ${
                filterOutcome === 'PAIR'
                  ? 'bg-blue-600 text-white shadow-glow-blue'
                  : 'text-slate-400 hover:text-blue-400'
              }`}
            >
              Pair
            </button>
            <button
              onClick={() => setFilterOutcome('IMPAIR')}
              className={`px-3 py-1 rounded-lg transition font-bold ${
                filterOutcome === 'IMPAIR'
                  ? 'bg-pink-600 text-white shadow'
                  : 'text-slate-400 hover:text-pink-400'
              }`}
            >
              Impair
            </button>
          </div>

          {/* Complétude */}
          <select
            value={filterCompleteness}
            onChange={(e) => setFilterCompleteness(e.target.value as any)}
            className="bg-slate-950 dark:bg-[#090f1d] light:bg-slate-100 border border-slate-800 dark:border-[#1e2e4f] light:border-slate-200 rounded-xl px-3 py-1.5 text-slate-300 dark:text-slate-300 light:text-slate-700 focus:outline-none"
          >
            <option value="ALL">Toute complétude</option>
            <option value="FULL_4">Complets (4/4 captures)</option>
            <option value="INCOMPLETE">Incomplets (&lt; 4 captures)</option>
          </select>

          {/* Tags */}
          {allAvailableTags.length > 0 && (
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="bg-slate-950 dark:bg-[#090f1d] light:bg-slate-100 border border-slate-800 dark:border-[#1e2e4f] light:border-slate-200 rounded-xl px-3 py-1.5 text-slate-300 dark:text-slate-300 light:text-slate-700 focus:outline-none"
            >
              <option value="ALL">Tous les tags</option>
              {allAvailableTags.map((t) => (
                <option key={t} value={t}>
                  #{t}
                </option>
              ))}
            </select>
          )}

          <label className="flex items-center gap-1.5 text-slate-400">
            Du
            <input
              type="date"
              aria-label="Date de début"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-slate-300 dark:border-[#1e2e4f] dark:bg-[#090f1d] light:border-slate-200 light:bg-slate-100 light:text-slate-700"
            />
          </label>
          <label className="flex items-center gap-1.5 text-slate-400">
            Au
            <input
              type="date"
              aria-label="Date de fin"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-slate-300 dark:border-[#1e2e4f] dark:bg-[#090f1d] light:border-slate-200 light:bg-slate-100 light:text-slate-700"
            />
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            aria-label="Cote minimum"
            placeholder="Cote min."
            value={minOdds}
            onChange={(e) => setMinOdds(e.target.value)}
            className="w-24 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-slate-300 dark:border-[#1e2e4f] dark:bg-[#090f1d] light:border-slate-200 light:bg-slate-100 light:text-slate-700"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            aria-label="Cote maximum"
            placeholder="Cote max."
            value={maxOdds}
            onChange={(e) => setMaxOdds(e.target.value)}
            className="w-24 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-slate-300 dark:border-[#1e2e4f] dark:bg-[#090f1d] light:border-slate-200 light:bg-slate-100 light:text-slate-700"
          />
          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterOutcome('ALL');
                setFilterCompleteness('ALL');
                setSelectedTag('ALL');
                setDateFrom('');
                setDateTo('');
                setMinOdds('');
                setMaxOdds('');
              }}
              className="rounded-lg px-2 py-1 text-slate-400 hover:bg-white/5 hover:text-white"
            >
              Effacer les filtres
            </button>
          )}

          {/* Tri */}
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-slate-500">Tri :</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950 dark:bg-[#090f1d] light:bg-slate-100 border border-slate-800 dark:border-[#1e2e4f] light:border-slate-200 rounded-xl px-2.5 py-1 text-slate-300 dark:text-slate-300 light:text-slate-700 focus:outline-none"
            >
              <option value="NEWEST">Plus récents</option>
              <option value="LEAST_ACCURATE">Moins bonne précision</option>
              <option value="MOST_PLAYED">Plus joués</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grille des Matchs */}
      {filteredMatches.length === 0 ? (
        <div className="bg-slate-900 dark:bg-[#0f172a] light:bg-white border border-slate-800 dark:border-[#1e2e4f] light:border-slate-200 rounded-2xl p-12 text-center text-slate-400">
          <Layers className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <p className="text-base font-semibold text-slate-200 dark:text-white light:text-slate-800">
            Aucun match trouvé
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Modifiez vos filtres ou ajoutez une nouvelle fiche match.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMatches.map((match) => {
            const isSelectedForCompare = compareSelection.includes(match.id);
            const winRate =
              match.stats.attempts > 0
                ? Math.round((match.stats.correctPredictions / match.stats.attempts) * 100)
                : null;

            return (
              <div
                key={match.id}
                className={`border rounded-2xl p-4 flex flex-col justify-between transition group shadow-md hover:border-aiscore-500 ${
                  isSelectedForCompare
                    ? 'border-aiscore-500 ring-2 ring-aiscore-500/30 bg-aiscore-500/10'
                    : 'bg-slate-900 dark:bg-[#0f172a] light:bg-white border-slate-800 dark:border-[#1e2e4f] light:border-slate-200'
                }`}
              >
                <div>
                  {/* Header Carte : Issue + Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`px-3 py-0.5 rounded-full text-xs font-black tracking-wide uppercase ${
                        match.actualOutcome === 'PAIR'
                          ? 'bg-blue-600 text-white shadow-glow-blue'
                          : 'bg-pink-600 text-white'
                      }`}
                    >
                      {match.actualOutcome}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {/* Badge complétude */}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                          match.snapshots.length === 4
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {match.snapshots.length}/4
                      </span>

                      {/* Cote référence */}
                      {match.referenceOdds && (
                        <span className="text-[11px] bg-slate-950 dark:bg-[#090f1d] light:bg-slate-100 text-slate-300 dark:text-slate-300 light:text-slate-700 border border-slate-800 dark:border-[#1e2e4f] light:border-slate-200 px-2 py-0.5 rounded-full font-mono font-bold">
                          @{match.referenceOdds.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Titre du match */}
                  <h3 className="font-bold text-sm line-clamp-1 text-slate-100 dark:text-white light:text-slate-900 group-hover:text-aiscore-400 transition">
                    {match.label || 'Match sans titre'}
                  </h3>

                  {/* Date & Stats */}
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {new Date(match.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                    {winRate !== null ? (
                      <span
                        className={`font-mono font-bold ${
                          winRate >= 65 ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        Précision: {winRate}% ({match.stats.attempts}x)
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">Non joué</span>
                    )}
                  </div>

                  {/* Aperçu des 4 slots miniatures */}
                  <div className="grid grid-cols-4 gap-1.5 my-3">
                    {Array.from({ length: 4 }).map((_, slotIdx) => {
                      const snap = match.snapshots.find((s) => s.slotIndex === slotIdx);
                      return (
                        <div
                          key={slotIdx}
                          className={`aspect-video rounded-lg border flex flex-col items-center justify-center text-[10px] font-mono relative overflow-hidden ${
                            snap
                              ? 'bg-black border-slate-700/80 text-slate-300'
                              : 'bg-slate-950/40 border-dashed border-slate-800 text-slate-600'
                          }`}
                        >
                          {snap ? (
                            <>
                              <img
                                src={URL.createObjectURL(snap.imageBlob)}
                                alt=""
                                className="w-full h-full object-cover opacity-70"
                              />
                              <span className="absolute bottom-0.5 right-0.5 bg-black/80 px-1 rounded text-[9px] font-bold text-cyan-400">
                                {snap.timeTag}
                              </span>
                            </>
                          ) : (
                            <span className="opacity-40">-</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Tags */}
                  {match.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {match.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] bg-slate-950 dark:bg-[#090f1d] light:bg-slate-100 border border-slate-800 dark:border-[#1e2e4f] light:border-slate-200 text-slate-400 dark:text-slate-400 light:text-slate-600 px-2 py-0.5 rounded-full"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Note rapide */}
                  {match.notes && (
                    <p className="text-[11px] text-slate-400 dark:text-slate-400 light:text-slate-600 italic line-clamp-2 bg-slate-950/60 dark:bg-slate-950/60 light:bg-slate-50 p-2 rounded-xl border border-slate-800/60 dark:border-[#1e2e4f]/60 light:border-slate-200">
                      "{match.notes}"
                    </p>
                  )}
                </div>

                {/* Barre d'actions du match */}
                <div className="pt-3 mt-3 border-t border-slate-800/80 dark:border-slate-800/80 light:border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleCompareSelect(match.id)}
                      className={`p-1.5 rounded-lg text-xs transition border flex items-center gap-1 ${
                        isSelectedForCompare
                          ? 'bg-aiscore-500 border-aiscore-400 text-white'
                          : 'bg-slate-950 dark:bg-[#090f1d] light:bg-slate-100 border-slate-800 dark:border-[#1e2e4f] light:border-slate-200 text-slate-400 hover:text-slate-200'
                      }`}
                      title={
                        isSelectedForCompare
                          ? 'Retirer de la comparaison'
                          : 'Sélectionner pour comparer'
                      }
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onEditMatch(match)}
                      className="p-1.5 rounded-lg bg-slate-950 dark:bg-[#090f1d] light:bg-slate-100 border border-slate-800 dark:border-[#1e2e4f] light:border-slate-200 text-slate-400 hover:text-slate-200 transition"
                      title="Modifier la fiche"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(match.id, match.label)}
                      className="p-1.5 rounded-lg bg-slate-950 dark:bg-[#090f1d] light:bg-slate-100 border border-slate-800 dark:border-[#1e2e4f] light:border-slate-200 text-slate-400 hover:text-red-400 transition"
                      title="Supprimer la fiche"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {onStartTrainingOnMatch && (
                    <button
                      onClick={() => onStartTrainingOnMatch(match)}
                      className="px-3.5 py-1.5 rounded-xl bg-aiscore-500 hover:bg-aiscore-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-glow-blue"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      S'entraîner
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
