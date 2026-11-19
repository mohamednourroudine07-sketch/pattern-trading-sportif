import React, { useState, useEffect, useRef } from 'react';
import { BackupService, DatabaseStats } from '../../db/backupService';
import { SyncService } from '../../services/syncService';
import { seedDemoData } from '../../db/seedData';
import {
  Download,
  Upload,
  FileSpreadsheet,
  FileCode,
  HardDrive,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Archive,
  ArrowDownToLine,
  Smartphone,
  Laptop,
  ArrowRightLeft,
  Wifi,
} from 'lucide-react';

interface DataExportHubProps {
  onDataReloaded: () => void;
}

export const DataExportHub: React.FC<DataExportHubProps> = ({ onDataReloaded }) => {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingJson, setIsExportingJson] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const importInputRef = useRef<HTMLInputElement>(null);
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const refreshStats = async () => {
    try {
      const s = await BackupService.getStats();
      setStats(s);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    refreshStats();
  }, []);

  // Synchronisation Push : Envoyer vers le PC
  const handlePushSync = async () => {
    setIsSyncing(true);
    setFeedback(null);
    try {
      const res = await SyncService.pushToPC();
      setFeedback({
        type: 'success',
        message: `Synchronisation réussie ! ${res.matchesCount} fiches et photos ont été transférées directement sur votre PC hôte.`,
      });
      await refreshStats();
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Erreur de synchronisation vers le PC : ${err.message}` });
    } finally {
      setIsSyncing(false);
    }
  };

  // Synchronisation Pull : Récupérer du PC
  const handlePullSync = async () => {
    setIsSyncing(true);
    setFeedback(null);
    try {
      const res = await SyncService.pullFromPC();
      setFeedback({
        type: 'success',
        message: `Restauration réussie : ${res.matchesRestored} matchs et ${res.logsRestored} logs récupérés depuis le PC hôte.`,
      });
      await refreshStats();
      onDataReloaded();
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Erreur de récupération depuis le PC : ${err.message}` });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportAllZip = async () => {
    setIsExportingZip(true);
    setFeedback(null);
    try {
      const fileName = await BackupService.downloadBackup();
      setFeedback({
        type: 'success',
        message: `Sauvegarde complète exportée avec succès : "${fileName}" (${stats?.matchesCount || 0} matchs & ${stats?.snapshotsCount || 0} captures incluses).`,
      });
      await refreshStats();
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Erreur lors de l'exportation : ${err.message}` });
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    setFeedback(null);
    try {
      await BackupService.exportLogsToCsv();
      setFeedback({
        type: 'success',
        message: 'Fichier CSV des décisions et PnL exporté avec succès (format compatible Excel et Sheets).',
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Erreur export CSV : ${err.message}` });
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleExportJson = async () => {
    setIsExportingJson(true);
    setFeedback(null);
    try {
      await BackupService.exportMatchesJson();
      setFeedback({
        type: 'success',
        message: 'Métadonnées brutes des matchs exportées en JSON avec succès.',
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Erreur export JSON : ${err.message}` });
    } finally {
      setIsExportingJson(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setFeedback(null);
    try {
      const res = await BackupService.importFromZip(file);
      setFeedback({
        type: 'success',
        message: `Restauration terminée : ${res.matchesCount} fiches de match et ${res.logsCount} logs réintégrés dans la base IndexedDB.`,
      });
      await refreshStats();
      onDataReloaded();
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Erreur d'import : ${err.message}` });
    } finally {
      setIsImporting(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const handleSeedDemo = async () => {
    if (window.confirm("Charger les 5 fiches de match Bet360 réalistes avec captures simulées et historique ?")) {
      try {
        await seedDemoData();
        setFeedback({
          type: 'success',
          message: 'Les matchs de démonstration ont été générés avec succès.',
        });
        await refreshStats();
        onDataReloaded();
      } catch (err: any) {
        setFeedback({ type: 'error', message: `Erreur : ${err.message}` });
      }
    }
  };

  const handleClearAll = async () => {
    if (
      window.confirm(
        'ATTENTION : Supprimer TOUTES les données locales (matchs, photos haute résolution et historique) ? Pensez à faire un export ZIP avant !'
      )
    ) {
      try {
        await BackupService.clearAllData();
        setFeedback({
          type: 'success',
          message: 'La base de données locale a été purgée avec succès.',
        });
        await refreshStats();
        onDataReloaded();
      } catch (err: any) {
        setFeedback({ type: 'error', message: `Erreur : ${err.message}` });
      }
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* 1. SECTION SPÉCIALE : SYNCHRONISATION DIRECTE TÉLÉPHONE ⇆ PC */}
      <div className="bg-gradient-to-r from-blue-900/30 via-[#0e131f] to-indigo-900/30 dark:bg-[#0e131f] light:bg-white border-2 border-blue-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="p-2.5 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 mt-0.5">
              <ArrowRightLeft className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                  {isMobile ? 'Vous êtes sur Téléphone' : 'Vous êtes sur PC Hôte'}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 font-bold">
                  <Wifi className="w-3 h-3" /> Wi-Fi Localhost
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-100 dark:text-white light:text-slate-900 mt-1">
                Synchronisation Directe Téléphone ⇆ Ordinateur
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
                Vous utilisez votre téléphone pour capturer et vous entraîner ? Transférez en un clic vos données récentes directement sur le disque dur de votre PC hôte, sans passer par Internet.
              </p>
            </div>
          </div>

          {/* Boutons d'action Synchro */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            <button
              onClick={handlePushSync}
              disabled={isSyncing}
              className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-glow-blue transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isSyncing ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Laptop className="w-4 h-4" />
              )}
              <span>{isMobile ? 'Envoyer au PC (1-Clic)' : 'Sauvegarder vers le PC'}</span>
            </button>

            <button
              onClick={handlePullSync}
              disabled={isSyncing}
              className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-white/10 transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <span>{isMobile ? 'Recevoir du PC' : 'Charger Données Téléphone'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. HEADER DU HUB DE DONNÉES */}
      <div className="bg-[#0e131f] dark:bg-[#0e131f] light:bg-white border border-white/10 dark:border-white/10 light:border-slate-200 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Archive className="w-4 h-4" />
              </span>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-400">
                Centre de Sauvegarde Local
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-slate-100 dark:text-white light:text-slate-900 tracking-tight">
              Exportations & Archives de Données
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Vos captures et vos analyses restent 100% locales dans votre navigateur. Téléchargez à tout moment vos sauvegardes complètes en archive ZIP.
            </p>
          </div>

          <button
            onClick={handleExportAllZip}
            disabled={isExportingZip}
            className="px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm shadow-glow-blue transition flex items-center justify-center gap-2.5 shrink-0 active:scale-95 disabled:opacity-50"
          >
            {isExportingZip ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <ArrowDownToLine className="w-5 h-5" />
            )}
            <span>{isExportingZip ? 'Exportation...' : 'TOUT EXPORTER (ZIP)'}</span>
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-5 border-t border-white/10 dark:border-white/10 light:border-slate-200">
            <div className="bg-black/30 dark:bg-black/30 light:bg-slate-50 p-3 rounded-2xl border border-white/5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-0.5">
                Fiches Matchs
              </span>
              <span className="text-lg font-black font-mono text-blue-400">
                {stats.matchesCount}
              </span>
            </div>

            <div className="bg-black/30 dark:bg-black/30 light:bg-slate-50 p-3 rounded-2xl border border-white/5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-0.5">
                Captures Stockées
              </span>
              <span className="text-lg font-black font-mono text-emerald-400">
                {stats.snapshotsCount}
              </span>
            </div>

            <div className="bg-black/30 dark:bg-black/30 light:bg-slate-50 p-3 rounded-2xl border border-white/5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-0.5">
                Volume Médias
              </span>
              <span className="text-lg font-black font-mono text-amber-400">
                {formatSize(stats.estimatedSizeBytes)}
              </span>
            </div>

            <div className="bg-black/30 dark:bg-black/30 light:bg-slate-50 p-3 rounded-2xl border border-white/5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-0.5">
                Décisions Tracées
              </span>
              <span className="text-lg font-black font-mono text-cyan-400">
                {stats.logsCount}
              </span>
            </div>
          </div>
        )}
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 border shadow ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/60 border-red-500/40 text-red-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Grille des formats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Export ZIP */}
        <div className="bg-[#0e131f] dark:bg-[#0e131f] light:bg-white border border-white/10 dark:border-white/10 light:border-slate-200 rounded-3xl p-5 shadow flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <Archive className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-sm text-slate-100 dark:text-white light:text-slate-900">
                Archive Complète (.ZIP)
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Exporte toutes vos métadonnées, paramètres et l'ensemble de vos photos de cotes en pleine résolution dans une archive compressée.
            </p>
          </div>

          <button
            onClick={handleExportAllZip}
            disabled={isExportingZip}
            className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 border border-white/10"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>{isExportingZip ? 'Génération...' : 'Télécharger l\'archive .ZIP'}</span>
          </button>
        </div>

        {/* Export CSV */}
        <div className="bg-[#0e131f] dark:bg-[#0e131f] light:bg-white border border-white/10 dark:border-white/10 light:border-slate-200 rounded-3xl p-5 shadow flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <FileSpreadsheet className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-sm text-slate-100 dark:text-white light:text-slate-900">
                Journal Décisionnel (CSV)
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Exporte vos paris, cotes observées, confiance, espérance mathématique EV et gains PnL pour analyse dans Excel ou Google Sheets.
            </p>
          </div>

          <button
            onClick={handleExportCsv}
            disabled={isExportingCsv}
            className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 border border-white/10"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isExportingCsv ? 'Exportation...' : 'Exporter le Journal en CSV'}</span>
          </button>
        </div>

        {/* Restauration ZIP */}
        <div className="bg-[#0e131f] dark:bg-[#0e131f] light:bg-white border border-white/10 dark:border-white/10 light:border-slate-200 rounded-3xl p-5 shadow flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <Upload className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-sm text-slate-100 dark:text-white light:text-slate-900">
                Restaurer depuis une Sauvegarde (.ZIP)
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Importez un fichier ZIP précédemment téléchargé pour réintégrer l'ensemble des matchs et des photos sur cet appareil.
            </p>
          </div>

          <button
            onClick={() => importInputRef.current?.click()}
            disabled={isImporting}
            className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 border border-white/10"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isImporting ? 'Importation...' : 'Sélectionner un fichier .ZIP'}</span>
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".zip"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>

        {/* Export JSON */}
        <div className="bg-[#0e131f] dark:bg-[#0e131f] light:bg-white border border-white/10 dark:border-white/10 light:border-slate-200 rounded-3xl p-5 shadow flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                <FileCode className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-sm text-slate-100 dark:text-white light:text-slate-900">
                Métadonnées Brutes (JSON)
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Exportez la structure brute JSON de toutes vos fiches de match pour archivage textuel ou réutilisation logicielle.
            </p>
          </div>

          <button
            onClick={handleExportJson}
            disabled={isExportingJson}
            className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 border border-white/10"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isExportingJson ? 'Exportation...' : 'Télécharger le JSON'}</span>
          </button>
        </div>
      </div>

      {/* Maintenance & Démo */}
      <div className="bg-black/30 dark:bg-black/30 light:bg-slate-100 border border-white/10 dark:border-white/10 light:border-slate-200 rounded-3xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <HardDrive className="w-4 h-4" />
          <span>Gestion locale de la base IndexedDB</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSeedDemo}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-white/10 transition flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            Recharger Démo Bet360
          </button>

          <button
            onClick={handleClearAll}
            className="px-3.5 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900 text-red-300 border border-red-800/40 text-xs font-bold transition flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Purger la Base
          </button>
        </div>
      </div>
    </div>
  );
};
