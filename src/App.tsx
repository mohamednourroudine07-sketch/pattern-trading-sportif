import React, { useState, useEffect, useCallback } from 'react';
import { db } from './db/database';
import { seedDemoData } from './db/seedData';
import { BackupService } from './db/backupService';
import { SyncService } from './services/syncService';
import { MatchRecord, StrategyConfig, TrainingDecisionLog } from './types';
import { DEFAULT_STRATEGY_CONFIG } from './domain/strategyEngine';
import { MatchUploader } from './components/ingestion/MatchUploader';
import { StackExplorer } from './components/stack/StackExplorer';
import { CompareView } from './components/stack/CompareView';
import { TrainingSession } from './components/training/TrainingSession';
import { CalibrationDashboard } from './components/analytics/CalibrationDashboard';
import { SettingsModal } from './components/settings/SettingsModal';
import { DataExportHub } from './components/export/DataExportHub';
import { MobileConnectModal } from './components/mobile/MobileConnectModal';
import {
  Layers,
  Upload,
  Play,
  BarChart3,
  Settings,
  Keyboard,
  Archive,
  Download,
  Sun,
  Moon,
  Smartphone,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

type ActiveTab = 'training' | 'stack' | 'ingestion' | 'analytics' | 'compare' | 'export';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('training');
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [logs, setLogs] = useState<TrainingDecisionLog[]>([]);
  const [strategyConfig, setStrategyConfig] = useState<StrategyConfig>(DEFAULT_STRATEGY_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  // Thème Nuit / Jour (Pur, Sain, Élégant)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('bet360-theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  // Export rapide depuis le header
  const [isHeaderExporting, setIsHeaderExporting] = useState(false);
  const [isHeaderSyncing, setIsHeaderSyncing] = useState(false);
  const [headerExportMessage, setHeaderExportMessage] = useState<string | null>(null);
  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocalNetwork =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);

  const handleQuickSync = async () => {
    setIsHeaderSyncing(true);
    setHeaderExportMessage(null);
    try {
      if (isMobile) {
        const res = await SyncService.pushToPC();
        setHeaderExportMessage(`${res.matchesCount} fiches envoyées au PC !`);
      } else {
        const res = await SyncService.pullFromPC();
        if (res.matchesRestored > 0) {
          setHeaderExportMessage(`${res.matchesRestored} fiches reçues du téléphone !`);
          loadData();
        } else {
          setHeaderExportMessage('PC à jour.');
        }
      }
      setTimeout(() => setHeaderExportMessage(null), 3000);
    } catch (err: any) {
      alert(`Erreur synchronisation : ${err.message}`);
    } finally {
      setIsHeaderSyncing(false);
    }
  };

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isKeyboardGuideOpen, setIsKeyboardGuideOpen] = useState(false);
  const [isMobileConnectOpen, setIsMobileConnectOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<MatchRecord | null>(null);

  // Mode Comparatif
  const [compareMatchA, setCompareMatchA] = useState<MatchRecord | null>(null);
  const [compareMatchB, setCompareMatchB] = useState<MatchRecord | null>(null);

  // Match cible pour entraînement
  const [trainingTargetMatch, setTrainingTargetMatch] = useState<MatchRecord | null>(null);

  // Synchronisation du thème sombre / clair avec document.documentElement
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('bet360-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const loadData = useCallback(async () => {
    try {
      const matchCount = await db.matches.count();
      if (matchCount === 0) {
        await seedDemoData();
      }

      const allMatches = await db.matches.toArray();
      const allLogs = await db.training_logs.toArray();
      const cfg = await db.getStrategyConfig();

      setMatches(allMatches);
      setLogs(allLogs);
      setStrategyConfig(cfg);
    } catch (err) {
      console.error('Erreur chargement données:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleQuickExportAll = async () => {
    setIsHeaderExporting(true);
    setHeaderExportMessage(null);
    try {
      const fileName = await BackupService.downloadBackup();
      setHeaderExportMessage(`Archive ZIP téléchargée !`);
      setTimeout(() => setHeaderExportMessage(null), 3000);
    } catch (err: any) {
      alert(`Erreur d'exportation : ${err.message}`);
    } finally {
      setIsHeaderExporting(false);
    }
  };

  const handleStartTrainingOnMatch = (match: MatchRecord) => {
    setTrainingTargetMatch(match);
    setActiveTab('training');
  };

  const handleOpenCompare = (matchA: MatchRecord, matchB?: MatchRecord) => {
    setCompareMatchA(matchA);
    setCompareMatchB(matchB || null);
    setActiveTab('compare');
  };

  const handleMatchSaved = (_: MatchRecord) => {
    setEditingMatch(null);
    loadData();
    setActiveTab('stack');
  };

  const totalPnl = logs.reduce((sum, l) => sum + l.pnlUnits, 0);

  return (
    <div
      className={`min-h-screen transition-colors duration-200 font-sans ${
        theme === 'dark'
          ? 'bg-[#07090e] text-slate-100'
          : 'bg-[#f8fafc] text-slate-900'
      }`}
    >
      {/* Top Header — Épuré, Pur & Élégant */}
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-xl transition-colors ${
          theme === 'dark'
            ? 'bg-[#07090e]/85 border-white/[0.08]'
            : 'bg-white/85 border-slate-200/80 shadow-sm'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          {/* Logo & Titre */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 font-black text-lg select-none">
              ⚽
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-tight uppercase">
                  Bet360 <span className="text-blue-500 font-extrabold">Pattern</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold hidden sm:inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Pair / Impair
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                Reconnaissance de Cotes Multi-Slots (1', 2', 22', 23')
              </p>
            </div>
          </div>

          {/* Navigation PC (Masquée sur petit mobile pour laisser place à la Bottom Nav) */}
          <nav
            className={`hidden md:flex items-center gap-1 p-1 rounded-2xl text-xs font-bold border transition-colors ${
              theme === 'dark'
                ? 'bg-[#0d121d] border-white/[0.08]'
                : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              onClick={() => {
                setTrainingTargetMatch(null);
                setActiveTab('training');
              }}
              className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                activeTab === 'training'
                  ? 'bg-blue-600 text-white shadow-md font-black'
                  : theme === 'dark'
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Entraînement</span>
            </button>

            <button
              onClick={() => setActiveTab('stack')}
              className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                activeTab === 'stack'
                  ? 'bg-blue-600 text-white shadow-md font-black'
                  : theme === 'dark'
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Base ({matches.length})</span>
            </button>

            <button
              onClick={() => {
                setEditingMatch(null);
                setActiveTab('ingestion');
              }}
              className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                activeTab === 'ingestion'
                  ? 'bg-blue-600 text-white shadow-md font-black'
                  : theme === 'dark'
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>+ Match</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                activeTab === 'analytics'
                  ? 'bg-blue-600 text-white shadow-md font-black'
                  : theme === 'dark'
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Stats & EV</span>
            </button>

            <button
              onClick={() => setActiveTab('export')}
              className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                activeTab === 'export'
                  ? 'bg-blue-600 text-white shadow-md font-black'
                  : theme === 'dark'
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Données</span>
            </button>
          </nav>

          {/* Actions & Outils Header */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Widget Bankroll */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-2xl text-xs font-mono border ${
                theme === 'dark'
                  ? 'bg-[#0d121d] border-white/[0.08]'
                  : 'bg-slate-100 border-slate-200'
              }`}
            >
              <span className="text-[10px] text-slate-500 uppercase font-bold hidden sm:inline">Bankroll:</span>
              <strong className="text-emerald-400 font-bold">
                {strategyConfig.currentBankrollUnits.toFixed(1)} u
              </strong>
            </div>

            {/* Bouton rapide "TOUT EXPORTER" */}
            <div className="relative">
              <button
                onClick={handleQuickExportAll}
                disabled={isHeaderExporting}
                title="Exporter tout en archive ZIP"
                className="px-3 py-1.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                {isHeaderExporting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">Tout Exporter</span>
                <span className="text-[10px] opacity-80 font-mono">ZIP</span>
              </button>

              {headerExportMessage && (
                <div className="absolute right-0 top-10 whitespace-nowrap bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-xl shadow-xl font-bold flex items-center gap-1.5 z-50 animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {headerExportMessage}
                </div>
              )}
            </div>

            {/* Bouton Synchro Directe PC / Téléphone */}
            {isLocalNetwork && (
              <button
                onClick={handleQuickSync}
                disabled={isHeaderSyncing}
                title={isMobile ? "Envoyer les données vers le PC hôte" : "Recevoir les données du Téléphone"}
                className={`px-2.5 sm:px-3 py-1.5 rounded-2xl border transition flex items-center gap-1.5 text-xs font-bold ${
                  theme === 'dark'
                    ? 'bg-blue-600/15 hover:bg-blue-600/25 border-blue-500/30 text-blue-400'
                    : 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700'
                }`}
              >
                <div className={isHeaderSyncing ? 'animate-spin' : ''}>
                  <Smartphone className="w-3.5 h-3.5" />
                </div>
                <span className="hidden sm:inline">
                  {isMobile ? 'Synchro PC' : 'Synchro Tél'}
                </span>
              </button>
            )}

            {/* Bouton Accès Téléphone Android / QR Code */}
            <button
              onClick={() => setIsMobileConnectOpen(true)}
              className={`p-2 rounded-2xl border transition ${
                theme === 'dark'
                  ? 'bg-[#0d121d] border-white/[0.08] text-cyan-400 hover:text-white'
                  : 'bg-slate-100 border-slate-200 text-blue-600 hover:text-blue-800'
              }`}
              title="Ouvrir sur Téléphone Android (QR Code & Wi-Fi)"
            >
              <Smartphone className="w-4 h-4" />
            </button>

            {/* Bascule Mode Nuit / Mode Jour */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-2xl border transition ${
                theme === 'dark'
                  ? 'bg-[#0d121d] border-white/[0.08] text-amber-400 hover:text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-950'
              }`}
              title={theme === 'dark' ? 'Basculer en Mode Jour' : 'Basculer en Mode Nuit'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Paramètres */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`p-2 rounded-2xl border transition ${
                theme === 'dark'
                  ? 'bg-[#0d121d] border-white/[0.08] text-slate-400 hover:text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
              title="Paramètres de stratégie"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area (padding adapté pour la bottom bar sur mobile) */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 flex-1 w-full pb-24 md:pb-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-xs font-semibold">Chargement...</p>
          </div>
        ) : (
          <>
            {activeTab === 'training' && (
              <TrainingSession
                allMatches={matches}
                strategyConfig={strategyConfig}
                onConfigUpdated={(cfg) => setStrategyConfig(cfg)}
                onFinishSession={() => setActiveTab('stack')}
                targetMatch={trainingTargetMatch}
              />
            )}

            {activeTab === 'stack' && (
              <StackExplorer
                matches={matches}
                onRefresh={loadData}
                onEditMatch={(m) => {
                  setEditingMatch(m);
                  setActiveTab('ingestion');
                }}
                onStartTrainingOnMatch={handleStartTrainingOnMatch}
                onOpenCompare={handleOpenCompare}
              />
            )}

            {activeTab === 'ingestion' && (
              <MatchUploader
                editMatch={editingMatch}
                onMatchSaved={handleMatchSaved}
                onCancel={() => {
                  setEditingMatch(null);
                  setActiveTab('stack');
                }}
              />
            )}

            {activeTab === 'compare' && (
              <CompareView
                initialMatchA={compareMatchA || matches[0]}
                initialMatchB={compareMatchB || matches[1]}
                allMatches={matches}
                onBack={() => setActiveTab('stack')}
              />
            )}

            {activeTab === 'analytics' && (
              <CalibrationDashboard
                logs={logs}
                matches={matches}
                strategyConfig={strategyConfig}
                onClearLogs={loadData}
              />
            )}

            {activeTab === 'export' && (
              <DataExportHub onDataReloaded={loadData} />
            )}
          </>
        )}
      </main>

      {/* Barre de navigation inférieure sur MOBILE (Bottom Bar Android Native Feel) */}
      <nav
        className={`md:hidden fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-xl pb-safe transition-colors ${
          theme === 'dark'
            ? 'bg-[#07090e]/95 border-white/[0.08]'
            : 'bg-white/95 border-slate-200 shadow-lg'
        }`}
      >
        <div className="grid grid-cols-5 h-16 items-center px-1">
          <button
            onClick={() => {
              setTrainingTargetMatch(null);
              setActiveTab('training');
            }}
            className={`flex flex-col items-center justify-center gap-1 transition ${
              activeTab === 'training'
                ? 'text-blue-500 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className={`w-5 h-5 ${activeTab === 'training' ? 'fill-current' : ''}`} />
            <span className="text-[10px]">Entraîner</span>
          </button>

          <button
            onClick={() => setActiveTab('stack')}
            className={`flex flex-col items-center justify-center gap-1 transition ${
              activeTab === 'stack'
                ? 'text-blue-500 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-[10px]">Base ({matches.length})</span>
          </button>

          <button
            onClick={() => {
              setEditingMatch(null);
              setActiveTab('ingestion');
            }}
            className={`flex flex-col items-center justify-center gap-1 transition ${
              activeTab === 'ingestion'
                ? 'text-blue-500 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-5 h-5" />
            <span className="text-[10px]">+ Match</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex flex-col items-center justify-center gap-1 transition ${
              activeTab === 'analytics'
                ? 'text-blue-500 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px]">Stats</span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`flex flex-col items-center justify-center gap-1 transition ${
              activeTab === 'export'
                ? 'text-blue-500 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Archive className="w-5 h-5" />
            <span className="text-[10px]">Export</span>
          </button>
        </div>
      </nav>

      {/* Modal Connexion Téléphone Android & QR Code */}
      <MobileConnectModal
        isOpen={isMobileConnectOpen}
        onClose={() => setIsMobileConnectOpen(false)}
        networkIp={isLocalNetwork ? '192.168.1.68' : undefined}
      />

      {/* Modal Paramètres */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={strategyConfig}
        onConfigSaved={(cfg) => setStrategyConfig(cfg)}
        onDataReloaded={loadData}
      />
    </div>
  );
};

export default App;
