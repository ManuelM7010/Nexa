import React, { useState } from 'react';
import { Download, Smartphone, X, Check } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  if (isInstalled) {
    return (
      <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <Check className="w-3.5 h-3.5" />
        PWA Instalada
      </span>
    );
  }

  if (isInstallable) {
    return (
      <button
        id="btn-pwa-install"
        onClick={async () => {
          const res = await install();
          if (res) setInstalledSuccess(true);
        }}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600/90 hover:bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition border border-blue-400/30 active:scale-95 cursor-pointer"
        title="Instalar NEXA Finance en este dispositivo"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Instalar App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          id="btn-pwa-ios-guide"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5 text-blue-400" />
          <span>Instalar en iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-400" />
                  Instalar en iPhone / iPad
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-xs text-slate-300 leading-relaxed">
                <p className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs">
                    1
                  </span>
                  <span>Toca el botón <strong>Compartir</strong> (ícono de cuadro con flecha hacia arriba) en la barra de Safari.</span>
                </p>
                <p className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs">
                    2
                  </span>
                  <span>Desplázate hacia abajo y selecciona <strong>Agregar a pantalla de inicio</strong>.</span>
                </p>
                <p className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs">
                    3
                  </span>
                  <span>¡Listo! Ahora NEXA funcionará como una aplicación nativa con acceso offline.</span>
                </p>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-xl bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
