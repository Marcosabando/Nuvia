import React from 'react';
import { Heart, Instagram } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  const handleCreatorClick = (instagramUsername) => {
    window.open(`https://instagram.com/${instagramUsername}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <footer className="relative overflow-hidden">
      {/* Fondo idéntico al home */}
      <div className="absolute inset-0 bg-gradient-to-br from-nuvia-deep via-nuvia-mauve to-nuvia-rose"></div>
      
      {/* Overlay sutil */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
      
      {/* Borde superior elegante */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col items-center space-y-10">
          
          {/* Logo */}
          <div className="text-center space-y-4">
            <h3 className="text-2xl font-display font-semibold text-white">
              Nuvia
            </h3>
            <p className="text-sm text-white/80 max-w-md mx-auto">
              Tu plataforma elegante de gestión multimedia
            </p>
          </div>

          {/* Creadores - estilo consistente con las cards del home */}
          <div className="flex flex-col items-center space-y-6">
            <div className="flex items-center space-x-2 text-white/70">
              <Heart className="w-4 h-4 text-nuvia-peach fill-nuvia-peach" />
              <span className="text-sm">Hecho por</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div 
                onClick={() => handleCreatorClick('markitosabando')}
                className="group cursor-pointer"
              >
                <div className="flex items-center space-x-3 px-5 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-nuvia-soft hover:shadow-nuvia-glow transition-all duration-300">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-nuvia-deep to-nuvia-mauve flex items-center justify-center">
                      <span className="text-sm font-medium text-white">M</span>
                    </div>
                    <div className="text-left">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-white">
                          Marcos Abando
                        </span>
                        <Instagram className="w-3.5 h-3.5 text-white/60" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <span className="text-white/40 text-sm">y</span>

              <div 
                onClick={() => handleCreatorClick('joseblue.jpg')}
                className="group cursor-pointer"
              >
                <div className="flex items-center space-x-3 px-5 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-nuvia-soft hover:shadow-nuvia-glow transition-all duration-300">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-nuvia-rose to-nuvia-peach flex items-center justify-center">
                      <span className="text-sm font-medium text-white">J</span>
                    </div>
                    <div className="text-left">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-white">
                          Jose Antonio Arjona
                        </span>
                        <Instagram className="w-3.5 h-3.5 text-white/60" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Línea sutil */}
          <div className="w-full max-w-md h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

          {/* Copyright minimalista */}
          <div className="text-center">
            <p className="text-xs text-white/60">
              © {currentYear} Nuvia — Plataforma de gestión multimedia
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;