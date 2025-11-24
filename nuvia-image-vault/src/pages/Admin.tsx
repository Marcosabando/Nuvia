// src/pages/Admin.tsx
import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users,
  HardDrive,
  Image,
  Video,
  Search,
  Shield,
  AlertCircle,
  TrendingUp,
  Database,
  UserX,
  Trash2,
  Eye,
  MoreVertical,
  Download,
  RefreshCw,
  Filter,
  Calendar,
  ArrowUpDown,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  userId: number;
  username: string;
  email: string;
  role: string;
  totalImages: number;
  totalVideos: number;
  storageUsed: number;
  storageLimit: number;
  lastLogin: string;
  createdAt: string;
  status: "active" | "suspended" | "inactive";
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalStorage: number;
  usedStorage: number;
  totalImages: number;
  totalVideos: number;
  uploadsToday: number;
  systemHealth: number;
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalStorage: 0,
    usedStorage: 0,
    totalImages: 0,
    totalVideos: 0,
    uploadsToday: 0,
    systemHealth: 100,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStorageDialog, setShowStorageDialog] = useState(false);
  const [newStorageLimit, setNewStorageLimit] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    // Verificar autenticación antes de cargar datos
    const token = localStorage.getItem("authToken");
    const userRole = localStorage.getItem("userRole");
    
    console.log("🔐 Verificando autenticación...");
    console.log("Token presente:", !!token);
    console.log("Rol de usuario:", userRole);
    
    if (!token) {
      console.error("❌ No hay token, redirigiendo al login");
      navigate("/");
      return;
    }
    
    if (userRole !== "admin") {
      console.error("❌ Usuario no es admin, redirigiendo a home");
      navigate("/home");
      return;
    }
    
    console.log("✅ Autenticación verificada, cargando datos...");
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("authToken");
      if (!token) {
        console.error("No hay token de autenticación");
        navigate("/");
        return;
      }

      const userRole = localStorage.getItem("userRole");
      if (userRole !== "admin") {
        console.error("Usuario no es admin:", userRole);
        navigate("/home");
        return;
      }

      console.log("🔍 Fetching admin stats...");
      
      // Fetch stats
      const statsResponse = await fetch("/api/admin/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("📊 Stats response status:", statsResponse.status);
      console.log("📊 Stats content-type:", statsResponse.headers.get("content-type"));

      if (statsResponse.status === 401 || statsResponse.status === 403) {
        console.error("❌ No autorizado, redirigiendo al login");
        localStorage.removeItem("authToken");
        localStorage.removeItem("userRole");
        localStorage.removeItem("user");
        navigate("/");
        return;
      }

      // Verificar que la respuesta es JSON
      const contentType = statsResponse.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await statsResponse.text();
        console.error("❌ Respuesta stats no es JSON:", text.substring(0, 200));
        throw new Error(`La API devolvió HTML en lugar de JSON. Verifica que la ruta /api/admin/stats esté correctamente configurada en tu servidor. Estado: ${statsResponse.status}`);
      }

      if (!statsResponse.ok) {
        const errorData = await statsResponse.json();
        console.error("❌ Error en stats:", errorData);
        throw new Error(errorData.error || `Error al cargar estadísticas: ${statsResponse.status}`);
      }

      const statsData = await statsResponse.json();
      console.log("✅ Stats data recibida:", statsData);
      setStats(statsData.data || statsData);

      console.log("🔍 Fetching admin users...");

      // Fetch users
      const usersResponse = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("👥 Users response status:", usersResponse.status);
      console.log("👥 Users content-type:", usersResponse.headers.get("content-type"));

      if (usersResponse.status === 401 || usersResponse.status === 403) {
        console.error("❌ No autorizado para ver usuarios");
        localStorage.removeItem("authToken");
        localStorage.removeItem("userRole");
        localStorage.removeItem("user");
        navigate("/");
        return;
      }

      // Verificar que la respuesta es JSON
      const usersContentType = usersResponse.headers.get("content-type");
      if (!usersContentType || !usersContentType.includes("application/json")) {
        const text = await usersResponse.text();
        console.error("❌ Respuesta users no es JSON:", text.substring(0, 200));
        throw new Error(`La API devolvió HTML en lugar de JSON. Verifica que la ruta /api/admin/users esté correctamente configurada. Estado: ${usersResponse.status}`);
      }

      if (!usersResponse.ok) {
        const errorData = await usersResponse.json();
        console.error("❌ Error en users:", errorData);
        throw new Error(errorData.error || `Error al cargar usuarios: ${usersResponse.status}`);
      }

      const usersData = await usersResponse.json();
      console.log("✅ Users data recibida:", usersData);
      
      // Asegurarnos de que cada usuario tenga el campo 'id' además de 'userId'
      const rawUsers = usersData.data || usersData;
      const formattedUsers = rawUsers.map((user: any) => ({
        ...user,
        id: user.id || user.userId?.toString() || String(user.userId)
      }));
      
      console.log("✅ Usuarios formateados:", formattedUsers.length);
      setUsers(formattedUsers);
    } catch (err) {
      console.error("❌ Error en fetchAdminData:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/");
        return;
      }

      // Usar userId en lugar de id para la petición
      const userIdToDelete = selectedUser.userId || selectedUser.id;
      
      const response = await fetch(`/api/admin/users/${userIdToDelete}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userRole");
        localStorage.removeItem("user");
        navigate("/");
        return;
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Respuesta no es JSON:", text);
        throw new Error("Error: La API devolvió HTML en lugar de JSON");
      }

      if (!response.ok) {
        throw new Error("Error al eliminar usuario");
      }

      setUsers(users.filter((u) => u.id !== selectedUser.id));
      setShowDeleteDialog(false);
      setSelectedUser(null);
    } catch (err) {
      console.error("Error al eliminar usuario:", err);
      setError(err instanceof Error ? err.message : "Error al eliminar usuario");
    }
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setShowUserDialog(true);
  };

  const handleUpdateStorage = async () => {
  if (!selectedUser) return;

  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      navigate("/");
      return;
    }

    // Validación básica
    const parsedLimit = Number(newStorageLimit);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      toast({
        title: "⚠️ Límite inválido",
        description: "Debes ingresar un número válido mayor a 0.",
        variant: "destructive",
      });
      return;
    }

    const userId = selectedUser.userId || selectedUser.id;

    const response = await fetch(`/api/admin/users/${userId}/storage`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ storageLimit: parsedLimit }),
    });

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("userRole");
      localStorage.removeItem("user");
      navigate("/");
      return;
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error("Respuesta no es JSON:", text);
      throw new Error("La API devolvió HTML en lugar de JSON");
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Error al actualizar almacenamiento");
    }

    // Actualizar usuarios en local
    setUsers((prev) =>
      prev.map((u) =>
        u.userId === selectedUser.userId
          ? { ...u, storageLimit: parsedLimit }
          : u
      )
    );

    setShowStorageDialog(false);
    setSelectedUser(null);

    toast({
      title: "✅ Almacenamiento actualizado",
      description: `Nuevo límite: ${parsedLimit} GB`,
    });
  } catch (err) {
    console.error("Error al actualizar almacenamiento:", err);
    const errorMsg = err instanceof Error ? err.message : "Error al actualizar almacenamiento";
    setError(errorMsg);
    toast({
      title: "❌ Error",
      description: errorMsg,
      variant: "destructive",
    });
  }
};

  const handleSuspendUser = async (userId: string) => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/");
        return;
      }

      const response = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userRole");
        localStorage.removeItem("user");
        navigate("/");
        return;
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Respuesta no es JSON:", text);
        throw new Error("Error: La API devolvió HTML en lugar de JSON");
      }

      if (!response.ok) {
        throw new Error("Error al suspender usuario");
      }

      await fetchAdminData();
      
      toast({
        title: "✅ Estado actualizado",
        description: "El estado del usuario ha sido cambiado correctamente.",
      });
    } catch (err) {
      console.error("Error al suspender usuario:", err);
      const errorMsg = err instanceof Error ? err.message : "Error al suspender usuario";
      setError(errorMsg);
      toast({
        title: "❌ Error",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  const handleExportData = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/");
        return;
      }

      const response = await fetch("/api/admin/export", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userRole");
        localStorage.removeItem("user");
        navigate("/");
        return;
      }

      if (!response.ok) {
        throw new Error("Error al exportar datos");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nuvia-export-${new Date().toISOString()}.csv`;
      a.click();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al exportar datos");
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || user.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case "username":
        comparison = a.username.localeCompare(b.username);
        break;
      case "email":
        comparison = a.email.localeCompare(b.email);
        break;
      case "storageUsed":
        comparison = a.storageUsed - b.storageUsed;
        break;
      case "totalImages":
        comparison = a.totalImages - b.totalImages;
        break;
      case "createdAt":
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      default:
        comparison = 0;
    }
    
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-700 border-green-500/50";
      case "suspended":
        return "bg-red-500/20 text-red-700 border-red-500/50";
      case "inactive":
        return "bg-gray-500/20 text-gray-700 border-gray-500/50";
      default:
        return "bg-gray-500/20 text-gray-700 border-gray-500/50";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Activo";
      case "suspended":
        return "Suspendido";
      case "inactive":
        return "Inactivo";
      default:
        return status;
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 sm:p-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-white flex items-center gap-2 sm:gap-3">
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-nuvia-peach flex-shrink-0" />
                <span className="break-words">Panel de Administración</span>
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-white/80 mt-1">
                Control total del sistema Nuvia
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                onClick={() => fetchAdminData()}
                variant="outline"
                className="flex-1 sm:flex-none border-white/20 text-white hover:bg-white/10 text-sm sm:text-base">
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualizar
              </Button>
              <Button
                onClick={handleExportData}
                className="flex-1 sm:flex-none bg-gradient-to-r from-nuvia-mauve to-nuvia-rose hover:shadow-nuvia-glow text-sm sm:text-base">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert className="border-red-500/50 bg-red-500/10">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-200 text-sm">{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium truncate">
                    Total Usuarios
                  </p>
                  <p className="text-xl md:text-2xl lg:text-3xl font-bold mt-1 md:mt-2 text-nuvia-deep">
                    {loading ? "..." : stats.totalUsers}
                  </p>
                </div>
                <div className="p-2 md:p-3 rounded-lg bg-gradient-nuvia-royal shadow-nuvia-soft flex-shrink-0">
                  <Users className="w-4 h-4 md:w-6 md:h-6 text-white" />
                </div>
              </div>
              <div className="mt-2">
                <Badge variant="secondary" className="text-xs">
                  {stats.activeUsers} activos
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium truncate">
                    Almacenamiento
                  </p>
                  <p className="text-xl md:text-2xl lg:text-3xl font-bold mt-1 md:mt-2 text-nuvia-deep">
                    {loading ? "..." : `${stats.usedStorage}GB`}
                  </p>
                </div>
                <div className="p-2 md:p-3 rounded-lg bg-gradient-nuvia-warm shadow-nuvia-soft flex-shrink-0">
                  <HardDrive className="w-4 h-4 md:w-6 md:h-6 text-white" />
                </div>
              </div>
              <div className="mt-2">
                <div className="w-full bg-nuvia-silver/30 rounded-full h-1.5">
                  <div
                    className="bg-gradient-to-r from-nuvia-mauve to-nuvia-rose h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min((stats.usedStorage / stats.totalStorage) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium truncate">
                    Total Multimedia
                  </p>
                  <p className="text-xl md:text-2xl lg:text-3xl font-bold mt-1 md:mt-2 text-nuvia-deep">
                    {loading ? "..." : stats.totalImages + stats.totalVideos}
                  </p>
                </div>
                <div className="p-2 md:p-3 rounded-lg bg-gradient-nuvia-ethereal shadow-nuvia-soft flex-shrink-0">
                  <Database className="w-4 h-4 md:w-6 md:h-6 text-white" />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-nuvia-deep/60 flex-wrap">
                <span>{stats.totalImages} img</span>
                <span>•</span>
                <span>{stats.totalVideos} vid</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium truncate">
                    Salud del Sistema
                  </p>
                  <p className="text-xl md:text-2xl lg:text-3xl font-bold mt-1 md:mt-2 text-nuvia-deep">
                    {loading ? "..." : `${stats.systemHealth}%`}
                  </p>
                </div>
                <div className="p-2 md:p-3 rounded-lg bg-gradient-nuvia-dawn shadow-nuvia-soft flex-shrink-0">
                  <TrendingUp className="w-4 h-4 md:w-6 md:h-6 text-white" />
                </div>
              </div>
              <div className="mt-2">
                <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-700">
                  Óptimo
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/80 to-nuvia-silver/10 shadow-nuvia-medium rounded-2xl">
          <CardHeader className="border-b border-nuvia-peach/20 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5 p-4 md:p-6">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2 text-nuvia-deep font-semibold text-base md:text-lg">
                  <Users className="w-4 h-4 md:w-5 md:h-5 text-nuvia-mauve flex-shrink-0" />
                  <span className="truncate">Gestión de Usuarios</span>
                  <Badge variant="secondary" className="ml-2 bg-nuvia-mauve/20 text-nuvia-mauve border-0 text-xs">
                    {sortedUsers.length}
                  </Badge>
                </CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-nuvia-deep/40" />
                  <Input
                    placeholder="Buscar usuarios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/50 border-nuvia-silver/30 text-sm"
                  />
                </div>
              </div>
              
              {/* Filtros y ordenamiento */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full bg-white/50 border-nuvia-silver/30">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filtrar por estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="active">Activos</SelectItem>
                      <SelectItem value="suspended">Suspendidos</SelectItem>
                      <SelectItem value="inactive">Inactivos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex-1">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full bg-white/50 border-nuvia-silver/30">
                      <ArrowUpDown className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="createdAt">Fecha de registro</SelectItem>
                      <SelectItem value="username">Nombre de usuario</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="storageUsed">Almacenamiento usado</SelectItem>
                      <SelectItem value="totalImages">Número de imágenes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  className="bg-white/50 border-nuvia-silver/30">
                  <ArrowUpDown className={`w-4 h-4 transition-transform ${sortOrder === "desc" ? "rotate-180" : ""}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-nuvia-silver/20">
                    <TableHead className="text-nuvia-deep/70 text-xs md:text-sm whitespace-nowrap">
                      Usuario
                    </TableHead>
                    <TableHead className="text-nuvia-deep/70 text-xs md:text-sm whitespace-nowrap hidden md:table-cell">
                      Email
                    </TableHead>
                    <TableHead className="text-nuvia-deep/70 text-xs md:text-sm whitespace-nowrap">
                      Estado
                    </TableHead>
                    <TableHead className="text-nuvia-deep/70 text-xs md:text-sm whitespace-nowrap hidden lg:table-cell">
                      Multimedia
                    </TableHead>
                    <TableHead className="text-nuvia-deep/70 text-xs md:text-sm whitespace-nowrap hidden xl:table-cell">
                      Almacenamiento
                    </TableHead>
                    <TableHead className="text-nuvia-deep/70 text-xs md:text-sm whitespace-nowrap hidden xl:table-cell">
                      Último Acceso
                    </TableHead>
                    <TableHead className="text-nuvia-deep/70 text-xs md:text-sm text-right whitespace-nowrap">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-nuvia-deep/60 text-sm">
                        Cargando datos...
                      </TableCell>
                    </TableRow>
                  ) : sortedUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-nuvia-deep/60 text-sm">
                        {searchTerm || filterStatus !== "all" 
                          ? "No se encontraron usuarios con los filtros aplicados" 
                          : "No hay usuarios registrados"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedUsers.map((user) => (
                      <TableRow key={user.id} className="border-nuvia-silver/10 hover:bg-nuvia-peach/5">
                        <TableCell className="font-medium text-nuvia-deep text-sm">
                          <div className="max-w-[120px] md:max-w-none truncate">{user.username}</div>
                        </TableCell>
                        <TableCell className="text-nuvia-deep/70 text-sm hidden md:table-cell">
                          <div className="max-w-[200px] truncate">{user.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(user.status)} text-xs whitespace-nowrap`}>
                            {getStatusText(user.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-nuvia-deep/70 hidden lg:table-cell">
                          <div className="flex items-center gap-2 md:gap-3">
                            <div className="flex items-center gap-1">
                              <Image className="w-3 h-3 md:w-3.5 md:h-3.5 text-nuvia-mauve flex-shrink-0" />
                              <span className="text-xs md:text-sm">{user.totalImages}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Video className="w-3 h-3 md:w-3.5 md:h-3.5 text-nuvia-rose flex-shrink-0" />
                              <span className="text-xs md:text-sm">{user.totalVideos}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-nuvia-deep/70 hidden xl:table-cell">
                          <div className="flex flex-col gap-1 min-w-[100px]">
                            <span className="text-xs md:text-sm font-medium whitespace-nowrap">
                              {user.storageUsed.toFixed(2)} GB / {user.storageLimit} GB
                            </span>
                            <div className="w-20 md:w-24 bg-nuvia-silver/30 rounded-full h-1">
                              <div
                                className="bg-gradient-to-r from-nuvia-mauve to-nuvia-rose h-1 rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min((user.storageUsed / user.storageLimit) * 100, 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-nuvia-deep/70 text-xs md:text-sm whitespace-nowrap hidden xl:table-cell">
                          {formatDate(user.lastLogin)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel className="text-sm">Acciones</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleViewUser(user)} className="text-sm">
                                <Eye className="mr-2 h-4 w-4" />
                                Ver detalles
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedUser(user);
                                  setNewStorageLimit(user.storageLimit.toString());
                                  setShowStorageDialog(true);
                                }} 
                                className="text-sm">
                                <HardDrive className="mr-2 h-4 w-4" />
                                Cambiar almacenamiento
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSuspendUser(user.userId?.toString() || user.id)} className="text-sm">
                                <UserX className="mr-2 h-4 w-4" />
                                {user.status === "active" ? "Suspender" : "Activar"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 text-sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowDeleteDialog(true);
                                }}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* User Details Dialog */}
        <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg md:text-xl">Detalles del Usuario</DialogTitle>
              <DialogDescription className="text-sm">
                Información completa de {selectedUser?.username}
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs md:text-sm font-medium text-nuvia-deep/70">Usuario</p>
                    <p className="text-sm md:text-base text-nuvia-deep break-words">{selectedUser.username}</p>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm font-medium text-nuvia-deep/70">Email</p>
                    <p className="text-sm md:text-base text-nuvia-deep break-all">{selectedUser.email}</p>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm font-medium text-nuvia-deep/70">Rol</p>
                    <Badge className="text-xs">{selectedUser.role}</Badge>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm font-medium text-nuvia-deep/70">Estado</p>
                    <Badge className={`${getStatusColor(selectedUser.status)} text-xs`}>
                      {getStatusText(selectedUser.status)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm font-medium text-nuvia-deep/70">Imágenes</p>
                    <p className="text-sm md:text-base text-nuvia-deep">{selectedUser.totalImages}</p>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm font-medium text-nuvia-deep/70">Videos</p>
                    <p className="text-sm md:text-base text-nuvia-deep">{selectedUser.totalVideos}</p>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm font-medium text-nuvia-deep/70">Almacenamiento</p>
                    <p className="text-sm md:text-base text-nuvia-deep">
                      {selectedUser.storageUsed} / {selectedUser.storageLimit} GB
                    </p>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm font-medium text-nuvia-deep/70">Registro</p>
                    <p className="text-sm md:text-base text-nuvia-deep">{formatDate(selectedUser.createdAt)}</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-lg md:text-xl">¿Eliminar usuario?</DialogTitle>
              <DialogDescription className="text-sm">
                Esta acción no se puede deshacer. Se eliminarán todos los datos del usuario
                <strong className="text-nuvia-deep"> {selectedUser?.username}</strong>.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteDialog(false)}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteUser} 
                className="w-full sm:w-auto bg-red-500 hover:bg-red-600"
              >
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Storage Limit Dialog */}
        <Dialog open={showStorageDialog} onOpenChange={setShowStorageDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-lg md:text-xl">Cambiar límite de almacenamiento</DialogTitle>
              <DialogDescription className="text-sm">
                Actualizar el límite de almacenamiento para <strong className="text-nuvia-deep">{selectedUser?.username}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="storageLimit">Nuevo límite (GB)</Label>
                <Input
                  id="storageLimit"
                  type="number"
                  min="1"
                  step="0.5"
                  value={newStorageLimit}
                  onChange={(e) => setNewStorageLimit(e.target.value)}
                  placeholder="Ej: 10"
                  className="w-full"
                />
                <p className="text-xs text-nuvia-deep/60">
                  Actualmente: {selectedUser?.storageUsed.toFixed(2)} GB / {selectedUser?.storageLimit} GB
                </p>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowStorageDialog(false);
                  setNewStorageLimit("");
                }}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleUpdateStorage}
                disabled={!newStorageLimit || parseFloat(newStorageLimit) < 1}
                className="w-full sm:w-auto bg-gradient-to-r from-nuvia-mauve to-nuvia-rose hover:shadow-nuvia-glow"
              >
                Actualizar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Admin;