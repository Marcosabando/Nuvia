import React, { useState } from "react";
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight,
  User,
  X,
  Sparkles,
  Shield,
  Zap
} from "lucide-react";

// Modal Component
function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-nuvia-deep/80 via-nuvia-mauve/70 to-nuvia-rose/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto relative shadow-nuvia-strong border border-nuvia-peach/20">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-nuvia-mauve hover:text-nuvia-deep hover:bg-nuvia-peach/10 rounded-full p-1 z-10 transition-all duration-300"
        >
          <X className="w-6 h-6" />
        </button>
        {children}
      </div>
    </div>
  );
}

// Register Form Component
function RegisterForm({ onClose }) {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Register submitted:', formData);
  };

  return (
    <div className="p-8 space-y-6 bg-gradient-to-br from-nuvia-peach/5 to-nuvia-rose/10">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 bg-gradient-to-br from-nuvia-deep via-nuvia-mauve to-nuvia-rose shadow-nuvia-glow animate-float">
          <User className="w-10 h-10 text-white drop-shadow-lg" />
        </div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-nuvia-deep to-nuvia-mauve bg-clip-text text-transparent mb-2">
          Crear Cuenta
        </h2>
        <p className="text-nuvia-rose font-medium">Únete a Nuvia y empieza tu experiencia</p>
      </div>

      {/* Name */}
      <div className="space-y-3">
        <label htmlFor="name" className="text-sm font-semibold block text-nuvia-deep">
          Nombre completo
        </label>
        <div className="relative group">
          <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-nuvia-mauve group-focus-within:text-nuvia-rose transition-colors" />
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Tu nombre completo"
            required
            className="w-full pl-12 pr-4 py-4 border-2 border-nuvia-peach/30 bg-gradient-to-r from-white to-nuvia-peach/5 text-nuvia-deep rounded-xl focus:outline-none focus:border-nuvia-rose focus:shadow-nuvia-accent transition-all duration-300 hover:border-nuvia-mauve/50"
          />
        </div>
      </div>

      {/* Email */}
      <div className="space-y-3">
        <label htmlFor="register-email" className="text-sm font-semibold block text-nuvia-deep">
          Correo electrónico
        </label>
        <div className="relative group">
          <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-nuvia-mauve group-focus-within:text-nuvia-rose transition-colors" />
          <input
            type="email"
            id="register-email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="tu@email.com"
            required
            className="w-full pl-12 pr-4 py-4 border-2 border-nuvia-peach/30 bg-gradient-to-r from-white to-nuvia-peach/5 text-nuvia-deep rounded-xl focus:outline-none focus:border-nuvia-rose focus:shadow-nuvia-accent transition-all duration-300 hover:border-nuvia-mauve/50"
          />
        </div>
      </div>

      {/* Password */}
      <div className="space-y-3">
        <label htmlFor="register-password" className="text-sm font-semibold block text-nuvia-deep">
          Contraseña
        </label>
        <div className="relative group">
          <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-nuvia-mauve group-focus-within:text-nuvia-rose transition-colors" />
          <input
            type={showPassword ? "text" : "password"}
            id="register-password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Tu contraseña"
            required
            className="w-full pl-12 pr-14 py-4 border-2 border-nuvia-peach/30 bg-gradient-to-r from-white to-nuvia-peach/5 text-nuvia-deep rounded-xl focus:outline-none focus:border-nuvia-rose focus:shadow-nuvia-accent transition-all duration-300 hover:border-nuvia-mauve/50"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-nuvia-mauve hover:text-nuvia-rose hover:bg-nuvia-peach/10 rounded-lg p-1 transition-all duration-300"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Confirm Password */}
      <div className="space-y-3">
        <label htmlFor="confirmPassword" className="text-sm font-semibold block text-nuvia-deep">
          Confirmar contraseña
        </label>
        <div className="relative group">
          <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-nuvia-mauve group-focus-within:text-nuvia-rose transition-colors" />
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Confirma tu contraseña"
            required
            className="w-full pl-12 pr-4 py-4 border-2 border-nuvia-peach/30 bg-gradient-to-r from-white to-nuvia-peach/5 text-nuvia-deep rounded-xl focus:outline-none focus:border-nuvia-rose focus:shadow-nuvia-accent transition-all duration-300 hover:border-nuvia-mauve/50"
          />
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="button"
        onClick={handleSubmit}
        className="w-full text-white font-bold py-4 px-6 rounded-xl bg-gradient-to-r from-nuvia-deep via-nuvia-mauve to-nuvia-rose hover:from-nuvia-mauve hover:via-nuvia-rose hover:to-nuvia-peach transition-all duration-500 flex items-center justify-center space-x-3 shadow-nuvia-strong hover:shadow-nuvia-glow transform hover:scale-[1.02] group"
      >
        <span className="text-lg">Crear Cuenta</span>
        <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
      </button>
    </div>
  );
}

