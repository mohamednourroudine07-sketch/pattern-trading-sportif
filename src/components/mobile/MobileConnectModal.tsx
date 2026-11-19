import React, { useState } from 'react';
import { Smartphone, X, Copy, Check, Wifi, ExternalLink, QrCode } from 'lucide-react';

interface MobileConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  networkIp?: string;
}

export const MobileConnectModal: React.FC<MobileConnectModalProps> = ({
  isOpen,
  onClose,
  networkIp,
}) => {
  const [copied, setCopied] = useState(false);
  const mobileUrl = networkIp
    ? `http://${networkIp}:5173/`
    : `${window.location.origin}${import.meta.env.BASE_URL}`;

  if (!isOpen) return null;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(mobileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // URL QR Code instantané haute définition
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    mobileUrl
  )}&bgcolor=ffffff&color=07090e&margin=2`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[#0e131f] dark:bg-[#0e131f] light:bg-white border border-white/10 dark:border-white/10 light:border-slate-200 max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-5 text-slate-100 dark:text-slate-100 light:text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 dark:border-white/10 light:border-slate-200">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Smartphone className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm tracking-tight">
                Connexion Téléphone Android
              </h3>
              <p className="text-[11px] text-slate-400">
                {networkIp ? 'Accès direct sur le même réseau Wi-Fi' : 'Accès à l’application en ligne'}
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

        {/* QR Code & Instructions */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-3 bg-white rounded-2xl shadow-xl border border-slate-200/80">
            <img
              src={qrCodeUrl}
              alt="QR Code Mobile Connect"
              className="w-44 h-44 object-contain rounded-xl"
            />
          </div>

          <p className="text-xs text-slate-300 dark:text-slate-300 light:text-slate-600 max-w-xs leading-relaxed">
            Scannez ce QR Code avec l'appareil photo de votre smartphone pour ouvrir l'application.
          </p>

          {/* Adresse Réseau copiable */}
          <div className="w-full bg-slate-950/80 dark:bg-slate-950/80 light:bg-slate-100 border border-white/10 dark:border-white/10 light:border-slate-200 rounded-2xl p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-hidden text-left">
              <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-mono text-xs font-bold text-slate-200 dark:text-slate-200 light:text-slate-800 truncate">
                {mobileUrl}
              </span>
            </div>

            <button
              onClick={copyToClipboard}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-sm"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copié !' : 'Copier'}</span>
            </button>
          </div>
        </div>

        {/* Astuce PWA Android */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3 text-[11px] text-blue-300 dark:text-blue-300 light:text-blue-700 space-y-1">
          <strong className="block font-semibold">
            Astuce Android Plein Écran :
          </strong>
          <p className="text-[11px] leading-relaxed opacity-90">
            Sur Chrome Android, appuyez sur le menu (les 3 points en haut) puis choisissez <strong>« Ajouter à l'écran d'accueil »</strong> pour profiter de l'application en plein écran comme une véritable app native.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-slate-800 dark:bg-slate-800 light:bg-slate-200 hover:bg-slate-700 text-white dark:text-white light:text-slate-900 rounded-xl text-xs font-bold transition"
        >
          Fermer
        </button>
      </div>
    </div>
  );
};
