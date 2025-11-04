import React, { useState } from "react";
import { User, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

interface RegisterFormProps {
  onClose: () => void;
}

export default function RegisterForm({ onClose }: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Register submitted:', formData);
  };

  return (
    <div className="p-8 space-y-6 bg-gradient-to-br from-nuvia-peach/5 to-nuvia-rose/10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 bg-gradient-to-br from-nuvia-deep via-nuvia-mauve to-nuvia-rose shadow-nuvia-glow animate-float">
          <User className="w-10 h-10 text-white drop-shadow-lg" />
        </div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-nuvia-deep to-nuvia-mauve bg-clip-text text-transparent mb-2">
          Crear Cuenta
        </h2>
        <p className="text-nuvia-rose font-medium">Únete a Nuvia y empieza tu experiencia</p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
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

        {/* Submit */}
        <button
          type="submit"
          className="w-full text-white font-bold py-4 px-6 rounded-xl bg-gradient-to-r from-nuvia-deep via-nuvia-mauve to-nuvia-rose hover:from-nuvia-mauve hover:via-nuvia-rose hover:to-nuvia-peach transition-all duration-500 flex items-center justify-center space-x-3 shadow-nuvia-strong hover:shadow-nuvia-glow transform hover:scale-[1.02] group"
        >
          <span className="text-lg">Crear Cuenta</span>
          <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
        </button>
      </form>
    </div>
  );
}
