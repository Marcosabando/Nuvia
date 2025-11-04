import React, { useState } from "react";
import { Lock, Mail, Eye, EyeOff, ArrowRight, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AuthService } from "@/services/auth.service"; // 👈 Usa AuthService

interface LoginFormProps {
  openRegister: () => void;
}

export default function LoginForm({ openRegister }: LoginFormProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ 
    email: "", 
    password: "", 
    rememberMe: false 
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // ✅ Usa AuthService - maneja todo automáticamente
      const response = await AuthService.login({
        email: formData.email.trim(),
        password: formData.password
      });

      console.log("✅ Login exitoso:", response);

      // Manejar "Recordar sesión"
      if (formData.rememberMe) {
        localStorage.setItem("rememberMe", "true");
      } else {
        localStorage.removeItem("rememberMe");
      }
      
      // Redirigir al home
      navigate("/home");
      
    } catch (error: any) {
      console.error("❌ Error en login:", error);
      setError(error.message || "Error de autenticación");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError(null); // Limpiar error al escribir
  };

  const handleForgotPassword = () => {
    alert("Función de recuperación de contraseña no implementada");
  };

  return (
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

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-start gap-3 animate-shake mb-6">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      <form className="space-y-6" onSubmit={handleSubmit}>
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
              disabled={isLoading}
              autoComplete="email"
              className="w-full pl-12 pr-4 py-4 border-2 border-nuvia-peach/30 bg-gradient-to-r from-white to-nuvia-peach/5 text-nuvia-deep rounded-xl focus:outline-none focus:border-nuvia-rose focus:shadow-nuvia-accent transition-all duration-300 hover:border-nuvia-mauve/50 disabled:opacity-50 disabled:cursor-not-allowed"
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
              disabled={isLoading}
              autoComplete="current-password"
              className="w-full pl-12 pr-14 py-4 border-2 border-nuvia-peach/30 bg-gradient-to-r from-white to-nuvia-peach/5 text-nuvia-deep rounded-xl focus:outline-none focus:border-nuvia-rose focus:shadow-nuvia-accent transition-all duration-300 hover:border-nuvia-mauve/50 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-nuvia-mauve hover:text-nuvia-rose hover:bg-nuvia-peach/10 rounded-lg p-1 transition-all duration-300 disabled:opacity-50"
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
              disabled={isLoading}
              className="w-5 h-5 rounded-lg focus:ring-2 accent-nuvia-rose border-2 border-nuvia-mauve disabled:opacity-50"
            />
            <span className="text-sm font-medium text-nuvia-mauve group-hover:text-nuvia-rose transition-colors">
              Recordar sesión
            </span>
          </label>
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={isLoading}
            className="text-sm font-medium text-nuvia-rose hover:text-nuvia-peach hover:underline transition-all duration-300 disabled:opacity-50"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        {/* Login Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full text-white font-bold py-4 px-6 rounded-xl bg-gradient-to-r from-nuvia-deep via-nuvia-mauve to-nuvia-rose hover:from-nuvia-mauve hover:via-nuvia-rose hover:to-nuvia-peach transition-all duration-500 flex items-center justify-center space-x-3 shadow-nuvia-strong hover:shadow-nuvia-glow transform hover:scale-[1.02] group disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isLoading ? (
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span className="text-lg">Iniciando sesión...</span>
            </div>
          ) : (
            <>
              <span className="text-lg">Iniciar Sesión</span>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
            </>
          )}
        </button>

        {/* Create Account */}
        <div className="text-center mt-6">
          <p className="mb-4 text-nuvia-mauve font-medium text-lg">¿No tienes una cuenta?</p>
          <button
            type="button"
            onClick={openRegister}
            disabled={isLoading}
            className="w-full text-white font-bold py-4 px-6 rounded-xl bg-gradient-to-r from-nuvia-deep via-nuvia-mauve to-nuvia-rose hover:from-nuvia-mauve hover:via-nuvia-rose hover:to-nuvia-peach transition-all duration-500 flex items-center justify-center space-x-3 shadow-nuvia-strong hover:shadow-nuvia-glow transform hover:scale-[1.02] group disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            Crear cuenta nueva
          </button>
        </div>
      </form>
    </div>
  );
}