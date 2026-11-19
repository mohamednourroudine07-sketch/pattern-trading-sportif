import React, { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { liveQuery } from 'dexie';
import { AlertTriangle, Cloud, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import { CloudSyncService } from '../../services/cloudSyncService';
import { supabaseClient, supabaseConfigurationIssue } from '../../services/supabaseClient';

const AUTO_SAVE_DEBOUNCE_MS = 5000;

type AutoSyncStatus = 'idle' | 'needs-initial-sync' | 'pending' | 'saving' | 'saved' | 'error';

interface CloudSyncPanelProps {
  onDataReloaded: () => void;
}

export const CloudSyncPanel: React.FC<CloudSyncPanelProps> = ({ onDataReloaded }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [autoSyncStatus, setAutoSyncStatus] = useState<AutoSyncStatus>('idle');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const initialSyncCompleteRef = useRef(false);
  const syncInProgressRef = useRef(false);
  const autoSaveInProgressRef = useRef(false);
  const pendingChangesDuringSyncRef = useRef(false);
  const lastSavedSignatureRef = useRef<string | null>(null);
  const lastObservedSignatureRef = useRef<string | null>(null);
  const scheduleAutoSaveRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!supabaseClient) return;

    let isMounted = true;
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setFeedback(null);
    });

    void supabaseClient.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;
      if (error) {
        setFeedback({ type: 'error', message: `Erreur de connexion : ${error.message}` });
        return;
      }
      setSession(data.session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const client = supabaseClient;
    const userId = session?.user.id;
    if (!client || !userId) {
      initialSyncCompleteRef.current = false;
      lastSavedSignatureRef.current = null;
      lastObservedSignatureRef.current = null;
      scheduleAutoSaveRef.current = null;
      setAutoSyncStatus('idle');
      return;
    }

    initialSyncCompleteRef.current = false;
    pendingChangesDuringSyncRef.current = false;
    lastSavedSignatureRef.current = null;
    lastObservedSignatureRef.current = null;
    setAutoSyncStatus('needs-initial-sync');

    let isActive = true;
    let isFirstObservation = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const runAutoSave = async () => {
      if (!isActive || !initialSyncCompleteRef.current) return;
      if (syncInProgressRef.current) {
        pendingChangesDuringSyncRef.current = true;
        return;
      }
      if (autoSaveInProgressRef.current) return;

      autoSaveInProgressRef.current = true;
      setIsAutoSaving(true);
      setAutoSyncStatus('saving');
      try {
        const signature = await CloudSyncService.saveCurrentDeviceBackup(client, userId);
        lastSavedSignatureRef.current = signature;
        setAutoSyncStatus('saved');
        if (lastObservedSignatureRef.current !== signature) scheduleAutoSave();
      } catch (error) {
        setAutoSyncStatus('error');
        setFeedback({
          type: 'error',
          message: `Sauvegarde automatique impossible : ${error instanceof Error ? error.message : String(error)}`,
        });
      } finally {
        autoSaveInProgressRef.current = false;
        setIsAutoSaving(false);
      }
    };

    const scheduleAutoSave = () => {
      if (!isActive || !initialSyncCompleteRef.current) return;
      if (timer) clearTimeout(timer);
      setAutoSyncStatus('pending');
      timer = setTimeout(() => {
        timer = null;
        void runAutoSave();
      }, AUTO_SAVE_DEBOUNCE_MS);
    };

    scheduleAutoSaveRef.current = scheduleAutoSave;
    const subscription = liveQuery(() => CloudSyncService.getLocalDataSignature()).subscribe({
      next: (signature) => {
        if (!isActive) return;
        const previousSignature = lastObservedSignatureRef.current;
        lastObservedSignatureRef.current = signature;

        if (isFirstObservation) {
          isFirstObservation = false;
          if (syncInProgressRef.current) pendingChangesDuringSyncRef.current = true;
          if (initialSyncCompleteRef.current && signature !== lastSavedSignatureRef.current) {
            scheduleAutoSave();
          }
          return;
        }
        if (signature === previousSignature) return;
        if (syncInProgressRef.current) {
          pendingChangesDuringSyncRef.current = true;
          return;
        }
        if (!initialSyncCompleteRef.current || signature === lastSavedSignatureRef.current) return;
        scheduleAutoSave();
      },
      error: (error) => {
        if (!isActive) return;
        setAutoSyncStatus('error');
        setFeedback({
          type: 'error',
          message: `Surveillance des modifications impossible : ${error instanceof Error ? error.message : String(error)}`,
        });
      },
    });

    const handleOnline = () => {
      if (lastObservedSignatureRef.current !== lastSavedSignatureRef.current) scheduleAutoSave();
    };
    window.addEventListener('online', handleOnline);

    return () => {
      isActive = false;
      if (timer) clearTimeout(timer);
      subscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
      if (scheduleAutoSaveRef.current === scheduleAutoSave) scheduleAutoSaveRef.current = null;
    };
  }, [session?.user.id]);

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabaseClient) return;

    setIsAuthenticating(true);
    setFeedback(null);
    try {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      setPassword('');
    } catch (error) {
      setFeedback({
        type: 'error',
        message: `Connexion impossible : ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignUp = async () => {
    if (!supabaseClient) return;
    if (!email.trim() || password.length < 6) {
      setFeedback({ type: 'error', message: 'Saisis une adresse e-mail et un mot de passe de 6 caractères minimum.' });
      return;
    }

    setIsAuthenticating(true);
    setFeedback(null);
    try {
      const emailRedirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).toString();
      const { data, error } = await supabaseClient.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo },
      });
      if (error) throw error;
      setPassword('');
      setFeedback({
        type: 'success',
        message: data.session
          ? 'Compte créé et connecté.'
          : 'Compte créé. Confirme ton adresse e-mail, puis connecte-toi ici.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: `Création du compte impossible : ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabaseClient) return;

    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      setFeedback({ type: 'error', message: `Déconnexion impossible : ${error.message}` });
    }
  };

  const handleSynchronize = async () => {
    if (!supabaseClient || !session || syncInProgressRef.current || autoSaveInProgressRef.current) return;

    syncInProgressRef.current = true;
    pendingChangesDuringSyncRef.current = false;
    setIsSyncing(true);
    setFeedback(null);
    let syncSucceeded = false;
    try {
      const result = await CloudSyncService.synchronize(supabaseClient, session.user.id);
      onDataReloaded();
      const currentSignature = await CloudSyncService.getLocalDataSignature();
      lastSavedSignatureRef.current = result.localDataSignature;
      lastObservedSignatureRef.current = currentSignature;
      pendingChangesDuringSyncRef.current = currentSignature !== result.localDataSignature;
      initialSyncCompleteRef.current = true;
      setAutoSyncStatus('saved');
      setFeedback({
        type: 'success',
        message: `Synchronisation terminée : ${result.matchesCount} fiches réunies depuis ${result.deviceCount} appareil(s).`,
      });
      syncSucceeded = true;
    } catch (error) {
      setFeedback({
        type: 'error',
        message: `Synchronisation impossible : ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      syncInProgressRef.current = false;
      setIsSyncing(false);
      if (pendingChangesDuringSyncRef.current && initialSyncCompleteRef.current) {
        scheduleAutoSaveRef.current?.();
      }
      if (!syncSucceeded && !initialSyncCompleteRef.current) {
        setAutoSyncStatus('needs-initial-sync');
      }
    }
  };

  const autoSyncMessage = {
    idle: '',
    'needs-initial-sync': 'Synchronise une première fois pour fusionner les données de tes appareils et activer la sauvegarde automatique.',
    pending: 'Modification détectée : sauvegarde automatique dans quelques secondes…',
    saving: 'Sauvegarde automatique en cours…',
    saved: 'Sauvegarde automatique activée : tes modifications sont envoyées au cloud après 5 secondes sans changement.',
    error: 'La sauvegarde automatique a échoué. Vérifie ta connexion ; la prochaine modification ou reconnexion réessaiera.',
  }[autoSyncStatus];

  return (
    <section className="rounded-3xl border-2 border-cyan-500/30 bg-gradient-to-r from-cyan-950/30 via-[#0e131f] to-blue-950/30 p-5 shadow-xl sm:p-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-2.5 text-cyan-300">
          <Cloud className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-black text-white sm:text-lg">Synchronisation téléphone ⇆ PC</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Connecte-toi avec le même compte sur tes deux appareils, puis synchronise pour réunir les matchs et l’historique.
          </p>
        </div>
      </div>

      {!supabaseClient ? (
        <div role="status" className="mt-4 flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {supabaseConfigurationIssue === 'invalid-url'
              ? 'Le secret VITE_SUPABASE_URL est incorrect. Il doit contenir l’adresse complète du projet Supabase, par exemple https://identifiant.supabase.co.'
              : supabaseConfigurationIssue === 'missing-key'
                ? 'Le secret VITE_SUPABASE_ANON_KEY manque dans GitHub. Ajoute la clé publique anon/publishable du projet, jamais la clé service_role.'
                : 'La synchronisation cloud n’est pas encore configurée. Le propriétaire doit renseigner VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans les secrets GitHub puis relancer la publication.'}
          </span>
        </div>
      ) : session ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <span className="flex min-w-0 items-center gap-2 text-xs text-emerald-200">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span className="truncate">Connecté : {session.user.email}</span>
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-white/5 hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" />
              Déconnexion
            </button>
          </div>

          <button
            type="button"
            onClick={handleSynchronize}
            disabled={isSyncing || isAutoSaving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-cyan-500 disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing || isAutoSaving ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Synchronisation...' : isAutoSaving ? 'Sauvegarde automatique...' : 'Synchroniser maintenant'}
          </button>
          <p
            role="status"
            aria-live="polite"
            className={`rounded-xl border p-3 text-[11px] leading-relaxed ${
              autoSyncStatus === 'error'
                ? 'border-red-500/30 bg-red-500/10 text-red-200'
                : autoSyncStatus === 'saved'
                  ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-200'
                  : 'border-cyan-500/20 bg-cyan-500/5 text-cyan-200'
            }`}
          >
            {autoSyncMessage}
            {autoSyncStatus === 'saved' && ' Pour récupérer les nouveautés des autres appareils, utilise « Synchroniser maintenant » dessus.'}
          </p>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Les sauvegardes sont privées au compte. La synchronisation fusionne les ajouts et modifications ; une fiche supprimée sur un appareil peut rester sur l’autre.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSignIn} className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Adresse e-mail"
            aria-label="Adresse e-mail du compte cloud"
            className="min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500"
          />
          <input
            type="password"
            autoComplete="current-password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mot de passe"
            aria-label="Mot de passe du compte cloud"
            className="min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={isAuthenticating}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-60"
          >
            Se connecter
          </button>
          <button
            type="button"
            onClick={handleSignUp}
            disabled={isAuthenticating}
            className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/5 disabled:opacity-60"
          >
            Créer un compte
          </button>
          <p className="text-[11px] text-slate-500 sm:col-span-4">
            Crée un compte avec la même adresse e-mail sur le téléphone et le PC. Si la confirmation par e-mail est activée, valide le message reçu avant de te connecter.
          </p>
        </form>
      )}

      {feedback && (
        <p
          role="status"
          className={`mt-3 rounded-xl border p-3 text-xs ${
            feedback.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
              : 'border-red-500/30 bg-red-500/10 text-red-200'
          }`}
        >
          {feedback.message}
        </p>
      )}
    </section>
  );
};
