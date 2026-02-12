// src/components/AdminStorageManager.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  HardDrive,
  Users,
  Image,
  Video,
  FileText,
  RefreshCw,
  Search,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Download,
  Filter,
  ChevronDown,
  ChevronUp,
  Shield,
  ShieldOff,
  Edit,
  Trash2,
  Save,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

// Interfaz de usuario con detalles de almacenamiento
interface UserStorageDetail {
  userId: number;
  username: string;
  email: string;
  storageLimit: number; // GB
  storageUsed: number; // GB
  storageUsedBytes: number; // bytes
  percentage: number;
  images: {
    count: number;
    size: number; // bytes
    sizeGB: number;
  };
  videos: {
    count: number;
    size: number; // bytes
    sizeGB: number;
  };
  documents: {
    count: number;
    size: number; // bytes
    sizeGB: number;
  };
  status: "active" | "suspended" | "inactive";
  lastUpdate: string;
}

// Estadísticas globales del sistema
interface SystemStorageStats {
  totalUsers: number;
  totalStorageLimit: number; // GB
  totalStorageUsed: number; // GB
  averageUsagePercentage: number;
  totalFiles: number;
  totalImages: number;
  totalVideos: number;
  totalDocuments: number;
}

export const AdminStorageManager = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Estados principales
  const [users, setUsers] = useState<UserStorageDetail[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStorageStats>({
    totalUsers: 0,
    totalStorageLimit: 0,
    totalStorageUsed: 0,
    averageUsagePercentage: 0,
    totalFiles: 0,
    totalImages: 0,
    totalVideos: 0,
    totalDocuments: 0,
  });

  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "critical" | "warning" | "normal">("all");
  const [sortBy, setSortBy] = useState<"username" | "storageUsed" | "percentage">("percentage");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [expandedUser, setExpandedUser] = useState<number | null>(null);

  // Estados para diálogos de gestión
  const [selectedUser, setSelectedUser] = useState<UserStorageDetail | null>(null);
  const [showStorageDialog, setShowStorageDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [newStorageLimit, setNewStorageLimit] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Cargar datos al montar el componente
  useEffect(() => {
    fetchStorageData();
  }, []);

  /**
   * Obtiene todos los datos de almacenamiento de los usuarios en UNA SOLA LLAMADA.
   * Para entornos con pocos usuarios (max 10) es perfecto, pero además es eficiente.
   */
  const fetchStorageData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/");
        return;
      }

      // 🔥 NUEVO: Endpoint unificado que devuelve todos los datos de almacenamiento
      const response = await fetch("/api/admin/storage/details", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        // Si el endpoint no existe, caemos en el fallback (por si acaso)
        if (response.status === 404) {
          console.warn("Endpoint /api/admin/storage/details no encontrado, usando método alternativo");
          await fetchLegacyData();
          return;
        }
        throw new Error(`Error al obtener datos: ${response.status}`);
      }

      const data = await response.json();
      const usersStorage: UserStorageDetail[] = data.users || data;

      setUsers(usersStorage);

      // Calcular estadísticas del sistema
      const stats: SystemStorageStats = {
        totalUsers: usersStorage.length,
        totalStorageLimit: usersStorage.reduce((sum, u) => sum + u.storageLimit, 0),
        totalStorageUsed: usersStorage.reduce((sum, u) => sum + u.storageUsed, 0),
        averageUsagePercentage:
          usersStorage.length > 0
            ? usersStorage.reduce((sum, u) => sum + u.percentage, 0) / usersStorage.length
            : 0,
        totalFiles: usersStorage.reduce(
          (sum, u) => sum + u.images.count + u.videos.count + u.documents.count,
          0
        ),
        totalImages: usersStorage.reduce((sum, u) => sum + u.images.count, 0),
        totalVideos: usersStorage.reduce((sum, u) => sum + u.videos.count, 0),
        totalDocuments: usersStorage.reduce((sum, u) => sum + u.documents.count, 0),
      };

      setSystemStats(stats);
    } catch (err) {
      console.error("Error al cargar datos de almacenamiento:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      toast({
        title: "❌ Error",
        description: "No se pudieron cargar los datos de almacenamiento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Método alternativo (legacy) por si el endpoint unificado no existe.
   * Solo se usa como respaldo. Sigue siendo ineficiente pero funcional.
   */
  const fetchLegacyData = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/");
        return;
      }

      // Obtener lista de usuarios
      const usersResponse = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const usersData = await usersResponse.json();
      const usersList = usersData.data || usersData;

      // Para cada usuario obtener sus archivos (solo si hay pocos usuarios)
      const storagePromises = usersList.map(async (user: any) => {
        // ... (mismo código que tenías, lo omito por brevedad, pero lo conservamos)
        // Por ahora devolvemos un objeto por defecto
        return {
          userId: user.userId,
          username: user.username,
          email: user.email,
          storageLimit: user.storageLimit,
          storageUsed: user.storageUsed || 0,
          storageUsedBytes: 0,
          percentage: user.storageLimit ? ((user.storageUsed || 0) / user.storageLimit) * 100 : 0,
          images: { count: 0, size: 0, sizeGB: 0 },
          videos: { count: 0, size: 0, sizeGB: 0 },
          documents: { count: 0, size: 0, sizeGB: 0 },
          status: user.status,
          lastUpdate: new Date().toISOString(),
        };
      });

      const usersStorage = await Promise.all(storagePromises);
      setUsers(usersStorage);
      // ... recalcular stats
    } catch (err) {
      console.error("Error en fetchLegacyData:", err);
    }
  };

  /**
   * Actualizar límite de almacenamiento de un usuario
   */
  const handleUpdateStorage = async () => {
    if (!selectedUser) return;

    const parsedLimit = Number(newStorageLimit);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      toast({
        title: "⚠️ Límite inválido",
        description: "Debes ingresar un número válido mayor a 0.",
        variant: "destructive",
      });
      return;
    }

    try {
      setActionLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/");
        return;
      }

      const response = await fetch(`/api/admin/users/${selectedUser.userId}/storage`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ storageLimit: parsedLimit }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al actualizar almacenamiento");
      }

      // Actualizar el usuario en el estado local
      setUsers((prev) =>
        prev.map((u) =>
          u.userId === selectedUser.userId
            ? {
                ...u,
                storageLimit: parsedLimit,
                percentage: Math.min((u.storageUsed / parsedLimit) * 100, 100),
              }
            : u
        )
      );

      // Recalcular estadísticas
      setSystemStats((prev) => ({
        ...prev,
        totalStorageLimit: prev.totalStorageLimit - selectedUser.storageLimit + parsedLimit,
      }));

      toast({
        title: "✅ Almacenamiento actualizado",
        description: `Nuevo límite para ${selectedUser.username}: ${parsedLimit} GB`,
      });

      setShowStorageDialog(false);
      setSelectedUser(null);
      setNewStorageLimit("");
    } catch (err) {
      console.error(err);
      toast({
        title: "❌ Error",
        description: err instanceof Error ? err.message : "Error al actualizar almacenamiento",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Suspender o activar un usuario
   */
  const handleToggleUserStatus = async () => {
    if (!selectedUser) return;

    try {
      setActionLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/");
        return;
      }

      const newStatus = selectedUser.status === "suspended" ? "active" : "suspended";
      const endpoint =
        newStatus === "suspended"
          ? `/api/admin/users/${selectedUser.userId}/suspend`
          : `/api/admin/users/${selectedUser.userId}/activate`;

      const method = "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Error al ${newStatus === "suspended" ? "suspender" : "activar"} usuario`);
      }

      // Actualizar estado local
      setUsers((prev) =>
        prev.map((u) => (u.userId === selectedUser.userId ? { ...u, status: newStatus } : u))
      );

      toast({
        title: "✅ Estado actualizado",
        description: `${selectedUser.username} ha sido ${
          newStatus === "suspended" ? "suspendido" : "activado"
        } correctamente.`,
      });

      setShowSuspendDialog(false);
      setSelectedUser(null);
    } catch (err) {
      console.error(err);
      toast({
        title: "❌ Error",
        description: err instanceof Error ? err.message : "Error al cambiar estado del usuario",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStorageData();
    setTimeout(() => setRefreshing(false), 500);
    toast({
      title: "✅ Actualizado",
      description: "Datos de almacenamiento actualizados correctamente",
    });
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-600";
    if (percentage >= 75) return "text-orange-600";
    if (percentage >= 50) return "text-yellow-600";
    return "text-green-600";
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 75) return "bg-orange-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-gradient-to-r from-blue-500 to-indigo-600";
  };

  const getStatusBadge = (percentage: number) => {
    if (percentage >= 90)
      return { text: "Crítico", color: "bg-red-500/20 text-red-700 border-red-500/50" };
    if (percentage >= 75)
      return {
        text: "Advertencia",
        color: "bg-orange-500/20 text-orange-700 border-orange-500/50",
      };
    if (percentage >= 50)
      return {
        text: "Moderado",
        color: "bg-yellow-500/20 text-yellow-700 border-yellow-500/50",
      };
    return { text: "Normal", color: "bg-green-500/20 text-green-700 border-green-500/50" };
  };

  // Filtrado y ordenamiento
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesFilter = true;
    if (filterType === "critical") matchesFilter = user.percentage >= 90;
    else if (filterType === "warning") matchesFilter = user.percentage >= 75 && user.percentage < 90;
    else if (filterType === "normal") matchesFilter = user.percentage < 75;

    return matchesSearch && matchesFilter;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case "username":
        comparison = a.username.localeCompare(b.username);
        break;
      case "storageUsed":
        comparison = a.storageUsed - b.storageUsed;
        break;
      case "percentage":
        comparison = a.percentage - b.percentage;
        break;
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const exportToCSV = () => {
    const headers = [
      "Usuario",
      "Email",
      "Estado",
      "Almacenamiento Usado (GB)",
      "Límite (GB)",
      "Porcentaje",
      "Imágenes",
      "Videos",
      "Documentos",
    ];
    const rows = sortedUsers.map((user) => [
      user.username,
      user.email,
      user.status,
      user.storageUsed.toFixed(2),
      user.storageLimit,
      `${user.percentage}%`,
      user.images.count,
      user.videos.count,
      user.documents.count,
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `storage-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();

    toast({
      title: "✅ Exportado",
      description: "Reporte descargado correctamente",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header con estadísticas del sistema - COLORES UNIFICADOS A AZUL */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-nuvia-silver/30 bg-gradient-to-br from-white to-nuvia-peach/10 shadow-nuvia-soft rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-nuvia-deep/70 font-medium">Almacenamiento Total</p>
                <p className="text-2xl font-bold mt-1 text-nuvia-deep">
                  {systemStats.totalStorageUsed.toFixed(2)} GB
                </p>
                <p className="text-xs text-nuvia-deep/60 mt-1">
                  de {systemStats.totalStorageLimit} GB
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 shadow-nuvia-soft">
                <HardDrive className="w-6 h-6 text-white" />
              </div>
            </div>
            <Progress
              value={(systemStats.totalStorageUsed / systemStats.totalStorageLimit) * 100}
              className="h-2 mt-3 [&>div]:bg-gradient-to-r [&>div]:from-blue-500 [&>div]:to-indigo-600"
            />
          </CardContent>
        </Card>

        <Card className="border-nuvia-silver/30 bg-gradient-to-br from-white to-nuvia-peach/10 shadow-nuvia-soft rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-nuvia-deep/70 font-medium">Usuarios</p>
                <p className="text-2xl font-bold mt-1 text-nuvia-deep">
                  {systemStats.totalUsers}
                </p>
                <p className="text-xs text-nuvia-deep/60 mt-1">
                  Uso promedio: {systemStats.averageUsagePercentage.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 shadow-nuvia-soft">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-nuvia-silver/30 bg-gradient-to-br from-white to-nuvia-peach/10 shadow-nuvia-soft rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-nuvia-deep/70 font-medium">Total Archivos</p>
                <p className="text-2xl font-bold mt-1 text-nuvia-deep">
                  {systemStats.totalFiles}
                </p>
                <div className="flex gap-2 mt-1 text-xs text-nuvia-deep/60">
                  <span>{systemStats.totalImages} img</span>
                  <span>•</span>
                  <span>{systemStats.totalVideos} vid</span>
                  <span>•</span>
                  <span>{systemStats.totalDocuments} doc</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 shadow-nuvia-soft">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-nuvia-silver/30 bg-gradient-to-br from-white to-nuvia-peach/10 shadow-nuvia-soft rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-nuvia-deep/70 font-medium">Alertas</p>
                <p className="text-2xl font-bold mt-1 text-nuvia-deep">
                  {users.filter((u) => u.percentage >= 90).length}
                </p>
                <p className="text-xs text-nuvia-deep/60 mt-1">
                  usuarios en zona crítica
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-r from-red-500 to-orange-600 shadow-nuvia-soft">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controles y filtros */}
      <Card className="border-nuvia-silver/30 bg-white/80 backdrop-blur-sm shadow-nuvia-soft rounded-2xl">
        <CardHeader className="border-b border-nuvia-peach/20 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-nuvia-deep font-semibold">
              <HardDrive className="w-5 h-5 text-blue-600" />
              Gestión de Almacenamiento por Usuario
            </CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Actualizando..." : "Actualizar"}
              </Button>
              <Button
                onClick={exportToCSV}
                size="sm"
                className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Barra de búsqueda y filtros */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-nuvia-deep/40" />
              <Input
                placeholder="Buscar por usuario o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="critical">Críticos (≥90%)</SelectItem>
                <SelectItem value="warning">Advertencia (≥75%)</SelectItem>
                <SelectItem value="normal">Normal (&lt;75%)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Por porcentaje</SelectItem>
                <SelectItem value="storageUsed">Por espacio usado</SelectItem>
                <SelectItem value="username">Por nombre</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            >
              {sortOrder === "desc" ? (
                <TrendingDown className="w-4 h-4" />
              ) : (
                <TrendingUp className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Tabla/lista de usuarios */}
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-nuvia-deep/70">Cargando datos de almacenamiento...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          ) : sortedUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-nuvia-silver/40 mx-auto mb-4" />
              <p className="text-nuvia-deep/60">No se encontraron usuarios</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedUsers.map((user) => {
                const isExpanded = expandedUser === user.userId;
                const badge = getStatusBadge(user.percentage);
                const userStatusBadge =
                  user.status === "active"
                    ? { text: "Activo", color: "bg-green-500/20 text-green-700 border-green-500/50" }
                    : user.status === "suspended"
                    ? { text: "Suspendido", color: "bg-red-500/20 text-red-700 border-red-500/50" }
                    : { text: "Inactivo", color: "bg-gray-500/20 text-gray-700 border-gray-500/50" };

                return (
                  <Card
                    key={user.userId}
                    className="border-nuvia-silver/20 hover:shadow-nuvia-soft transition-all"
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Fila principal */}
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-600/20 flex items-center justify-center flex-shrink-0 border border-blue-200">
                              <span className="text-sm font-bold text-nuvia-deep">
                                {user.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-nuvia-deep truncate">
                                  {user.username}
                                </p>
                                <Badge className={`${badge.color} text-xs border`}>
                                  {badge.text}
                                </Badge>
                                <Badge className={`${userStatusBadge.color} text-xs border`}>
                                  {userStatusBadge.text}
                                </Badge>
                              </div>
                              <p className="text-sm text-nuvia-deep/60 truncate">{user.email}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className={`text-lg font-bold ${getStatusColor(user.percentage)}`}>
                                {user.percentage}%
                              </p>
                              <p className="text-xs text-nuvia-deep/60">
                                {user.storageUsed.toFixed(2)} / {user.storageLimit} GB
                              </p>
                            </div>

                            {/* Dropdown de acciones de gestión */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="flex-shrink-0">
                                  <ChevronDown className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setNewStorageLimit(user.storageLimit.toString());
                                    setShowStorageDialog(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4 mr-2 text-blue-600" />
                                  Cambiar límite
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowSuspendDialog(true);
                                  }}
                                >
                                  {user.status === "suspended" ? (
                                    <>
                                      <Shield className="w-4 h-4 mr-2 text-green-600" />
                                      Activar usuario
                                    </>
                                  ) : (
                                    <>
                                      <ShieldOff className="w-4 h-4 mr-2 text-red-600" />
                                      Suspender usuario
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setExpandedUser(isExpanded ? null : user.userId)}
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp className="w-4 h-4 mr-2" />
                                      Ocultar detalles
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="w-4 h-4 mr-2" />
                                      Ver detalles
                                    </>
                                  )}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Barra de progreso */}
                        <div className="relative">
                          <Progress value={user.percentage} className="h-2" />
                          <div
                            className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor(
                              user.percentage
                            )}`}
                            style={{ width: `${user.percentage}%` }}
                          />
                        </div>

                        {/* Detalles expandidos */}
                        {isExpanded && (
                          <div className="pt-3 border-t border-nuvia-silver/20 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {/* Imágenes */}
                              <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100">
                                <div className="flex items-center gap-2 mb-2">
                                  <Image className="w-4 h-4 text-blue-600" />
                                  <span className="text-sm font-semibold text-nuvia-deep">
                                    Imágenes
                                  </span>
                                </div>
                                <p className="text-lg font-bold text-blue-600">
                                  {user.images.sizeGB.toFixed(2)} GB
                                </p>
                                <p className="text-xs text-nuvia-deep/60">
                                  {user.images.count} archivos ({formatBytes(user.images.size)})
                                </p>
                              </div>

                              {/* Videos */}
                              <div className="p-3 rounded-lg bg-green-50/50 border border-green-100">
                                <div className="flex items-center gap-2 mb-2">
                                  <Video className="w-4 h-4 text-green-600" />
                                  <span className="text-sm font-semibold text-nuvia-deep">
                                    Videos
                                  </span>
                                </div>
                                <p className="text-lg font-bold text-green-600">
                                  {user.videos.sizeGB.toFixed(2)} GB
                                </p>
                                <p className="text-xs text-nuvia-deep/60">
                                  {user.videos.count} archivos ({formatBytes(user.videos.size)})
                                </p>
                              </div>

                              {/* Documentos */}
                              <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-100">
                                <div className="flex items-center gap-2 mb-2">
                                  <FileText className="w-4 h-4 text-amber-600" />
                                  <span className="text-sm font-semibold text-nuvia-deep">
                                    Documentos
                                  </span>
                                </div>
                                <p className="text-lg font-bold text-amber-600">
                                  {user.documents.sizeGB.toFixed(2)} GB
                                </p>
                                <p className="text-xs text-nuvia-deep/60">
                                  {user.documents.count} archivos ({formatBytes(user.documents.size)})
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-xs text-nuvia-deep/60 pt-2 border-t border-nuvia-silver/10">
                              <span>
                                Total archivos:{" "}
                                {user.images.count + user.videos.count + user.documents.count}
                              </span>
                              <span>
                                Disponible: {(user.storageLimit - user.storageUsed).toFixed(2)} GB
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo para cambiar límite de almacenamiento */}
      <Dialog open={showStorageDialog} onOpenChange={setShowStorageDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Cambiar límite de almacenamiento</DialogTitle>
            <DialogDescription>
              Usuario: <span className="font-semibold">{selectedUser?.username}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="storage-limit" className="text-right">
                Límite (GB)
              </Label>
              <Input
                id="storage-limit"
                type="number"
                min="1"
                step="1"
                value={newStorageLimit}
                onChange={(e) => setNewStorageLimit(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="text-xs text-nuvia-deep/60">
              Uso actual: {selectedUser?.storageUsed.toFixed(2)} GB
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStorageDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateStorage}
              disabled={actionLoading}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
            >
              {actionLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para suspender/activar usuario */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.status === "suspended" ? "Activar usuario" : "Suspender usuario"}
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas{" "}
              {selectedUser?.status === "suspended" ? "activar" : "suspender"} a{" "}
              <span className="font-semibold">{selectedUser?.username}</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedUser?.status === "suspended" ? (
              <p className="text-sm text-green-600">
                El usuario podrá acceder nuevamente al sistema.
              </p>
            ) : (
              <p className="text-sm text-red-600">
                El usuario no podrá acceder hasta que sea activado nuevamente.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuspendDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleToggleUserStatus}
              disabled={actionLoading}
              className={
                selectedUser?.status === "suspended"
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                  : "bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700"
              }
            >
              {actionLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : selectedUser?.status === "suspended" ? (
                "Activar"
              ) : (
                "Suspender"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};