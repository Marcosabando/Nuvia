import React, { useState } from "react";
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { AuthService } from "@/services/auth.service";

interface RegisterFormProps {
  onClose: () => void;
}

export default function RegisterForm({ onClose }: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Validaciones en tiempo real
  const [validations, setValidations] = useState({
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    passwordsMatch: false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);

    // Validar password en tiempo real
    if (name === "password") {
      setValidations({
        minLength: value.length >= 8,
        hasUpperCase: /[A-Z]/.test(value),
        hasLowerCase: /[a-z]/.test(value),
        hasNumber: /[0-9]/.test(value),
        passwordsMatch: value === formData.confirmPassword && value.length > 0
      });
    }

    // Validar confirmación de password
    if (name === "confirmPassword") {
      setValidations(prev => ({
        ...prev,
        passwordsMatch: value === formData.password && value.length > 0
      }));
    }
  };

  const validateForm = (): string | null => {
    if (!formData.username.trim()) {
      return "El nombre de usuario es requerido";
    }
    if (formData.username.length < 3) {
      return "El nombre de usuario debe tener al menos 3 caracteres";
    }
    if (!formData.email.trim()) {
      return "El email es requerido";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return "Email inválido";
    }
    if (!formData.password) {
      return "La contraseña es requerida";
    }
    if (formData.password.length < 8) {
      return "La contraseña debe tener al menos 8 caracteres";
    }
    if (!/[A-Z]/.test(formData.password)) {
      return "La contraseña debe contener al menos una mayúscula";
    }
    if (!/[a-z]/.test(formData.password)) {
      return "La contraseña debe contener al menos una minúscula";
    }
    if (!/[0-9]/.test(formData.password)) {
      return "La contraseña debe contener al menos un número";
    }
    if (formData.password !== formData.confirmPassword) {
      return "Las contraseñas no coinciden";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar formulario
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // AQUÍ ESTÁ EL CAMBIO IMPORTANTE: Llamamos al servicio de registro
      await AuthService.register({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password
      });

      setSuccess(true);
      
      // Cerrar modal después de 2 segundos
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err: any) {
      console.error('Error en registro:', err);
      setError(err.message || "Error al crear la cuenta. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  // Pantalla de éxito
  if (success) {
    return (
      <div className="p-8 space-y-6 bg-gradient-to-br from-nuvia-peach/5 to-nuvia-rose/10 text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 bg-gradient-to-br from-green-400 to-green-600 shadow-nuvia-glow animate-bounce">
          <CheckCircle2 className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-nuvia-deep mb-2">
          ¡Cuenta creada exitosamente!
        </h2>
        <p className="text-nuvia-rose font-medium">
          Redirigiendo al inicio de sesión...
        </p>
      </div>
    );
  }

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

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-start gap-3 animate-shake">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Username */}
        <div className="space-y-3">
          <label htmlFor="username" className="text-sm font-semibold block text-nuvia-deep">
            Nombre de usuario
          </label>
          <div className="relative group">
            <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-nuvia-mauve group-focus-within:text-nuvia-rose transition-colors" />
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="tu_usuario"
              disabled={loading}
              className="w-full pl-12 pr-4 py-4 border-2 border-nuvia-peach/30 bg-gradient-to-r from-white to-nuvia-peach/5 text-nuvia-deep rounded-xl focus:outline-none focus:border-nuvia-rose focus:shadow-nuvia-accent transition-all duration-300 hover:border-nuvia-mauve/50 disabled:opacity-60"
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
              disabled={loading}
              className="w-full pl-12 pr-4 py-4 border-2 border-nuvia-peach/30 bg-gradient-to-r from-white to-nuvia-peach/5 text-nuvia-deep rounded-xl focus:outline-none focus:border-nuvia-rose focus:shadow-nuvia-accent transition-all duration-300 hover:border-nuvia-mauve/50 disabled:opacity-60"
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
              disabled={loading}
              className="w-full pl-12 pr-14 py-4 border-2 border-nuvia-peach/30 bg-gradient-to-r from-white to-nuvia-peach/5 text-nuvia-deep rounded-xl focus:outline-none focus:border-nuvia-rose focus:shadow-nuvia-accent transition-all duration-300 hover:border-nuvia-mauve/50 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-nuvia-mauve hover:text-nuvia-rose hover:bg-nuvia-peach/10 rounded-lg p-1 transition-all duration-300 disabled:opacity-60"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Password Requirements */}
          {formData.password && (
            <div className="mt-3 space-y-2 text-xs">
              <ValidationItem valid={validations.minLength} text="Mínimo 8 caracteres" />
              <ValidationItem valid={validations.hasUpperCase} text="Una letra mayúscula" />
              <ValidationItem valid={validations.hasLowerCase} text="Una letra minúscula" />
              <ValidationItem valid={validations.hasNumber} text="Un número" />
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-3">
          <label htmlFor="confirmPassword" className="text-sm font-semibold block text-nuvia-deep">
            Confirmar contraseña
          </label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-nuvia-mauve group-focus-within:text-nuvia-rose transition-colors" />
            <input
              type={showConfirmPassword ? "text" : "password"}
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirma tu contraseña"
              disabled={loading}
              className="w-full pl-12 pr-14 py-4 border-2 border-nuvia-peach/30 bg-gradient-to-r from-white to-nuvia-peach/5 text-nuvia-deep rounded-xl focus:outline-none focus:border-nuvia-rose focus:shadow-nuvia-accent transition-all duration-300 hover:border-nuvia-mauve/50 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={loading}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-nuvia-mauve hover:text-nuvia-rose hover:bg-nuvia-peach/10 rounded-lg p-1 transition-all duration-300 disabled:opacity-60"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {formData.confirmPassword && (
            <ValidationItem 
              valid={validations.passwordsMatch} 
              text="Las contraseñas coinciden" 
            />
          )}
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="w-full text-white font-bold py-4 px-6 rounded-xl bg-gradient-to-r from-nuvia-deep via-nuvia-mauve to-nuvia-rose hover:from-nuvia-mauve hover:via-nuvia-rose hover:to-nuvia-peach transition-all duration-500 flex items-center justify-center space-x-3 shadow-nuvia-strong hover:shadow-nuvia-glow transform hover:scale-[1.02] group disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
        >
          {loading ? (
            <>
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="text-lg">Creando cuenta...</span>
            </>
          ) : (
            <>
              <span className="text-lg">Crear Cuenta</span>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
            </>
          )}
        </button>

        {/* Login Link */}
        <p className="text-center text-sm text-nuvia-deep/60 mt-4">
          ¿Ya tienes cuenta?{" "}
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-nuvia-mauve hover:text-nuvia-rose font-semibold transition-colors disabled:opacity-60"
          >
            Inicia sesión
          </button>
        </p>
      </div>
    </div>
  );
}

// Componente auxiliar para mostrar validaciones
function ValidationItem({ valid, text }: { valid: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
        valid ? "bg-green-500" : "bg-gray-300"
      }`}>
        {valid && <CheckCircle2 className="w-3 h-3 text-white" />}
      </div>
      <span className={`${valid ? "text-green-600" : "text-gray-500"} font-medium`}>
        {text}
      </span>
    </div>
  );
}