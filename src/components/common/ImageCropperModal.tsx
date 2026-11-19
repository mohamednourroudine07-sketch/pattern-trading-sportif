import React, { useState, useRef, useEffect } from 'react';
import { Crop, RotateCcw, Check, X, Maximize2, Move, Smartphone } from 'lucide-react';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageBlob: Blob;
  onCropComplete: (croppedBlob: Blob) => void;
  onClose: () => void;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  imageBlob,
  onCropComplete,
  onClose,
}) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Rectangle de rognage en pourcentage (0 à 1)
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'move' | 'nw' | 'ne' | 'se' | 'sw' | null>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; box: typeof cropBox }>({
    mouseX: 0,
    mouseY: 0,
    box: { x: 0, y: 0, width: 1, height: 1 },
  });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!imageBlob || imageBlob.size === 0) return;
    const url = URL.createObjectURL(imageBlob);
    setImageUrl(url);

    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
      // Rognage initial plein format
      setCropBox({ x: 0, y: 0, width: 1, height: 1 });
    };
    img.src = url;

    return () => URL.revokeObjectURL(url);
  }, [imageBlob]);

  if (!isOpen || !imageUrl) return null;

  const isPortrait = imageSize.height > imageSize.width;

  // Réinitialiser à la forme complète (100% de l'image)
  const handleResetToFull = () => {
    setCropBox({ x: 0, y: 0, width: 1, height: 1 });
  };

  // Préréglage rapide "Focus Cotes Bet360" (adapté vertical smartphone ou horizontal)
  const handlePresetOddsFocus = () => {
    if (isPortrait) {
      setCropBox({ x: 0.02, y: 0.28, width: 0.96, height: 0.48 });
    } else {
      setCropBox({ x: 0.05, y: 0.25, width: 0.9, height: 0.55 });
    }
  };

  // Préréglage rapide "Focus Score & Cotes (Vertical)"
  const handlePresetMobileHeaderAndOdds = () => {
    setCropBox({ x: 0.02, y: 0.12, width: 0.96, height: 0.65 });
  };

  // Début du drag
  const handleMouseDown = (e: React.MouseEvent, mode: 'move' | 'nw' | 'ne' | 'se' | 'sw') => {
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    setDragMode(mode);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      box: { ...cropBox },
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragMode || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = (e.clientX - dragStartRef.current.mouseX) / rect.width;
    const deltaY = (e.clientY - dragStartRef.current.mouseY) / rect.height;

    const prev = dragStartRef.current.box;
    let next = { ...prev };

    if (dragMode === 'move') {
      next.x = Math.max(0, Math.min(1 - prev.width, prev.x + deltaX));
      next.y = Math.max(0, Math.min(1 - prev.height, prev.y + deltaY));
    } else if (dragMode === 'se') {
      next.width = Math.max(0.1, Math.min(1 - prev.x, prev.width + deltaX));
      next.height = Math.max(0.1, Math.min(1 - prev.y, prev.height + deltaY));
    } else if (dragMode === 'nw') {
      const newX = Math.max(0, Math.min(prev.x + prev.width - 0.1, prev.x + deltaX));
      const newY = Math.max(0, Math.min(prev.y + prev.height - 0.1, prev.y + deltaY));
      next.width = prev.width + (prev.x - newX);
      next.height = prev.height + (prev.y - newY);
      next.x = newX;
      next.y = newY;
    }

    setCropBox(next);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragMode(null);
  };

  // Génération du Blob rogné via Canvas
  const handleApplyCrop = () => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const realX = cropBox.x * img.naturalWidth;
      const realY = cropBox.y * img.naturalHeight;
      const realW = cropBox.width * img.naturalWidth;
      const realH = cropBox.height * img.naturalHeight;

      canvas.width = Math.max(10, Math.round(realW));
      canvas.height = Math.max(10, Math.round(realH));
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, realX, realY, realW, realH, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          onCropComplete(blob);
          onClose();
        }
      }, imageBlob.type || 'image/png');
    };
    img.src = imageUrl;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-[#0e131f] dark:bg-[#0e131f] light:bg-white border border-white/10 dark:border-white/10 light:border-slate-200 max-w-3xl w-full rounded-3xl p-5 shadow-2xl flex flex-col space-y-4 max-h-[95vh] text-slate-100 dark:text-slate-100 light:text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 dark:border-white/10 light:border-slate-200">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Crop className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm tracking-tight">
                Rogner / Ajuster la Capture
              </h3>
              <p className="text-[11px] text-slate-400">
                Cadrez la zone utile des cotes, ou rétablissez la forme complète à tout moment.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barre de préréglages */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleResetToFull}
              className="px-3 py-1.5 rounded-xl bg-slate-800 dark:bg-slate-800 light:bg-slate-100 hover:bg-slate-700 text-slate-200 dark:text-slate-200 light:text-slate-800 font-bold border border-white/10 transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Rétablir Forme Complète (100%)</span>
            </button>

            <button
              type="button"
              onClick={handlePresetOddsFocus}
              className="px-3 py-1.5 rounded-xl bg-slate-800 dark:bg-slate-800 light:bg-slate-100 hover:bg-slate-700 text-slate-200 dark:text-slate-200 light:text-slate-800 font-bold border border-white/10 transition flex items-center gap-1.5"
            >
              <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
              <span>{isPortrait ? 'Focus Cotes (Mobile)' : 'Focus Cotes'}</span>
            </button>

            {isPortrait && (
              <button
                type="button"
                onClick={handlePresetMobileHeaderAndOdds}
                className="px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 font-bold border border-cyan-500/30 transition flex items-center gap-1.5"
              >
                <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                <span>Score + Cotes (Vertical)</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
            {isPortrait && (
              <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 flex items-center gap-1">
                <Smartphone className="w-3 h-3" />
                Vertical / Portrait
              </span>
            )}
            <span>{imageSize.width} × {imageSize.height} px</span>
          </div>
        </div>

        {/* Zone Canvas & Boîte de rognage interactive avec cadrage proportionnel */}
        <div className="flex items-center justify-center p-2 bg-black/60 rounded-2xl border border-white/5 overflow-hidden">
          <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{
              aspectRatio:
                imageSize.width && imageSize.height
                  ? `${imageSize.width} / ${imageSize.height}`
                  : isPortrait
                  ? '9 / 16'
                  : '16 / 10',
              maxHeight: isPortrait ? '60vh' : '50vh',
            }}
            className="relative bg-black rounded-2xl overflow-hidden select-none border border-white/10 shadow-2xl"
          >
            <img
              src={imageUrl}
              alt="Source"
              className="w-full h-full object-fill pointer-events-none opacity-40"
            />

          {/* Boîte de Rognage / Découpe */}
          <div
            className="absolute border-2 border-blue-500 bg-blue-500/10 shadow-glow-blue cursor-move"
            style={{
              left: `${cropBox.x * 100}%`,
              top: `${cropBox.y * 100}%`,
              width: `${cropBox.width * 100}%`,
              height: `${cropBox.height * 100}%`,
            }}
            onMouseDown={(e) => handleMouseDown(e, 'move')}
          >
            {/* Image nette révélée à l'intérieur du cadre */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <img
                src={imageUrl}
                alt="Crop preview"
                className="absolute max-w-none"
                style={{
                  width: `${(1 / cropBox.width) * 100}%`,
                  height: `${(1 / cropBox.height) * 100}%`,
                  left: `-${(cropBox.x / cropBox.width) * 100}%`,
                  top: `-${(cropBox.y / cropBox.height) * 100}%`,
                }}
              />
            </div>

            {/* Poignée Coin Supérieur Gauche */}
            <div
              className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-nw-resize shadow-md"
              onMouseDown={(e) => handleMouseDown(e, 'nw')}
            />

            {/* Poignée Coin Inférieur Droit */}
            <div
              className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-se-resize shadow-md"
              onMouseDown={(e) => handleMouseDown(e, 'se')}
            />

            {/* Grille règle des tiers */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
              <div className="border-r border-b border-blue-400/40" />
              <div className="border-r border-b border-blue-400/40" />
              <div className="border-b border-blue-400/40" />
              <div className="border-r border-b border-blue-400/40" />
              <div className="border-r border-b border-blue-400/40" />
              <div className="border-b border-blue-400/40" />
            </div>
          </div>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10 dark:border-white/10 light:border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white transition text-xs font-semibold"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={handleApplyCrop}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-glow-blue transition flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Appliquer le Rognage</span>
          </button>
        </div>
      </div>
    </div>
  );
};
