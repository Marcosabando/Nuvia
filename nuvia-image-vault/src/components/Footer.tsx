import React from 'react';
import { Heart, Instagram } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const handleCreatorClick = (instagramUsername) => {
    window.open(`https://instagram.com/${instagramUsername}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <footer className="relative overflow-hidden">
      {/* Fondo */}
      <div className="absolute inset-0 bg-gradient-to-br from-nuvia-deep via-nuvia-mauve to-nuvia-rose"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col items-center space-y-6">

          {/* Logo */}
          <div className="text-center space-y-2">
            <h3 className="text-xl font-display font-semibold text-white">
              Nuvia
            </h3>
            <p className="text-xs text-white/80 max-w-sm mx-auto">
              Plataforma elegante de gestión multimedia
            </p>
          </div>

          {/* Creadores */}
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center space-x-2 text-white/70">
              <Heart className="w-3.5 h-3.5 text-nuvia-peach fill-nuvia-peach" />
              <span className="text-xs">Hecho por</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Marcos */}
              <div
                onClick={() => handleCreatorClick('markitosabando')}
                className="cursor-pointer"
              >
                <div className="flex items-center space-x-3 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-nuvia-soft hover:shadow-nuvia-glow transition-all duration-300">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-nuvia-deep to-nuvia-mauve flex items-center justify-center">
                    <span className="text-xs font-medium text-white">M</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium text-white">
                      Marcos Abando
                    </span>
                    <Instagram className="w-3.5 h-3.5 text-white/60" />
                  </div>
                </div>
              </div>

              <span className="text-white/40 text-xs">y</span>

              {/* Jose */}
              <div
                onClick={() => handleCreatorClick('joseblue.jpg')}
                className="cursor-pointer"
              >
                <div className="flex items-center space-x-3 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-nuvia-soft hover:shadow-nuvia-glow transition-all duration-300">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-nuvia-rose to-nuvia-peach flex items-center justify-center">
                    <span className="text-xs font-medium text-white">J</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium text-white">
                      Jose Antonio Arjona
                    </span>
                    <Instagram className="w-3.5 h-3.5 text-white/60" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Separador */}
          <div className="w-full max-w-sm h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

          {/* Copyright */}
          <p className="text-[11px] text-white/60 text-center">
            © {currentYear} Nuvia — Gestión multimedia
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
