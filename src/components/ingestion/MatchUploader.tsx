import React, { useState, useRef } from 'react';
import { db } from '../../db/database';
import { MatchRecord, MatchSnapshot, Outcome, TimeSlotTag } from '../../types';
import { ImageCropperModal } from '../common/ImageCropperModal';
import {
  Upload,
  X,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  Plus,
  Tag,
  Crop,
  RotateCcw,
} from 'lucide-react';

interface MatchUploaderProps {
  onMatchSaved: (match: MatchRecord) => void;
  onCancel?: () => void;
  editMatch?: MatchRecord | null;
}

interface DraftSlot {
  id: string;
  file?: File;
  previewUrl: string;
  blob?: Blob;
  originalBlob?: Blob; // Toujours conservé pour pouvoir rétablir la forme complète
  mimeType: string;
  timeTag: TimeSlotTag;
  exactMinute?: number;
  pairOdds?: string;
  impairOdds?: string;
  isCropped?: boolean;
}

const DEFAULT_SLOT_TAGS: TimeSlotTag[] = ["1'", "2'", "22'", "23'"];
const COMMON_TAGS = ['chute-22', 'stabilisation-23', '0-0-ht', 'pression-pair', 'flux-impair', 'rythme-eleve', 'reversal-23'];

export const MatchUploader: React.FC<MatchUploaderProps> = ({
  onMatchSaved,
  onCancel,
  editMatch,
}) => {
  const [label, setLabel] = useState(editMatch?.label || '');
  const [actualOutcome, setActualOutcome] = useState<Outcome>(editMatch?.actualOutcome || 'PAIR');
  const [referenceOdds, setReferenceOdds] = useState(editMatch?.referenceOdds ? String(editMatch.referenceOdds) : '1.85');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(editMatch?.tags || ['chute-22']);
  const [notes, setNotes] = useState(editMatch?.notes || '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Index du slot en cours de rognage
  const [cropperSlotIndex, setCropperSlotIndex] = useState<number | null>(null);

  // Initialisation des slots
  const [slots, setSlots] = useState<DraftSlot[]>(() => {
    if (editMatch && editMatch.snapshots.length > 0) {
      return editMatch.snapshots.map((snap) => ({
        id: snap.id,
        previewUrl: URL.createObjectURL(snap.imageBlob),
        blob: snap.imageBlob,
        originalBlob: snap.imageBlob,
        mimeType: snap.mimeType,
        timeTag: snap.timeTag,
        exactMinute: snap.exactMinute,
        pairOdds: snap.oddsSnapshot?.pair ? String(snap.oddsSnapshot.pair) : '',
        impairOdds: snap.oddsSnapshot?.impair ? String(snap.oddsSnapshot.impair) : '',
        isCropped: false,
      }));
    }
    return [];
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gestion du chargement multiple simultané (1 à 4 photos en un seul geste)
  const handleFiles = (fileList: FileList | File[]) => {
    setErrorMessage(null);
    const filesArray = Array.from(fileList).filter((f) => f.type.startsWith('image/'));

    if (filesArray.length === 0) {
      setErrorMessage("Veuillez sélectionner des images valides (PNG, JPG, WebP).");
      return;
    }

    const availableSlots = 4 - slots.length;
    if (availableSlots <= 0) {
      setErrorMessage("La limite stricte est de 4 captures par match (repères 1', 2', 22', 23').");
      return;
    }

    const filesToAdd = filesArray.slice(0, availableSlots);
    const newSlots: DraftSlot[] = filesToAdd.map((file, idx) => {
      const currentCount = slots.length + idx;
      const defaultTag = DEFAULT_SLOT_TAGS[currentCount] || "CUSTOM";
      const exactMin = defaultTag === "1'" ? 1 : defaultTag === "2'" ? 2 : defaultTag === "22'" ? 22 : defaultTag === "23'" ? 23 : undefined;

      return {
        id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        blob: file,
        originalBlob: file, // Copie originale préservée
        mimeType: file.type || 'image/png',
        timeTag: defaultTag,
        exactMinute: exactMin,
        pairOdds: '',
        impairOdds: '',
        isCropped: false,
      };
    });

    setSlots((prev) => [...prev, ...newSlots]);
  };

  const removeSlot = (index: number) => {
    setSlots((prev) => {
      const removed = prev[index];
      if (removed.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const moveSlot = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === slots.length - 1)
    ) {
      return;
    }
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    setSlots((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const updateSlotTag = (index: number, newTag: TimeSlotTag) => {
    setSlots((prev) => {
      const copy = [...prev];
      let exactMin = copy[index].exactMinute;
      if (newTag === "1'") exactMin = 1;
      else if (newTag === "2'") exactMin = 2;
      else if (newTag === "22'") exactMin = 22;
      else if (newTag === "23'") exactMin = 23;

      copy[index] = { ...copy[index], timeTag: newTag, exactMinute: exactMin };
      return copy;
    });
  };

  const updateSlotOdds = (index: number, field: 'pair' | 'impair', val: string) => {
    setSlots((prev) => {
      const copy = [...prev];
      if (field === 'pair') copy[index].pairOdds = val;
      else copy[index].impairOdds = val;
      return copy;
    });
  };

  // Rognage validé
  const handleCropComplete = (croppedBlob: Blob) => {
    if (cropperSlotIndex === null) return;
    setSlots((prev) => {
      const copy = [...prev];
      const slot = copy[cropperSlotIndex];
      if (slot.previewUrl) URL.revokeObjectURL(slot.previewUrl);
      copy[cropperSlotIndex] = {
        ...slot,
        blob: croppedBlob,
        previewUrl: URL.createObjectURL(croppedBlob),
        isCropped: true,
      };
      return copy;
    });
    setCropperSlotIndex(null);
  };

  // Rétablir la forme complète originale en 1 clic
  const handleResetToOriginal = (index: number) => {
    setSlots((prev) => {
      const copy = [...prev];
      const slot = copy[index];
      if (!slot.originalBlob) return prev;
      if (slot.previewUrl) URL.revokeObjectURL(slot.previewUrl);
      copy[index] = {
        ...slot,
        blob: slot.originalBlob,
        previewUrl: URL.createObjectURL(slot.originalBlob),
        isCropped: false,
      };
      return copy;
    });
  };

  const addTag = (t: string) => {
    const trimmed = t.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput('');
  };

  const removeTag = (t: string) => {
    setTags(tags.filter((item) => item !== t));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (slots.length === 0) {
      setErrorMessage("Veuillez ajouter au moins une capture d'écran (1 à 4 max).");
      return;
    }

    const parsedOdds = parseFloat(referenceOdds);
    if (isNaN(parsedOdds) || parsedOdds < 1.01) {
      setErrorMessage("Veuillez saisir une cote de référence valide (ex: 1.85).");
      return;
    }

    setIsSubmitting(true);
    try {
      const finalSnapshots: MatchSnapshot[] = slots.map((s, idx) => ({
        id: s.id,
        slotIndex: idx,
        timeTag: s.timeTag,
        exactMinute: s.exactMinute,
        imageBlob: s.blob || new Blob([], { type: s.mimeType }),
        mimeType: s.mimeType,
        oddsSnapshot: {
          pair: s.pairOdds ? parseFloat(s.pairOdds) : undefined,
          impair: s.impairOdds ? parseFloat(s.impairOdds) : undefined,
        },
      }));

      const record: MatchRecord = {
        id: editMatch?.id || `match-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        createdAt: editMatch?.createdAt || Date.now(),
        updatedAt: Date.now(),
        label: label.trim() || `Match #${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
        actualOutcome,
        referenceOdds: parsedOdds,
        tags,
        notes: notes.trim(),
        snapshots: finalSnapshots,
        stats: editMatch?.stats || {
          attempts: 0,
          correctPredictions: 0,
        },
      };

      await db.matches.put(record);
      onMatchSaved(record);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Erreur lors de l'enregistrement : ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-[#0e131f] dark:bg-[#0e131f] light:bg-white border border-white/10 dark:border-white/10 light:border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xl">
      <div className="flex items-center justify-between pb-4 border-b border-white/10 dark:border-white/10 light:border-slate-200">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-100 dark:text-white light:text-slate-900 flex items-center gap-2">
            <span className="p-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-2xl">
              <Upload className="w-4 h-4" />
            </span>
            {editMatch ? 'Modifier la Fiche Match' : 'Ingestion de Matchs — Multi-Photos & Rognage'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Sélectionnez jusqu'à 4 photos à la fois, rognez la zone des cotes ou restaurez la forme complète à volonté.
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="mt-4 p-3 bg-red-900/30 border border-red-500/40 rounded-2xl text-red-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        {/* Ligne 1 : Nom & Issue */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 dark:text-slate-300 light:text-slate-700 mb-1">
              Nom / Contexte du Match
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ex: Chelsea vs Everton — Premier League"
              className="w-full bg-black/40 dark:bg-black/40 light:bg-slate-50 border border-white/10 dark:border-white/10 light:border-slate-300 rounded-2xl px-3.5 py-2.5 text-slate-100 dark:text-white light:text-slate-900 focus:outline-none focus:border-blue-500 text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 dark:text-slate-300 light:text-slate-700 mb-1">
              Issue Réelle (Vérité Terrain) *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActualOutcome('PAIR')}
                className={`py-2.5 px-3 rounded-2xl font-bold text-xs transition border ${
                  actualOutcome === 'PAIR'
                    ? 'bg-blue-600 text-white border-blue-400 shadow-md'
                    : 'bg-black/30 dark:bg-black/30 light:bg-slate-100 text-slate-400 border-white/10'
                }`}
              >
                PAIR
              </button>
              <button
                type="button"
                onClick={() => setActualOutcome('IMPAIR')}
                className={`py-2.5 px-3 rounded-2xl font-bold text-xs transition border ${
                  actualOutcome === 'IMPAIR'
                    ? 'bg-pink-600 text-white border-pink-400 shadow-md'
                    : 'bg-black/30 dark:bg-black/30 light:bg-slate-100 text-slate-400 border-white/10'
                }`}
              >
                IMPAIR
              </button>
            </div>
          </div>
        </div>

        {/* Section Médias : Multi-Upload & Grille 4 Slots */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 dark:text-slate-300 light:text-slate-700">
              Captures d'écran ({slots.length}/4) — Multi-sélection supportée
            </label>
            <span className="text-[11px] text-slate-400">
              Sélectionnez 1 à 4 fichiers à la fois
            </span>
          </div>

          {slots.length < 4 && (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
              }}
              className="border-2 border-dashed border-white/15 dark:border-white/15 light:border-slate-300 hover:border-blue-500 rounded-2xl p-5 text-center cursor-pointer bg-black/20 dark:bg-black/20 light:bg-slate-50 transition group"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
                className="hidden"
              />
              <Upload className="w-8 h-8 mx-auto text-blue-400 transition mb-1.5" />
              <p className="text-xs sm:text-sm font-semibold text-slate-200 dark:text-white light:text-slate-900">
                Glissez-déposez ou cliquez pour ajouter plusieurs images en une fois
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Assignation automatique aux repères 1', 2', 22', 23'
              </p>
            </div>
          )}

          {/* Slots et Outils de Rognage / Ré-élargissement */}
          {slots.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
              {slots.map((slot, index) => (
                <div
                  key={slot.id}
                  className="bg-black/40 dark:bg-black/40 light:bg-slate-50 border border-white/10 dark:border-white/10 light:border-slate-200 rounded-2xl p-2.5 relative flex flex-col justify-between group shadow"
                >
                  {/* Image Preview & Boutons Rognage / Pleine forme */}
                  <div>
                    <div className="relative aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center">
                      <img
                        src={slot.previewUrl}
                        alt={`Slot ${index + 1}`}
                        className="w-full h-full object-contain"
                      />

                      <div className="absolute top-1 left-1 bg-black/80 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold text-cyan-400">
                        Slot #{index + 1}
                      </div>

                      {/* Badge Rogné */}
                      {slot.isCropped && (
                        <div className="absolute bottom-1 left-1 bg-blue-600/90 text-white px-1.5 py-0.5 rounded text-[9px] font-bold">
                          Rogné
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => removeSlot(index)}
                        className="absolute top-1 right-1 p-1 bg-red-600/80 hover:bg-red-600 text-white rounded-full transition"
                        title="Supprimer ce slot"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Boutons Rognage / Rétablir forme complète */}
                    <div className="flex items-center gap-1 mt-2">
                      <button
                        type="button"
                        onClick={() => setCropperSlotIndex(index)}
                        className="flex-1 py-1 px-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-[11px] font-bold transition flex items-center justify-center gap-1 border border-blue-500/30"
                        title="Rogner cette capture"
                      >
                        <Crop className="w-3 h-3" />
                        <span>Rogner</span>
                      </button>

                      {slot.isCropped && (
                        <button
                          type="button"
                          onClick={() => handleResetToOriginal(index)}
                          className="py-1 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-[11px] font-bold transition flex items-center gap-1 border border-white/10"
                          title="Rétablir la photo complète originale"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span className="hidden sm:inline">Original</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions & Repères */}
                  <div className="mt-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveSlot(index, 'up')}
                          disabled={index === 0}
                          className="p-1 rounded-lg bg-black/40 border border-white/10 text-slate-400 hover:text-white disabled:opacity-30"
                        >
                          <ArrowUp className="w-3 h-3 rotate-[-90deg]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSlot(index, 'down')}
                          disabled={index === slots.length - 1}
                          className="p-1 rounded-lg bg-black/40 border border-white/10 text-slate-400 hover:text-white disabled:opacity-30"
                        >
                          <ArrowDown className="w-3 h-3 rotate-[-90deg]" />
                        </button>
                      </div>

                      <select
                        value={slot.timeTag}
                        onChange={(e) => updateSlotTag(index, e.target.value as TimeSlotTag)}
                        className="bg-black/40 border border-white/15 text-blue-400 font-bold text-xs rounded-xl px-2 py-1 focus:outline-none"
                      >
                        <option value="1'">Minute ~1'</option>
                        <option value="2'">Minute ~2'</option>
                        <option value="22'">Minute ~22'</option>
                        <option value="23'">Minute ~23'</option>
                        <option value="CUSTOM">Autre</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <div>
                        <span className="text-slate-400 block">Cote Pair</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="ex: 1.85"
                          value={slot.pairOdds || ''}
                          onChange={(e) => updateSlotOdds(index, 'pair', e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-1.5 py-1 text-slate-100 font-mono text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400 block">Cote Impair</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="ex: 1.95"
                          value={slot.impairOdds || ''}
                          onChange={(e) => updateSlotOdds(index, 'impair', e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-1.5 py-1 text-slate-100 font-mono text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cote référence & Tags */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 dark:text-slate-300 light:text-slate-700 mb-1">
              Cote Référence
            </label>
            <input
              type="number"
              step="0.01"
              value={referenceOdds}
              onChange={(e) => setReferenceOdds(e.target.value)}
              placeholder="1.85"
              className="w-full bg-black/40 dark:bg-black/40 light:bg-slate-50 border border-white/10 dark:border-white/10 light:border-slate-300 rounded-2xl px-3.5 py-2 text-slate-100 dark:text-white light:text-slate-900 font-mono text-sm focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 dark:text-slate-300 light:text-slate-700 mb-1">
              Tags de Pattern
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag(tagInput);
                  }
                }}
                placeholder="Ajouter tag (ex: chute-22) et presser Entrée"
                className="flex-1 bg-black/40 dark:bg-black/40 light:bg-slate-50 border border-white/10 dark:border-white/10 light:border-slate-300 rounded-2xl px-3.5 py-2 text-slate-100 dark:text-white light:text-slate-900 text-xs sm:text-sm focus:outline-none"
              />
              <button
                type="button"
                onClick={() => addTag(tagInput)}
                className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl font-medium transition"
              >
                Ajouter
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-blue-600/15 border border-blue-500/30 text-blue-400"
                >
                  <Tag className="w-3 h-3" />
                  {t}
                  <button type="button" onClick={() => removeTag(t)} className="hover:text-red-400 ml-1">
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 dark:text-slate-300 light:text-slate-700 mb-1">
            Notes d'Analyse du Pattern
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex : Chute brutale de la cote Pair dès la 22ème minute. Pression confirmée."
            className="w-full bg-black/40 dark:bg-black/40 light:bg-slate-50 border border-white/10 dark:border-white/10 light:border-slate-300 rounded-2xl p-3 text-slate-100 dark:text-white light:text-slate-900 text-xs sm:text-sm focus:outline-none"
          />
        </div>

        {/* Validation */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10 dark:border-white/10 light:border-slate-200">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
            >
              Annuler
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || slots.length === 0}
            className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-glow-blue transition flex items-center gap-2 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSubmitting ? 'Enregistrement...' : editMatch ? 'Mettre à jour' : 'Valider & Enregistrer'}
          </button>
        </div>
      </form>

      {/* Modal de Rognage / Ajustement */}
      {cropperSlotIndex !== null && slots[cropperSlotIndex] && (
        <ImageCropperModal
          isOpen={true}
          imageBlob={slots[cropperSlotIndex].originalBlob || slots[cropperSlotIndex].blob!}
          onCropComplete={handleCropComplete}
          onClose={() => setCropperSlotIndex(null)}
        />
      )}
    </div>
  );
};
