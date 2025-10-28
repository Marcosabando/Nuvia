import { useState } from "react";
import { Sparkles, Shield, Zap } from "lucide-react";
import LoginForm from "../components/LoginForm";
import RegisterForm from "../components/RegisterForm";
import Modal from "../components/Modal"; // Componente Modal reutilizable

export default function NuviaLoginPage() {
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-nuvia-deep via-nuvia-mauve via-nuvia-rose to-nuvia-peach animate-gradient-shift">
      <div className="w-full max-w-6xl bg-white/95 backdrop-blur-sm rounded-3xl shadow-nuvia-strong border border-nuvia-peach/20 overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        {/* Left Section - Info */}
        <div className="hidden lg:flex flex-col justify-center p-12 text-white bg-gradient-to-br from-nuvia-deep via-nuvia-mauve to-nuvia-rose relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-nuvia-rose/20 via-transparent to-nuvia-peach/30"></div>
          {/* Decorative elements */}
          <div className="absolute top-10 right-10 w-32 h-32 bg-nuvia-peach/20 rounded-full blur-2xl animate-float"></div>
          <div className="absolute bottom-20 left-10 w-24 h-24 bg-nuvia-rose/30 rounded-full blur-xl animate-float" style={{animationDelay: '1s'}}></div>
          <div className="relative z-10 space-y-8">
            <div className="flex items-center gap-5 mb-8">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br from-nuvia-peach to-white/20 backdrop-blur-sm shadow-nuvia-glow">
                <img src="/nuvia-white.png" alt="" className="w-12 h-12" />
              </div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-white to-nuvia-peach bg-clip-text text-transparent">
                Nuvia
              </h1>
            </div>
            <div className="space-y-6">
              <h2 className="text-4xl font-bold leading-tight">
                Tu nube personal
                <span className="bg-gradient-to-r from-nuvia-peach to-white bg-clip-text text-transparent"> inteligente</span>
              </h2>
              <p className="text-xl opacity-95 leading-relaxed">
                Guarda, organiza y comparte tus imágenes con estilo y seguridad. Experimenta la gestión de imágenes como nunca antes.
              </p>
            </div>
            <div className="space-y-6 pt-4">
              <div className="flex items-center gap-4 group hover:translate-x-2 transition-transform duration-300">
                <div className="w-12 h-12 rounded-xl bg-nuvia-peach/20 flex items-center justify-center group-hover:bg-nuvia-peach/30 transition-colors">
                  <Sparkles className="w-6 h-6" />
                </div>
                <span className="text-lg font-medium">Interfaz intuitiva y moderna</span>
              </div>
              <div className="flex items-center gap-4 group hover:translate-x-2 transition-transform duration-300">
                <div className="w-12 h-12 rounded-xl bg-nuvia-peach/20 flex items-center justify-center group-hover:bg-nuvia-peach/30 transition-colors">
                  <Shield className="w-6 h-6" />
                </div>
                <span className="text-lg font-medium">Seguridad y privacidad garantizada</span>
              </div>
              <div className="flex items-center gap-4 group hover:translate-x-2 transition-transform duration-300">
                <div className="w-12 h-12 rounded-xl bg-nuvia-peach/20 flex items-center justify-center group-hover:bg-nuvia-peach/30 transition-colors">
                  <Zap className="w-6 h-6" />
                </div>
                <span className="text-lg font-medium">Rendimiento y velocidad optimizada</span>
              </div>
            </div>
          </div>
        </div>
        {/* Right Section - Login */}
        <div className="flex items-center justify-center p-8 bg-gradient-to-br from-white to-nuvia-peach/5">
          <LoginForm openRegister={() => setShowRegisterModal(true)} />
        </div>
      </div>
      {/* Register Modal */}
      <Modal isOpen={showRegisterModal} onClose={() => setShowRegisterModal(false)}>
        <RegisterForm onClose={() => setShowRegisterModal(false)} />
      </Modal>
    </div>
  );
}
