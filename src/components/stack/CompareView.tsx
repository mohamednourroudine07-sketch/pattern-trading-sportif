import React, { useState, useEffect } from 'react';
import { MatchRecord, TimeSlotTag } from '../../types';
import { ArrowLeft, ArrowRightLeft, Lock, Unlock, ZoomIn, ZoomOut } from 'lucide-react';

interface CompareViewProps {
  initialMatchA: MatchRecord;
  initialMatchB?: MatchRecord;
  allMatches: MatchRecord[];
  onBack: () => void;
}

const TIME_TAGS: TimeSlotTag[] = ["1'", "2'", "22'", "23'"];

export const CompareView: React.FC<CompareViewProps> = ({
  initialMatchA,
  initialMatchB,
  allMatches,
  onBack,
}) => {
  const [matchAId, setMatchAId] = useState(initialMatchA.id);
  const [matchBId, setMatchBId] = useState<string>(
    initialMatchB?.id ||
      allMatches.find((m) => m.id !== initialMatchA.id && m.actualOutcome !== initialMatchA.actualOutcome)?.id ||
      allMatches.find((m) => m.id !== initialMatchA.id)?.id ||
      initialMatchA.id
  );

  const matchA = allMatches.find((m) => m.id === matchAId) || initialMatchA;
  const matchB = allMatches.find((m) => m.id === matchBId) || initialMatchB || initialMatchA;

  const [slotIndexA, setSlotIndexA] = useState(0);
  const [slotIndexB, setSlotIndexB] = useState(0);
  const [isSynced, setIsSynced] = useState(true);

  const [urlA, setUrlA] = useState<string | null>(null);
  const [urlB, setUrlB] = useState<string | null>(null);

  const [zoomA, setZoomA] = useState(1);
  const [zoomB, setZoomB] = useState(1);

  useEffect(() => {
    const snap = matchA.snapshots[slotIndexA];
    if (snap && snap.imageBlob) {
      const objUrl = URL.createObjectURL(snap.imageBlob);
      setUrlA(objUrl);
      return () => URL.revokeObjectURL(objUrl);
    } else {
      setUrlA(null);
    }
  }, [matchA, slotIndexA]);

  useEffect(() => {
    const snap = matchB.snapshots[slotIndexB];
    if (snap && snap.imageBlob) {
      const objUrl = URL.createObjectURL(snap.imageBlob);
      setUrlB(objUrl);
      return () => URL.revokeObjectURL(objUrl);
    } else {
      setUrlB(null);
    }
  }, [matchB, slotIndexB]);

  const setSlotA = (idx: number) => {
    setSlotIndexA(idx);
    if (isSynced && idx < matchB.snapshots.length) {
      setSlotIndexB(idx);
    }
  };

  const setSlotB = (idx: number) => {
    setSlotIndexB(idx);
    if (isSynced && idx < matchA.snapshots.length) {
      setSlotIndexA(idx);
    }
  };

  const setCommonTimeTag = (tag: TimeSlotTag) => {
    const idxA = matchA.snapshots.findIndex((s) => s.timeTag === tag);
    const idxB = matchB.snapshots.findIndex((s) => s.timeTag === tag);
    if (idxA !== -1) setSlotIndexA(idxA);
    if (idxB !== -1) setSlotIndexB(idxB);
  };

  return (
    <div className="space-y-4">
      {/* Header Comparatif — Pur & Élégant */}
      <div className="bg-[#0e131f] dark:bg-[#0e131f] light:bg-white border border-white/10 dark:border-white/10 light:border-slate-200 rounded-3xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-2xl bg-black/40 dark:bg-black/40 light:bg-slate-100 border border-white/10 dark:border-white/10 light:border-slate-200 text-slate-300 dark:text-slate-300 light:text-slate-700 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Retour</span>
          </button>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-100 dark:text-white light:text-slate-900 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-blue-400" />
              Revue Comparative Côte à Côte
            </h2>
            <p className="text-[11px] text-slate-400">
              Discrimination visuelle des variations entre Pair et Impair
            </p>
          </div>
        </div>

        {/* Contrôles de synchronisation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSynced(!isSynced)}
            className={`px-3 py-1.5 rounded-2xl border text-xs font-bold transition flex items-center gap-1.5 ${
              isSynced
                ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                : 'bg-black/30 border-white/10 text-slate-400'
            }`}
          >
            {isSynced ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isSynced ? 'Synchro Active' : 'Indépendant'}</span>
          </button>

          <div className="inline-flex rounded-2xl bg-black/40 dark:bg-black/40 light:bg-slate-100 border border-white/10 dark:border-white/10 light:border-slate-200 p-0.5 text-xs">
            {TIME_TAGS.map((t) => (
              <button
                key={t}
                onClick={() => setCommonTimeTag(t)}
                className="px-2.5 py-1 text-slate-300 dark:text-slate-300 light:text-slate-700 hover:text-white font-mono font-bold hover:bg-white/10 rounded-xl"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grille Scindée : 1 colonne sur smartphone, 2 colonnes sur écran PC */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Match A */}
        <div className="bg-[#0e131f] dark:bg-[#0e131f] light:bg-white border border-white/10 dark:border-white/10 light:border-slate-200 rounded-3xl p-4 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Échantillon A
                </span>
                <select
                  value={matchAId}
                  onChange={(e) => {
                    setMatchAId(e.target.value);
                    setSlotIndexA(0);
                  }}
                  className="w-full bg-black/40 dark:bg-black/40 light:bg-slate-50 border border-white/10 dark:border-white/10 light:border-slate-300 rounded-2xl px-3 py-1.5 text-xs text-slate-100 dark:text-white light:text-slate-900 font-semibold focus:outline-none"
                >
                  {allMatches.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.actualOutcome}] {m.label || m.id} (@{m.referenceOdds?.toFixed(2) || '?'})
                    </option>
                  ))}
                </select>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase mt-4 ${
                  matchA.actualOutcome === 'PAIR'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-pink-600 text-white shadow-md'
                }`}
              >
                {matchA.actualOutcome}
              </span>
            </div>

            {/* Slots Match A */}
            <div className="flex items-center gap-1.5 mb-3 bg-black/40 dark:bg-black/40 light:bg-slate-100 p-1 rounded-2xl border border-white/5">
              {matchA.snapshots.map((snap, idx) => (
                <button
                  key={snap.id}
                  onClick={() => setSlotA(idx)}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-mono font-bold transition ${
                    slotIndexA === idx
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {snap.timeTag}
                </button>
              ))}
            </div>

            {/* Viewer Image Match A */}
            <div className="relative aspect-[16/10] bg-black rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center">
              {urlA ? (
                <div
                  className="w-full h-full flex items-center justify-center overflow-auto"
                  style={{ transform: `scale(${zoomA})` }}
                >
                  <img
                    src={urlA}
                    alt="Snapshot A"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <div className="text-slate-600 text-xs">Aucune capture</div>
              )}

              <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur p-1 rounded-xl border border-white/10 text-xs">
                <button
                  onClick={() => setZoomA(Math.max(1, zoomA - 0.25))}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[10px] px-1 text-slate-300">{Math.round(zoomA * 100)}%</span>
                <button
                  onClick={() => setZoomA(Math.min(2.5, zoomA + 0.25))}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="absolute top-2 left-2 bg-black/80 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold text-cyan-400">
                Minute {matchA.snapshots[slotIndexA]?.timeTag || '?'}
              </div>
            </div>

            {/* Notes A */}
            <div className="mt-3 text-xs bg-black/30 dark:bg-black/30 light:bg-slate-50 p-2.5 rounded-2xl border border-white/5 dark:border-white/5 light:border-slate-200">
              {matchA.notes && <p className="text-slate-300 dark:text-slate-300 light:text-slate-700 italic">"{matchA.notes}"</p>}
            </div>
          </div>
        </div>

        {/* Match B */}
        <div className="bg-[#0e131f] dark:bg-[#0e131f] light:bg-white border border-white/10 dark:border-white/10 light:border-slate-200 rounded-3xl p-4 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Échantillon B
                </span>
                <select
                  value={matchBId}
                  onChange={(e) => {
                    setMatchBId(e.target.value);
                    setSlotIndexB(0);
                  }}
                  className="w-full bg-black/40 dark:bg-black/40 light:bg-slate-50 border border-white/10 dark:border-white/10 light:border-slate-300 rounded-2xl px-3 py-1.5 text-xs text-slate-100 dark:text-white light:text-slate-900 font-semibold focus:outline-none"
                >
                  {allMatches.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.actualOutcome}] {m.label || m.id} (@{m.referenceOdds?.toFixed(2) || '?'})
                    </option>
                  ))}
                </select>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase mt-4 ${
                  matchB.actualOutcome === 'PAIR'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-pink-600 text-white shadow-md'
                }`}
              >
                {matchB.actualOutcome}
              </span>
            </div>

            {/* Slots Match B */}
            <div className="flex items-center gap-1.5 mb-3 bg-black/40 dark:bg-black/40 light:bg-slate-100 p-1 rounded-2xl border border-white/5">
              {matchB.snapshots.map((snap, idx) => (
                <button
                  key={snap.id}
                  onClick={() => setSlotB(idx)}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-mono font-bold transition ${
                    slotIndexB === idx
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {snap.timeTag}
                </button>
              ))}
            </div>

            {/* Viewer Image Match B */}
            <div className="relative aspect-[16/10] bg-black rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center">
              {urlB ? (
                <div
                  className="w-full h-full flex items-center justify-center overflow-auto"
                  style={{ transform: `scale(${zoomB})` }}
                >
                  <img
                    src={urlB}
                    alt="Snapshot B"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <div className="text-slate-600 text-xs">Aucune capture</div>
              )}

              <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur p-1 rounded-xl border border-white/10 text-xs">
                <button
                  onClick={() => setZoomB(Math.max(1, zoomB - 0.25))}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[10px] px-1 text-slate-300">{Math.round(zoomB * 100)}%</span>
                <button
                  onClick={() => setZoomB(Math.min(2.5, zoomB + 0.25))}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="absolute top-2 left-2 bg-black/80 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold text-cyan-400">
                Minute {matchB.snapshots[slotIndexB]?.timeTag || '?'}
              </div>
            </div>

            {/* Notes B */}
            <div className="mt-3 text-xs bg-black/30 dark:bg-black/30 light:bg-slate-50 p-2.5 rounded-2xl border border-white/5 dark:border-white/5 light:border-slate-200">
              {matchB.notes && <p className="text-slate-300 dark:text-slate-300 light:text-slate-700 italic">"{matchB.notes}"</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
