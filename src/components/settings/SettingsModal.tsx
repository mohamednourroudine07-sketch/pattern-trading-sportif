import React, { useState, useRef } from 'react';
import { StrategyConfig } from '../../types';
import { db } from '../../db/database';
import { BackupService } from '../../db/backupService';
import { seedDemoData } from '../../db/seedData';
import {
  Settings,
  X,
  Save,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  CheckCircle,
  AlertCircle,
  Database,
  Sliders,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: StrategyConfig;
  onConfigSaved: (config: StrategyConfig) => void;
  onDataReloaded: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onConfigSaved,
  onDataReloaded,
}) => {
  const [formData, setFormData] = useState<StrategyConfig>({ ...config });
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const importInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await db.saveStrategyConfig(formData);
      onConfigSaved(formData);
      setNotification({ type: 'success', message: 'Paramètres enregistrés avec succès.' });
      setTimeout(() => {
        setNotification(null);
        onClose();
      }, 1000);
    } catch (err: any) {
      setNotification({ type: 'error', message: `Erreur : ${err.message}` });
    }
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      await BackupService.downloadBackup();
      setNotification({ type: 'success', message: 'Archive ZIP de sauvegarde téléchargée.' });
    } catch (err: any) {
      setNotification({ type: 'error', message: `Erreur d'export : ${err.message}` });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const res = await BackupService.importFromZip(file);
      setNotification({
        type: 'success',
        message: `Importation réussie : ${res.matchesCount} matchs et ${res.logsCount} logs restaurés.`,
      });
      onDataReloaded();
    } catch (err: any) {
      setNotification({ type: 'error', message: `Erreur d'import : ${err.message}` });
    } finally {
      setIsImporting(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const handleLoadDemo = async () => {
    if (window.confirm("Générer les 5 fiches de matchs de démonstration réalistes avec captures Bet360 ?")) {
      try {
        await seedDemoData();
        setNotification({ type: 'success', message: "Données de démonstration chargées !" });
        onDataReloaded();
      } catch (err: any) {
        setNotification({ type: 'error', message: `Erreur : ${err.message}` });
      }
    }
  };

  const handleClearAll = async () => {
    if (window.confirm("ATTENTION : Supprimer TOUTES les fiches de match, images et historiques ? Cette action est irréversible.")) {
      try {
        await BackupService.clearAllData();
        setNotification({ type: 'success', message: 'Base de données réinitialisée à zéro.' });
        onDataReloaded();
      } catch (err: any) {
        setNotification({ type: 'error', message: `Erreur : ${err.message}` });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 max-w-2xl w-full rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Settings className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                Paramètres de Stratégie & Sauvegardes
              </h2>
              <p className="text-xs text-slate-400">
                Configuration de bankroll, seuils de discipline et portabilité Local-First
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {notification && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
              notification.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                : 'bg-red-950/60 border border-red-500/40 text-red-300'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          {/* Section 1 : Bankroll & Mise */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              1. Gestion de Bankroll & Dimensionnement de Mise
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Bankroll Initiale (unités)
                </label>
                <input
                  type="number"
                  step="1"
                  value={formData.initialBankrollUnits}
                  onChange={(e) =>
                    setFormData({ ...formData, initialBankrollUnits: parseFloat(e.target.value) || 100 })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 text-sm font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Bankroll Actuelle (unités)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.currentBankrollUnits}
                  onChange={(e) =>
                    setFormData({ ...formData, currentBankrollUnits: parseFloat(e.target.value) || 100 })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 text-sm font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Mise Standard (% de bankroll)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.standardStakePct}
                  onChange={(e) =>
                    setFormData({ ...formData, standardStakePct: parseFloat(e.target.value) || 1.5 })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 text-sm font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Plafond Strict de Mise (% de bankroll)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.maxStakeCapPct}
                  onChange={(e) =>
                    setFormData({ ...formData, maxStakeCapPct: parseFloat(e.target.value) || 3.0 })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 text-sm font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2 : Seuils Stratégiques Stricts */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              2. Seuils Stricts de Discipline de Trading
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Seuil Cote Min. ($C \ge$)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={formData.minOddsThreshold}
                  onChange={(e) =>
                    setFormData({ ...formData, minOddsThreshold: parseFloat(e.target.value) || 1.60 })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 text-sm font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Seuil Confiance Min. ($p &gt;$)
                </label>
                <input
                  type="number"
                  step="1"
                  value={formData.minConfidenceThreshold}
                  onChange={(e) =>
                    setFormData({ ...formData, minConfidenceThreshold: parseFloat(e.target.value) || 65 })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 text-sm font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Fraction de Kelly
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={formData.kellyFraction}
                  onChange={(e) =>
                    setFormData({ ...formData, kellyFraction: parseFloat(e.target.value) || 0.25 })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 text-sm font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Sauvegarder la Stratégie
            </button>
          </div>
        </form>

        {/* Section 3 : Sauvegarde & Portabilité (ZIP) */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            3. Sauvegarde Locale & Portabilité (Local-First ZIP)
          </h3>
          <p className="text-xs text-slate-400">
            Exportez l'ensemble de vos captures haute résolution et de vos fiches dans une archive ZIP portable, ou restaurez-la sur n'importe quel poste sans serveur.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExportBackup}
              disabled={isExporting}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              {isExporting ? 'Exportation en cours...' : 'Télécharger l\'archive .ZIP'}
            </button>

            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              disabled={isImporting}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-2"
            >
              <Upload className="w-4 h-4 text-indigo-400" />
              {isImporting ? 'Importation...' : 'Restaurer une archive .ZIP'}
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".zip"
              onChange={handleImportFile}
              className="hidden"
            />

            <button
              type="button"
              onClick={handleLoadDemo}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4 text-amber-400" />
              Générer Jeu Démo Bet360
            </button>

            <button
              type="button"
              onClick={handleClearAll}
              className="px-4 py-2 rounded-lg bg-red-950/40 hover:bg-red-950 text-red-300 border border-red-800/40 text-xs font-bold transition flex items-center gap-2 ml-auto"
            >
              <Trash2 className="w-4 h-4" />
              Purger la Base
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
