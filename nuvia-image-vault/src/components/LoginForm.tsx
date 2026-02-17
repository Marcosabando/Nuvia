import React, { useState } from "react";
import { Lock, Mail, Eye, EyeOff, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { buildUrl } from "../config/api.config";
import { useToast } from "@/hooks/use-toast";

interface LoginFormProps {
  openRegister: () => void;
}

export default function LoginForm({ openRegister }: LoginFormProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(buildUrl("/users/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: formData.identifier,
          password: formData.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error del servidor: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // 🔥 GUARDAR AUTENTICACIÓN
        localStorage.setItem("authToken", data.data.token);
        localStorage.setItem("userRole", data.data.user.role);
        localStorage.setItem("user", JSON.stringify(data.data.user));

        if (formData.rememberMe) {
          localStorage.setItem("rememberMe", "true");
        } else {
          localStorage.removeItem("rememberMe");
        }

        // ✅ Toast de éxito (morado estilo UploadZone)
        toast({
          title: "✅ Sesión iniciada",
          description: "Has iniciado sesión correctamente",
        });

        // Redirigir al home
        navigate("/home");
      } else {
        const msg = data.error || "Credenciales inválidas";

        // ✅ Toast de error (en vez de alert, estilo consistente)
        toast({
          title: "❌ Error de autenticación",
          description: msg,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error en login:", error);

      toast({
        title: "❌ Error de autenticación",
        description: "Error de autenticación: " + (error?.message || "Error desconocido"),
        variant: "destructive",
      });
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
  };

  const handleForgotPassword = () => {
    toast({
      title: "ℹ️ Recuperación de contraseña",
      description: "Función de recuperación de contraseña no implementada",
    });
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

      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* Email */}
        <div className="space-y-3">
          <label htmlFor="identifier" className="text-sm font-semibold block text-nuvia-deep">
            Correo electrónico o nombre de usuario
          </label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-nuvia-mauve group-focus-within:text-nuvia-rose transition-colors" />
            <input
              type="text"
              id="identifier"
              name="identifier"
              value={formData.identifier}
              onChange={handleChange}
              placeholder="Correo o nombre de usuario"
              required
              disabled={isLoading}
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
