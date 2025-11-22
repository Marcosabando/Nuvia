import { Navigate } from "react-router-dom";

interface Props {
  children: React.ReactNode;
  requiredRole?: string;
}

const ProtectedRoute = ({ children, requiredRole }: Props) => {
  // 🔥 CORREGIDO: Usar los mismos nombres que en LoginForm
  const token = localStorage.getItem("authToken");
  const userRole = localStorage.getItem("userRole");

  console.log("🔐 ProtectedRoute - Token:", token ? "✅ Existe" : "❌ No existe");
  console.log("🔐 ProtectedRoute - Role:", userRole);
  console.log("🔐 ProtectedRoute - Required Role:", requiredRole);

  // Si no hay token → Redirigir a login
  if (!token) {
    console.log("❌ No hay token, redirigiendo a /");
    return <Navigate to="/" replace />;
  }

  // Si se exige un rol específico y no coincide → Redirigir a home
  if (requiredRole && userRole !== requiredRole) {
    console.log(`❌ Rol requerido: ${requiredRole}, rol actual: ${userRole}`);
    return <Navigate to="/home" replace />;
  }

  console.log("✅ Acceso permitido");
  return <>{children}</>;
};

export default ProtectedRoute;