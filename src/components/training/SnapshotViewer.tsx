import React, { useState, useEffect, useRef } from 'react';
import { MatchRecord } from '../../types';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Maximize2,
  Minimize2,
  Smartphone,
  Monitor,
} from 'lucide-react';

interface SnapshotViewerProps {
  match: MatchRecord;
  activeSlotIndex: number;
  onSlotChange: (index: number) => void;
}

export const SnapshotViewer: React.FC<SnapshotViewerProps> = ({
  match,
  activeSlotIndex,
  onSlotChange,
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Optimisation Photos Verticales (Smartphone)
  const [viewOrientation, setViewOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [detectedImageRatio, setDetectedImageRatio] = useState<'portrait' | 'landscape'>('portrait');

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (naturalWidth && naturalHeight) {
      const isVert = naturalHeight >= naturalWidth;
      setDetectedImageRatio(isVert ? 'portrait' : 'landscape');
      setViewOrientation(isVert ? 'portrait' : 'landscape');
    }
  };

  const [objectUrls, setObjectUrls] = useState<string[]>([]);

  useEffect(() => {
    const urls = match.snapshots.map((snap) => {
      if (snap.imageBlob && snap.imageBlob.size > 0) {
        return URL.createObjectURL(snap.imageBlob);
      }
      return '';
    });
    setObjectUrls(urls);
    setZoomLevel(1);
    setPan({ x: 0, y: 0 });

    return () => {
      urls.forEach((u) => {
        if (u) URL.revokeObjectURL(u);
      });
    };
  }, [match.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onSlotChange(Math.max(0, activeSlotIndex - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onSlotChange(Math.min(match.snapshots.length - 1, activeSlotIndex + 1));
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const slotIdx = parseInt(e.key, 10) - 1;
        if (slotIdx < match.snapshots.length) {
          e.preventDefault();
          onSlotChange(slotIdx);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSlotIndex, match.snapshots.length, onSlotChange, isFullscreen]);

  const activeSnapshot = match.snapshots[activeSlotIndex];
  const activeUrl = objectUrls[activeSlotIndex] || '';

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setPan({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetZoom = () => {
    setZoomLevel(1);
    setPan({ x: 0, y: 0 });
  };

  // Zoom avec la molette de la souris
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setZoomLevel((z) => Math.max(1, Math.min(4, z + delta)));
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div
      ref={containerRef}
      className={`transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-black flex flex-col'
          : 'bg-[#0e131f] dark:bg-[#0e131f] light:bg-white border border-white/10 dark:border-white/10 light:border-slate-200 rounded-3xl overflow-hidden shadow-xl flex flex-col'
      }`}
    >
      {/* Barre de navigation des repères temporels */}
      <div className="px-3 sm:px-4 py-2.5 bg-[#0a0e18]/90 dark:bg-[#0a0e18]/90 light:bg-slate-50 border-b border-white/10 dark:border-white/10 light:border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden sm:flex items-center gap-1 mr-1">
            <Eye className="w-3.5 h-3.5 text-blue-400" />
            Slots :
          </span>

          {/* Onglets 1', 2', 22', 23' */}
          <div className="inline-flex rounded-2xl bg-black/40 dark:bg-black/40 light:bg-slate-200/70 p-1 border border-white/5">
            {match.snapshots.map((snap, idx) => {
              const isActive = activeSlotIndex === idx;
              return (
                <button
                  key={snap.id}
                  onClick={() => onSlotChange(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1 touch-manipulation select-none ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md ring-1 ring-blue-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="opacity-60 text-[10px] hidden sm:inline">[{idx + 1}]</span>
                  <span>{snap.timeTag}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Contrôles Zoom & Plein Écran */}
        <div className="flex items-center gap-1 bg-black/40 dark:bg-black/40 light:bg-slate-100 rounded-2xl p-1 border border-white/5 text-xs">
          <button
            onClick={() => setZoomLevel((z) => Math.max(1, z - 0.25))}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            title="Zoom arrière"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-slate-300 dark:text-slate-300 light:text-slate-700 px-1 text-[11px] font-bold">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(4, z + 0.25))}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            title="Zoom avant"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {zoomLevel > 1 && (
            <button
              onClick={resetZoom}
              className="p-1.5 text-amber-400 hover:text-amber-300 rounded-lg transition"
              title="Réinitialiser zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Bascule Format Portrait / Paysage */}
          <button
            onClick={() => setViewOrientation((prev) => (prev === 'portrait' ? 'landscape' : 'portrait'))}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
              viewOrientation === 'portrait'
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
            title={viewOrientation === 'portrait' ? 'Format Vertical (Smartphone) Actif — Cliquez pour passer en paysage' : 'Format Paysage Actif — Cliquez pour passer en vertical'}
          >
            {viewOrientation === 'portrait' ? (
              <>
                <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[11px] font-mono">Vertical 9:16</span>
              </>
            ) : (
              <>
                <Monitor className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-mono">Paysage 16:9</span>
              </>
            )}
          </button>

          {/* Bouton Plein Écran */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-blue-400 hover:text-white rounded-lg transition ml-1"
            title={isFullscreen ? 'Quitter le Plein Écran [Echap]' : 'Afficher en Plein Écran'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Zone Image avec Zoom & Plein Écran */}
      <div
        onWheel={handleWheel}
        className={`relative bg-black overflow-hidden flex items-center justify-center select-none ${
          isFullscreen
            ? 'flex-1 h-full'
            : viewOrientation === 'portrait'
            ? 'h-[560px] sm:h-[640px] max-h-[78vh]'
            : 'aspect-[16/10] sm:aspect-[16/9] min-h-[360px]'
        } ${zoomLevel > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {activeUrl ? (
          <div
            className="w-full h-full flex items-center justify-center transition-transform duration-75"
            style={{
              transform: `scale(${zoomLevel}) translate(${pan.x / zoomLevel}px, ${pan.y / zoomLevel}px)`,
            }}
          >
            <img
              src={activeUrl}
              alt={`Capture ${activeSnapshot?.timeTag || activeSlotIndex + 1}`}
              onLoad={handleImageLoad}
              className="max-w-full max-h-full object-contain pointer-events-none drop-shadow-2xl"
            />
          </div>
        ) : (
          <div className="text-slate-600 font-mono text-xs">
            Aucune capture pour ce slot
          </div>
        )}

        {/* Flèches de navigation tactile */}
        <button
          onClick={() => onSlotChange(Math.max(0, activeSlotIndex - 1))}
          disabled={activeSlotIndex === 0}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white disabled:opacity-0 transition backdrop-blur-md border border-white/10"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={() => onSlotChange(Math.min(match.snapshots.length - 1, activeSlotIndex + 1))}
          disabled={activeSlotIndex === match.snapshots.length - 1}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white disabled:opacity-0 transition backdrop-blur-md border border-white/10"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Badge Flottant Info Minute */}
        <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-white font-mono font-bold text-xs">
            Minute {activeSnapshot?.timeTag || `Slot #${activeSlotIndex + 1}`}
          </span>
          {detectedImageRatio === 'portrait' && (
            <span className="text-cyan-300 font-mono text-[10px] border-l border-white/20 pl-2 flex items-center gap-1 font-bold">
              <Smartphone className="w-2.5 h-2.5" />
              Vertical
            </span>
          )}
          {activeSnapshot?.oddsSnapshot?.pair && (
            <span className="text-blue-400 font-mono text-xs border-l border-white/20 pl-2 font-bold">
              Pair @{activeSnapshot.oddsSnapshot.pair.toFixed(2)}
            </span>
          )}
          {activeSnapshot?.oddsSnapshot?.impair && (
            <span className="text-pink-400 font-mono text-xs border-l border-white/20 pl-2 font-bold">
              Impair @{activeSnapshot.oddsSnapshot.impair.toFixed(2)}
            </span>
          )}
        </div>

        {isFullscreen && (
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-3 right-3 bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/15 px-3 py-1 rounded-full text-xs text-white font-bold flex items-center gap-1.5"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Quitter Plein Écran</span>
          </button>
        )}
      </div>
    </div>
  );
};