// Main Component
export default function NuviaLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Login submitted:", formData);
  };

  const handleForgotPassword = () => {
    console.log("Forgot password clicked");
  };

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
          <div className="w-full max-w-md space-y-8">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 bg-gradient-to-br from-nuvia-deep via-nuvia-mauve to-nuvia-rose shadow-nuvia-glow animate-float">
                <Lock className="w-10 h-10 text-white drop-shadow-lg" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-nuvia-deep to-nuvia-mauve bg-clip-text text-transparent mb-3">
                Iniciar Sesión
              </h1>
              <p className="text-nuvia-rose font-medium text-lg">Ingresa a tu cuenta para continuar</p>
            </div>

            {/* Email */}
            <div className="space-y-3">
              <label htmlFor="email" className="text-sm font-semibold block text-nuvia-deep">
                Correo electrónico
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-nuvia-mauve group-focus-within:text-nuvia-rose transition-colors" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="tu@email.com"
                  required
                  className="w-full pl-12 pr-4 py-4 border-2 border-nuvia-peach/30 bg-gradient-to-r from-white to-nuvia-peach/5 text-nuvia-deep rounded-xl focus:outline-none focus:border-nuvia-rose focus:shadow-nuvia-accent transition-all duration-300 hover:border-nuvia-mauve/50"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-3">
              <label htmlFor="password" className="text-sm font-semibold block text-nuvia-deep">
                Contraseña
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-nuvia-mauve group-focus-within:text-nuvia-rose transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Tu contraseña"
                  required
                  className="w-full pl-12 pr-14 py-4 border-2 border-nuvia-peach/30 bg-gradient-to-r from-white to-nuvia-peach/5 text-nuvia-deep rounded-xl focus:outline-none focus:border-nuvia-rose focus:shadow-nuvia-accent transition-all duration-300 hover:border-nuvia-mauve/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-nuvia-mauve hover:text-nuvia-rose hover:bg-nuvia-peach/10 rounded-lg p-1 transition-all duration-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember / Forgot */}
            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center space-x-3 cursor-pointer group">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="w-5 h-5 rounded-lg focus:ring-2 accent-nuvia-rose border-2 border-nuvia-mauve"
                />
                <span className="text-sm font-medium text-nuvia-mauve group-hover:text-nuvia-rose transition-colors">
                  Recordar sesión
                </span>
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm font-medium text-nuvia-rose hover:text-nuvia-peach hover:underline transition-all duration-300"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Login Button */}
            <button
              type="button"
              onClick={handleSubmit}
              className="w-full text-white font-bold py-4 px-6 rounded-xl bg-gradient-to-r from-nuvia-deep via-nuvia-mauve to-nuvia-rose hover:from-nuvia-mauve hover:via-nuvia-rose hover:to-nuvia-peach transition-all duration-500 flex items-center justify-center space-x-3 shadow-nuvia-strong hover:shadow-nuvia-glow transform hover:scale-[1.02] group"
            >
              <span className="text-lg">Iniciar Sesión</span>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
            </button>

            {/* Divider */}
            <div className="flex items-center my-8">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-nuvia-mauve/30 to-transparent"></div>
              <span className="px-6 text-base font-medium text-nuvia-rose bg-gradient-to-r from-nuvia-peach/10 to-nuvia-rose/10 rounded-full py-2">
                o
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-nuvia-mauve/30 to-transparent"></div>
            </div>

            {/* Create Account */}
            <div className="text-center">
              <p className="mb-4 text-nuvia-mauve font-medium text-lg">¿No tienes una cuenta?</p>
              <button
                type="button"
                onClick={() => setShowRegisterModal(true)}
                className="w-full text-white font-bold py-4 px-6 rounded-xl bg-gradient-to-r from-nuvia-rose via-nuvia-peach to-nuvia-rose hover:from-nuvia-peach hover:via-nuvia-rose hover:to-nuvia-mauve transition-all duration-500 shadow-nuvia-medium hover:shadow-nuvia-strong transform hover:scale-[1.02]"
              >
                Crear cuenta nueva
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Register Modal */}
      <Modal isOpen={showRegisterModal} onClose={() => setShowRegisterModal(false)}>
        <RegisterForm onClose={() => setShowRegisterModal(false)} />
      </Modal>
    </div>
  );
}