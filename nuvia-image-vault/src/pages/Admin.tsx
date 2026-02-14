import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { StorageIndicator } from "@/components/ui/storageIndicator";
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
  Clock,
  Upload,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { API_CONFIG } from "@/config/api.config";

// Interfaz de Usuario
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

// Estadísticas del admin
interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalStorage: number; // en GB
  usedStorage: number; // en GB
  totalImages: number;
  totalVideos: number;
  uploadsToday: number;
  systemHealth: number;
}

const BTN_PRIMARY =
  "!bg-nuvia-deep !text-white border border-white/10 shadow-nuvia-soft hover:!bg-nuvia-peach hover:!text-nuvia-deep hover:border-nuvia-peach/40 transition-all h-10 px-4";

// Componente interno para gestión de almacenamiento
interface StorageUser {
  id: string;
  username: string;
  email: string;
  storageUsed: number;
  storageLimit: number;
  totalImages: number;
  totalVideos: number;
}

interface StorageManagementProps {
  users: User[];
  loading: boolean;
  fetchAdminData: () => void;
}

const StorageManagementContent = ({ users, loading, fetchAdminData }: StorageManagementProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState<"all" | "high" | "medium" | "low">("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const getUsageLevel = (percentage: number): "high" | "medium" | "low" => {
    if (percentage >= 80) return "high";
    if (percentage >= 50) return "medium";
    return "low";
  };

  const getUsageBadge = (percentage: number) => {
    const level = getUsageLevel(percentage);
    const config = {
      high: {
        label: "Crítico",
        className: "bg-red-500/20 text-red-700 border-red-500/50",
        icon: <AlertCircle className="w-3 h-3 mr-1" />,
      },
      medium: {
        label: "Medio",
        className: "bg-yellow-500/20 text-yellow-700 border-yellow-500/50",
        icon: <TrendingUp className="w-3 h-3 mr-1" />,
      },
      low: {
        label: "Normal",
        className: "bg-green-500/20 text-green-700 border-green-500/50",
        icon: <HardDrive className="w-3 h-3 mr-1" />,
      },
    };

    const { label, className, icon } = config[level];

    return (
      <Badge className={`${className} text-xs flex items-center w-fit`}>
        {icon}
        {label}
      </Badge>
    );
  };

  const storageUsers: StorageUser[] = users.map((user) => ({
    ...user,
    percentageUsed: (user.storageUsed / user.storageLimit) * 100,
  }));

  const filteredUsers = storageUsers.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterBy === "all") return matchesSearch;

    const percentage = (user.storageUsed / user.storageLimit) * 100;
    const level = getUsageLevel(percentage);
    return matchesSearch && level === filterBy;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const percentageA = (a.storageUsed / a.storageLimit) * 100;
    const percentageB = (b.storageUsed / b.storageLimit) * 100;
    const comparison = percentageA - percentageB;
    return sortOrder === "asc" ? comparison : -comparison;
  });

  return (
    <div className="space-y-4">
      {/* 4 Cards principales de estadísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium truncate">Total Usuarios</p>
                <p className="text-xl md:text-2xl lg:text-3xl font-bold mt-1 md:mt-2 text-nuvia-deep">
                  {users.length}
                </p>
              </div>
              <div className="p-2 md:p-3 rounded-lg bg-gradient-to-br from-nuvia-mauve to-nuvia-rose shadow-nuvia-soft flex-shrink-0">
                <Users className="w-4 h-4 md:w-6 md:h-6 text-white" />
              </div>
            </div>
            <div className="mt-2">
              <Badge variant="secondary" className="text-xs">
                {sortedUsers.length} en vista
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium truncate">Almacenamiento Total</p>
                <p className="text-xl md:text-2xl lg:text-3xl font-bold mt-1 md:mt-2 text-nuvia-deep">
                  {users.reduce((acc, user) => acc + user.storageUsed, 0).toFixed(1)} GB
                </p>
              </div>
              <div className="p-2 md:p-3 rounded-lg bg-gradient-to-br from-nuvia-mauve to-nuvia-rose shadow-nuvia-soft flex-shrink-0">
                <HardDrive className="w-4 h-4 md:w-6 md:h-6 text-white" />
              </div>
            </div>
            <div className="mt-2">
              <div className="w-full bg-nuvia-silver/30 rounded-full h-1.5">
                <div
                  className="bg-gradient-to-r from-nuvia-mauve to-nuvia-rose h-1.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min((users.reduce((acc, user) => acc + user.storageUsed, 0) / users.reduce((acc, user) => acc + user.storageLimit, 0)) * 100, 100)}%`,
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
                <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium truncate">Total Archivos</p>
                <p className="text-xl md:text-2xl lg:text-3xl font-bold mt-1 md:mt-2 text-nuvia-deep">
                  {users.reduce((acc, user) => acc + user.totalImages + user.totalVideos, 0)}
                </p>
              </div>
              <div className="p-2 md:p-3 rounded-lg bg-gradient-to-br from-nuvia-mauve to-nuvia-rose shadow-nuvia-soft flex-shrink-0">
                <Database className="w-4 h-4 md:w-6 md:h-6 text-white" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-nuvia-deep/60 flex-wrap">
              <span>{users.reduce((acc, user) => acc + user.totalImages, 0)} img</span>
              <span>•</span>
              <span>{users.reduce((acc, user) => acc + user.totalVideos, 0)} vid</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium truncate">Alertas</p>
                <p className="text-xl md:text-2xl lg:text-3xl font-bold mt-1 md:mt-2 text-nuvia-deep">
                  {storageUsers.filter((u) => (u.storageUsed / u.storageLimit) * 100 >= 80).length}
                </p>
              </div>
              <div className="p-2 md:p-3 rounded-lg bg-gradient-to-br from-nuvia-mauve to-nuvia-rose shadow-nuvia-soft flex-shrink-0">
                <AlertCircle className="w-4 h-4 md:w-6 md:h-6 text-white" />
              </div>
            </div>
            <div className="mt-2">
              <Badge variant="secondary" className="text-xs bg-red-500/20 text-red-700">
                Uso crítico ≥80%
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="space-y-3">
        {/* Buscador */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nuvia-mauve/60" />
          <Input
            placeholder="Buscar por usuario o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 bg-white/50 border-nuvia-silver/30 focus:border-nuvia-mauve w-full text-nuvia-deep placeholder:text-nuvia-mauve/50"
          />
        </div>

        {/* Controles en fila */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
            <SelectTrigger className={`${BTN_PRIMARY}`}>
              <Filter className="w-4 h-4 mr-2 flex-shrink-0" />
              <SelectValue placeholder="Filtrar por uso" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los usuarios</SelectItem>
              <SelectItem value="high">Uso crítico (≥80%)</SelectItem>
              <SelectItem value="medium">Uso medio (50-79%)</SelectItem>
              <SelectItem value="low">Uso normal (&lt;50%)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
            <SelectTrigger className={`${BTN_PRIMARY} col-span-1 sm:col-span-1 lg:col-span-2`}>
              <ArrowUpDown className="w-4 h-4 mr-2 flex-shrink-0" />
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Mayor a menor uso</SelectItem>
              <SelectItem value="asc">Menor a mayor uso</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={fetchAdminData}
            disabled={loading}
            variant="outline"
            className={`${BTN_PRIMARY}`}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-lg border border-red-200 bg-red-50/50">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium text-red-800">Uso Crítico</span>
          </div>
          <div className="text-2xl font-bold text-red-900 mt-1">
            {storageUsers.filter((u) => (u.storageUsed / u.storageLimit) * 100 >= 80).length}
          </div>
          <div className="text-xs text-red-700">≥80% de capacidad</div>
        </div>

        <div className="p-3 rounded-lg border border-yellow-200 bg-yellow-50/50">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">Uso Medio</span>
          </div>
          <div className="text-2xl font-bold text-yellow-900 mt-1">
            {storageUsers.filter((u) => {
              const pct = (u.storageUsed / u.storageLimit) * 100;
              return pct >= 50 && pct < 80;
            }).length}
          </div>
          <div className="text-xs text-yellow-700">50-79% de capacidad</div>
        </div>

        <div className="p-3 rounded-lg border border-green-200 bg-green-50/50">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">Uso Normal</span>
          </div>
          <div className="text-2xl font-bold text-green-900 mt-1">
            {storageUsers.filter((u) => (u.storageUsed / u.storageLimit) * 100 < 50).length}
          </div>
          <div className="text-xs text-green-700">&lt;50% de capacidad</div>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto -mx-4 md:-mx-6 px-4 md:px-6">
        <Table className="text-sm">
          <TableHeader>
            <TableRow className="border-nuvia-silver/20">
              <TableHead className="text-nuvia-deep/70 whitespace-nowrap">Usuario</TableHead>
              <TableHead className="text-nuvia-deep/70 whitespace-nowrap hidden md:table-cell">Email</TableHead>
              <TableHead className="text-nuvia-deep/70 whitespace-nowrap">Almacenamiento</TableHead>
              <TableHead className="text-nuvia-deep/70 whitespace-nowrap">% Usado</TableHead>
              <TableHead className="text-nuvia-deep/70 whitespace-nowrap">Estado</TableHead>
              <TableHead className="text-nuvia-deep/70 whitespace-nowrap hidden lg:table-cell">Archivos</TableHead>
            </TableRow>
          </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-nuvia-mauve" />
                      <span className="text-nuvia-deep/60">Cargando datos...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-nuvia-deep/60">
                    No se encontraron usuarios
                  </TableCell>
                </TableRow>
              ) : (
                sortedUsers.map((user) => {
                  const percentage = (user.storageUsed / user.storageLimit) * 100;
                  return (
                    <TableRow key={user.id} className="border-nuvia-silver/10 hover:bg-nuvia-peach/10">
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-nuvia-mauve/20 to-nuvia-rose/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-semibold text-nuvia-deep">
                                {user.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="truncate max-w-[120px] font-medium">{user.username}</span>
                          </div>
                          {/* Email visible solo en móvil */}
                          <span className="text-xs text-nuvia-deep/60 truncate max-w-[180px] md:hidden">
                            {user.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[180px] max-w-[220px] truncate hidden md:table-cell">{user.email}</TableCell>
                      <TableCell>
                        <div className="text-sm min-w-[100px]">
                          <div className="font-medium whitespace-nowrap text-xs">
                            {user.storageUsed.toFixed(2)} / {user.storageLimit} GB
                          </div>
                          <div className="w-20 bg-nuvia-silver/30 rounded-full h-2 mt-1">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                percentage >= 80
                                  ? "bg-red-500"
                                  : percentage >= 50
                                  ? "bg-yellow-500"
                                  : "bg-gradient-to-r from-nuvia-mauve to-nuvia-rose"
                              }`}
                              style={{
                                width: `${Math.min(percentage, 100)}%`,
                              }}
                            />
                          </div>
                          {/* Mostrar archivos en móvil dentro de esta celda */}
                          <div className="flex items-center gap-3 mt-1 lg:hidden">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-nuvia-mauve">📷 {user.totalImages}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-nuvia-rose">🎥 {user.totalVideos}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-nuvia-deep whitespace-nowrap text-sm">
                          {percentage.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>{getUsageBadge(percentage)}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex flex-col gap-1 text-xs whitespace-nowrap">
                          <span className="text-nuvia-mauve">📷 {user.totalImages} imágenes</span>
                          <span className="text-nuvia-rose">🎥 {user.totalVideos} videos</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

      {/* Resumen y botón de exportar */}
      {sortedUsers.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-nuvia-silver/20">
          <div className="text-sm text-nuvia-deep/70 text-center sm:text-left">
            Mostrando {sortedUsers.length} de {users.length} usuarios
          </div>
          
          <Button
            onClick={() => {
              // Exportar datos a CSV
              const headers = ['Usuario', 'Email', 'Almacenamiento Usado (GB)', 'Límite (GB)', '% Usado', 'Imágenes', 'Videos'];
              const rows = users.map(user => [
                user.username,
                user.email,
                user.storageUsed.toFixed(2),
                user.storageLimit,
                ((user.storageUsed / user.storageLimit) * 100).toFixed(1),
                user.totalImages,
                user.totalVideos
              ]);
              
              const csvContent = [
                headers.join(','),
                ...rows.map(row => row.join(','))
              ].join('\n');
              
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `almacenamiento-usuarios-${new Date().toISOString().split('T')[0]}.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            }}
            variant="outline"
            className={`w-full sm:w-auto ${BTN_PRIMARY}`}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      )}
    </div>
  );
};

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Estados principales
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
  const [error, setError] = useState<string | null>(null);

  // Filtros y ordenamiento
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Paginación
  const [usersPerPage, setUsersPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Diálogos
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showStorageDialog, setShowStorageDialog] = useState(false);
  const [newStorageLimit, setNewStorageLimit] = useState("");

  // Tabs
  const [activeTab, setActiveTab] = useState("overview");

  // ------------------------------------------------------------------
  // Autenticación y carga inicial
  // ------------------------------------------------------------------
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const userRole = localStorage.getItem("userRole");

    if (!token) {
      navigate("/");
      return;
    }
    if (userRole !== "admin") {
      navigate("/home");
      return;
    }
    fetchAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------------------------
  // Obtener datos del admin (estadísticas y usuarios)
  // ------------------------------------------------------------------
  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/");
        return;
      }

      // Estadísticas
      const statsResponse = await fetch(`${API_CONFIG.BASE_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!statsResponse.ok) throw new Error("Error al cargar estadísticas");
      const statsData = await statsResponse.json();
      setStats(statsData.data || statsData);

      // Usuarios
      const usersResponse = await fetch(`${API_CONFIG.BASE_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!usersResponse.ok) throw new Error("Error al cargar usuarios");
      const usersData = await usersResponse.json();
      const rawUsers = usersData.data || usersData;
      const formattedUsers = rawUsers.map((user: any) => ({
        ...user,
        id: user.id || user.userId?.toString() || String(user.userId),
        storageUsed: Number(user.storageUsed) || 0,
        storageLimit: Number(user.storageLimit) || 5,
        totalImages: Number(user.totalImages) || 0,
        totalVideos: Number(user.totalVideos) || 0,
      }));
      setUsers(formattedUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de administración",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------------
  // Handlers de usuarios
  // ------------------------------------------------------------------
  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setShowUserDialog(true);
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_CONFIG.BASE_URL}/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Error al eliminar usuario");
      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido eliminado permanentemente",
      });
      setShowDeleteDialog(false);
      fetchAdminData();
    } catch {
      toast({
        title: "Error",
        description: "No se pudo eliminar el usuario",
        variant: "destructive",
      });
    }
  };

  const handleSuspendUser = async (userId: string, suspend: boolean) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_CONFIG.BASE_URL}/admin/users/${userId}/suspend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ suspend }),
      });
      if (!response.ok) throw new Error("Error al cambiar estado");
      toast({
        title: suspend ? "Usuario suspendido" : "Usuario activado",
        description: suspend ? "El usuario ha sido suspendido" : "El usuario ha sido reactivado",
      });
      setShowSuspendDialog(false);
      fetchAdminData();
    } catch {
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado del usuario",
        variant: "destructive",
      });
    }
  };

  const handleUpdateStorage = async () => {
    if (!selectedUser) return;
    const limit = parseFloat(newStorageLimit);
    if (isNaN(limit) || limit <= 0) {
      toast({
        title: "Error",
        description: "Ingrese un límite válido (número positivo)",
        variant: "destructive",
      });
      return;
    }
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_CONFIG.BASE_URL}/admin/users/${selectedUser.id}/storage`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ storageLimit: limit }),
      });
      if (!response.ok) throw new Error("Error al actualizar almacenamiento");
      toast({
        title: "Límite actualizado",
        description: `Nuevo límite: ${limit} GB`,
      });
      setShowStorageDialog(false);
      setNewStorageLimit("");
      fetchAdminData();
    } catch {
      toast({
        title: "Error",
        description: "No se pudo actualizar el límite",
        variant: "destructive",
      });
    }
  };

  const handleExportData = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_CONFIG.BASE_URL}/admin/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Error al exportar");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nuvia-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({
        title: "Exportación completada",
        description: "Los datos se han exportado correctamente",
      });
    } catch {
      toast({
        title: "Error",
        description: "No se pudo exportar los datos",
        variant: "destructive",
      });
    }
  };

  // ------------------------------------------------------------------
  // Lógica de filtrado y ordenamiento
  // ------------------------------------------------------------------
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

  // Paginación
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = sortedUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(sortedUsers.length / usersPerPage);

  // ------------------------------------------------------------------
  // Utilidades de formato
  // ------------------------------------------------------------------
  const formatDate = (dateString: string) => {
    if (!dateString) return "Nunca";
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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

  // ------------------------------------------------------------------
  // Renderizado
  // ------------------------------------------------------------------
  if (loading && users.length === 0) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-[60vh]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-nuvia-mauve border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-nuvia-mauve">Cargando panel de administración...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 sm:p-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-white flex items-center gap-2 sm:gap-3">
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-nuvia-peach flex-shrink-0" />
                <span className="break-words">Panel de Administración</span>
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-white/80 mt-1">
                Control total del sistema Nuvia
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                onClick={fetchAdminData}
                disabled={loading}
                variant="outline"
                className={`w-full sm:w-auto ${BTN_PRIMARY}`}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Actualizar
              </Button>

              <Button
                onClick={handleExportData}
                variant="outline"
                className={`w-full sm:w-auto ${BTN_PRIMARY}`}
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>

          {error && (
            <Alert className="border-red-500/50 bg-red-500/10">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-200 text-sm">{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto sm:h-12 bg-white/80 backdrop-blur-sm border border-nuvia-silver/30 rounded-xl p-1 gap-1">
            <TabsTrigger
              value="overview"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-nuvia-mauve data-[state=active]:to-nuvia-rose data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              <Database className="w-4 h-4 mr-2" />
              <span>Resumen</span>
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-nuvia-mauve data-[state=active]:to-nuvia-rose data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              <Users className="w-4 h-4 mr-2" />
              <span>Usuarios</span>
            </TabsTrigger>
            <TabsTrigger
              value="storage"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-nuvia-mauve data-[state=active]:to-nuvia-rose data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              <HardDrive className="w-4 h-4 mr-2" />
              <span>Sistema</span>
            </TabsTrigger>
            <TabsTrigger
              value="storage-manager"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-nuvia-mauve data-[state=active]:to-nuvia-rose data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              <span>Gestión</span>
            </TabsTrigger>
          </TabsList>

          {/* ========== PESTAÑA: RESUMEN ========== */}
          <TabsContent value="overview" className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="w-full sm:w-auto">
                <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-nuvia-peach" />
                  Resumen General
                </h2>
                <p className="text-xs sm:text-sm text-white/80">Vista general de estadísticas del sistema</p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium truncate">Total Usuarios</p>
                      <p className="text-xl md:text-2xl lg:text-3xl font-bold mt-1 md:mt-2 text-nuvia-deep">
                        {loading ? "..." : stats.totalUsers}
                      </p>
                    </div>
                    <div className="p-2 md:p-3 rounded-lg bg-gradient-to-br from-nuvia-mauve to-nuvia-rose shadow-nuvia-soft flex-shrink-0">
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
                      <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium truncate">Almacenamiento Total</p>
                      <p className="text-xl md:text-2xl lg:text-3xl font-bold mt-1 md:mt-2 text-nuvia-deep">
                        {loading ? "..." : `${stats.usedStorage}GB`}
                      </p>
                    </div>
                    <div className="p-2 md:p-3 rounded-lg bg-gradient-to-br from-nuvia-mauve to-nuvia-rose shadow-nuvia-soft flex-shrink-0">
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
                      <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium truncate">Total Multimedia</p>
                      <p className="text-xl md:text-2xl lg:text-3xl font-bold mt-1 md:mt-2 text-nuvia-deep">
                        {loading ? "..." : stats.totalImages + stats.totalVideos}
                      </p>
                    </div>
                    <div className="p-2 md:p-3 rounded-lg bg-gradient-to-br from-nuvia-mauve to-nuvia-rose shadow-nuvia-soft flex-shrink-0">
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
                      <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium truncate">Subidas Hoy</p>
                      <p className="text-xl md:text-2xl lg:text-3xl font-bold mt-1 md:mt-2 text-nuvia-deep">
                        {loading ? "..." : stats.uploadsToday}
                      </p>
                    </div>
                    <div className="p-2 md:p-3 rounded-lg bg-gradient-to-br from-nuvia-mauve to-nuvia-rose shadow-nuvia-soft flex-shrink-0">
                      <Upload className="w-4 h-4 md:w-6 md:h-6 text-white" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {stats.totalImages + stats.totalVideos} en total
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/80 to-nuvia-silver/10 shadow-nuvia-medium rounded-2xl">
              <CardHeader className="border-b border-nuvia-peach/20 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5 p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-nuvia-deep font-semibold text-base md:text-lg">
                  <Users className="w-5 h-5 text-nuvia-mauve" />
                  Vista Rápida de Usuarios
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                <div className="overflow-x-auto">
                  <Table className="text-sm">
                    <TableHeader>
                      <TableRow className="border-nuvia-silver/20">
                        <TableHead className="text-nuvia-deep/70">Usuario</TableHead>
                        <TableHead className="text-nuvia-deep/70">Estado</TableHead>
                        <TableHead className="text-nuvia-deep/70">Almacenamiento</TableHead>
                        <TableHead className="text-nuvia-deep/70">Multimedia</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedUsers.slice(0, 5).map((user) => (
                        <TableRow key={user.id} className="border-nuvia-silver/10">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-nuvia-mauve/20 to-nuvia-rose/20 flex items-center justify-center">
                                <span className="text-sm font-semibold text-nuvia-deep">
                                  {user.username.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span className="truncate max-w-[140px]">{user.username}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getStatusColor(user.status)} text-xs`}>{getStatusText(user.status)}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {user.storageUsed.toFixed(1)} / {user.storageLimit} GB
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-nuvia-mauve">{user.totalImages} img</span>
                              <span className="text-nuvia-rose">{user.totalVideos} vid</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 text-center">
                  <Button
                    variant="ghost"
                    onClick={() => setActiveTab("users")}
                    className="text-nuvia-mauve hover:text-nuvia-rose"
                  >
                    Ver todos los usuarios ({sortedUsers.length})
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== PESTAÑA: USUARIOS ========== */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="w-full sm:w-auto">
                <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-nuvia-peach" />
                  Gestión de Usuarios
                </h2>
                <p className="text-xs sm:text-sm text-white/80">Administración y control de cuentas de usuario</p>
              </div>
            </div>

            <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/80 to-nuvia-silver/10 shadow-nuvia-medium rounded-2xl">
              <CardContent className="p-4 md:p-6 space-y-4">
                {/* Toolbar responsive */}
                <div className="space-y-3">
                  {/* Barra de búsqueda */}
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nuvia-mauve/60" />
                    <Input
                      placeholder="Buscar por nombre o email..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-10 h-10 bg-white/50 border-nuvia-silver/30 focus:border-nuvia-mauve w-full"
                    />
                  </div>

                  {/* Controles en fila */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    <Select
                      value={filterStatus}
                      onValueChange={(value) => {
                        setFilterStatus(value);
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className={`${BTN_PRIMARY}`}>
                        <Filter className="w-4 h-4 mr-2 flex-shrink-0" />
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="active">Activos</SelectItem>
                        <SelectItem value="suspended">Suspendidos</SelectItem>
                        <SelectItem value="inactive">Inactivos</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className={`${BTN_PRIMARY} col-span-1 sm:col-span-1 lg:col-span-2`}>
                        <ArrowUpDown className="w-4 h-4 mr-2 flex-shrink-0" />
                        <SelectValue placeholder="Ordenar por" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="createdAt">Fecha de registro</SelectItem>
                        <SelectItem value="username">Nombre</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="storageUsed">Almacenamiento</SelectItem>
                        <SelectItem value="totalImages">Cantidad de imágenes</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                      className={`${BTN_PRIMARY}`}
                      title="Cambiar orden"
                    >
                      <ArrowUpDown
                        className={`w-4 h-4 transition-transform ${sortOrder === "desc" ? "rotate-180" : ""}`}
                      />
                    </Button>
                  </div>
                </div>

                {/* Tabla con scroll horizontal */}
                <div className="overflow-x-auto -mx-4 md:-mx-6 px-4 md:px-6">
                  <Table className="text-sm">
                    <TableHeader>
                      <TableRow className="border-nuvia-silver/20">
                        <TableHead className="text-nuvia-deep/70 whitespace-nowrap">Usuario</TableHead>
                        <TableHead className="text-nuvia-deep/70 whitespace-nowrap hidden md:table-cell">Email</TableHead>
                        <TableHead className="text-nuvia-deep/70 whitespace-nowrap">Estado</TableHead>
                        <TableHead className="text-nuvia-deep/70 whitespace-nowrap">Almacenamiento</TableHead>
                        <TableHead className="text-nuvia-deep/70 whitespace-nowrap hidden lg:table-cell">Imágenes</TableHead>
                        <TableHead className="text-nuvia-deep/70 whitespace-nowrap hidden lg:table-cell">Videos</TableHead>
                        <TableHead className="text-nuvia-deep/70 whitespace-nowrap hidden xl:table-cell">Último acceso</TableHead>
                        <TableHead className="text-nuvia-deep/70 whitespace-nowrap hidden xl:table-cell">Registro</TableHead>
                        <TableHead className="text-nuvia-deep/70 text-right whitespace-nowrap">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-nuvia-deep/60">
                            No se encontraron usuarios
                          </TableCell>
                        </TableRow>
                      ) : (
                        currentUsers.map((user) => (
                          <TableRow key={user.id} className="border-nuvia-silver/10 hover:bg-nuvia-peach/10">
                            <TableCell className="font-medium">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-nuvia-mauve/20 to-nuvia-rose/20 flex items-center justify-center flex-shrink-0">
                                    <span className="text-sm font-semibold text-nuvia-deep">
                                      {user.username.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <span className="truncate max-w-[120px] font-medium">{user.username}</span>
                                </div>
                                {/* Email visible solo en móvil */}
                                <span className="text-xs text-nuvia-deep/60 truncate max-w-[180px] md:hidden">
                                  {user.email}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="min-w-[180px] max-w-[220px] truncate hidden md:table-cell">{user.email}</TableCell>
                            <TableCell>
                              <Badge className={`${getStatusColor(user.status)} text-xs whitespace-nowrap`}>
                                {getStatusText(user.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm min-w-[100px]">
                                <div className="whitespace-nowrap text-xs">
                                  {user.storageUsed.toFixed(1)} / {user.storageLimit} GB
                                </div>
                                <div className="w-20 bg-nuvia-silver/30 rounded-full h-1.5 mt-1">
                                  <div
                                    className={`h-1.5 rounded-full ${
                                      user.storageUsed / user.storageLimit > 0.8
                                        ? "bg-red-500"
                                        : "bg-gradient-to-r from-nuvia-mauve to-nuvia-rose"
                                    }`}
                                    style={{
                                      width: `${Math.min((user.storageUsed / user.storageLimit) * 100, 100)}%`,
                                    }}
                                  />
                                </div>
                                {/* Mostrar imágenes/videos en móvil dentro de esta celda */}
                                <div className="flex items-center gap-3 mt-1 lg:hidden">
                                  <div className="flex items-center gap-1">
                                    <Image className="w-3 h-3 text-nuvia-mauve" />
                                    <span className="text-xs">{user.totalImages}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Video className="w-3 h-3 text-nuvia-rose" />
                                    <span className="text-xs">{user.totalVideos}</span>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <div className="flex items-center gap-1 whitespace-nowrap">
                                <Image className="w-3 h-3 text-nuvia-mauve" />
                                <span className="text-sm">{user.totalImages}</span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <div className="flex items-center gap-1 whitespace-nowrap">
                                <Video className="w-3 h-3 text-nuvia-rose" />
                                <span className="text-sm">{user.totalVideos}</span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden xl:table-cell">
                              <div className="flex items-center gap-1 text-xs text-nuvia-deep/70 whitespace-nowrap">
                                <Clock className="w-3 h-3" />
                                <span>{formatDate(user.lastLogin)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden xl:table-cell">
                              <div className="flex items-center gap-1 text-xs text-nuvia-deep/70 whitespace-nowrap">
                                <Calendar className="w-3 h-3" />
                                <span>{formatDate(user.createdAt)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-sm rounded-xl">
                                  <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => handleViewUser(user)}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    Ver detalles
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setShowStorageDialog(true);
                                    }}
                                  >
                                    <HardDrive className="w-4 h-4 mr-2" />
                                    Ajustar almacenamiento
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {user.status === "suspended" ? (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedUser(user);
                                        setShowSuspendDialog(true);
                                      }}
                                    >
                                      <UserX className="w-4 h-4 mr-2" />
                                      Reactivar usuario
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedUser(user);
                                        setShowSuspendDialog(true);
                                      }}
                                    >
                                      <UserX className="w-4 h-4 mr-2" />
                                      Suspender usuario
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setShowDeleteDialog(true);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Eliminar permanentemente
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

                {/* Paginación */}
                {sortedUsers.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-nuvia-silver/20">
                    <div className="flex items-center gap-2 text-sm text-nuvia-deep/70">
                      <span>Mostrar</span>
                      <Select
                        value={usersPerPage.toString()}
                        onValueChange={(value) => {
                          setUsersPerPage(Number(value));
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="w-20 h-10 bg-white/50 border-nuvia-silver/30">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                      <span>por página</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="h-10 bg-white/50 border-nuvia-silver/30"
                      >
                        Anterior
                      </Button>
                      <span className="text-sm text-nuvia-deep px-2 whitespace-nowrap">
                        Página {currentPage} de {totalPages || 1}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="h-10 bg-white/50 border-nuvia-silver/30"
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== PESTAÑA: SISTEMA ========== */}
          <TabsContent value="storage" className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="w-full sm:w-auto">
                <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-nuvia-peach" />
                  Sistema de Almacenamiento
                </h2>
                <p className="text-xs sm:text-sm text-white/80">Estado y uso del almacenamiento global</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              {/* Storage Indicator */}
              <div className="w-full">
                <StorageIndicator variant="detailed" showRefresh={false} showBreakdown={true} />
              </div>

              {/* Top Usuarios */}
              <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/80 to-nuvia-silver/10 shadow-nuvia-medium rounded-2xl">
                <CardHeader className="border-b border-nuvia-peach/20 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5 p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-nuvia-deep font-semibold text-base md:text-lg">
                    <TrendingUp className="w-5 h-5 text-nuvia-mauve" />
                    Top Usuarios por Almacenamiento
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6">
                  <div className="space-y-3">
                    {sortedUsers
                      .sort((a, b) => b.storageUsed - a.storageUsed)
                      .slice(0, 5)
                      .map((user, index) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-lg border border-nuvia-silver/20 bg-white/50"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-nuvia-mauve/20 to-nuvia-rose/20 flex items-center justify-center">
                              <span className="text-sm font-bold text-nuvia-deep">{index + 1}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-sm truncate">{user.username}</div>
                              <div className="text-xs text-nuvia-deep/60">
                                {user.storageUsed.toFixed(1)} / {user.storageLimit} GB
                              </div>
                            </div>
                          </div>

                          <div className="flex-shrink-0 text-right min-w-[80px]">
                            <div className="font-bold text-nuvia-deep text-sm">
                              {Math.round((user.storageUsed / user.storageLimit) * 100)}%
                            </div>
                            <div className="w-20 bg-nuvia-silver/30 rounded-full h-2 mt-1">
                              <div
                                className={`h-2 rounded-full ${
                                  user.storageUsed / user.storageLimit > 0.8
                                    ? "bg-red-500"
                                    : "bg-gradient-to-r from-nuvia-mauve to-nuvia-rose"
                                }`}
                                style={{
                                  width: `${Math.min((user.storageUsed / user.storageLimit) * 100, 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border border-green-200 bg-green-50/50">
                      <div className="text-sm font-medium text-green-800">Total Almacenamiento</div>
                      <div className="text-2xl font-bold text-green-900">{stats.totalStorage} GB</div>
                      <div className="text-xs text-green-700">Límite total del sistema</div>
                    </div>
                    <div className="p-4 rounded-lg border border-nuvia-mauve/30 bg-nuvia-mauve/10">
                      <div className="text-sm font-medium text-nuvia-mauve">Almacenamiento Usado</div>
                      <div className="text-2xl font-bold text-nuvia-mauve">{stats.usedStorage.toFixed(1)} GB</div>
                      <div className="text-xs text-nuvia-mauve">
                        {Math.round((stats.usedStorage / stats.totalStorage) * 100)}% del total
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ========== PESTAÑA: GESTIÓN ========== */}
          <TabsContent value="storage-manager" className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="w-full sm:w-auto">
                <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-nuvia-peach" />
                  Análisis de Almacenamiento
                </h2>
                <p className="text-xs sm:text-sm text-white/80">Gestión detallada del uso de almacenamiento por usuario</p>
              </div>
            </div>

            <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/80 to-nuvia-silver/10 shadow-nuvia-medium rounded-2xl">
              <CardHeader className="border-b border-nuvia-peach/20 bg-gradient-to-r from-nuvia-peach/5 to-nuvia-rose/5 p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-nuvia-deep font-semibold text-base md:text-lg">
                  <TrendingUp className="w-5 h-5 text-nuvia-mauve" />
                  Gestión Avanzada de Almacenamiento
                </CardTitle>
              </CardHeader>

              <CardContent className="p-4 md:p-6">
                <StorageManagementContent users={users} loading={loading} fetchAdminData={fetchAdminData} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ========== DIÁLOGOS MODALES ========== */}
        <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
          <DialogContent className="sm:max-w-2xl bg-gradient-to-br from-white to-nuvia-peach/5 border-nuvia-peach/30">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-nuvia-deep">
                <Users className="w-5 h-5 text-nuvia-mauve" />
                Detalles del Usuario
              </DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-nuvia-peach/10 rounded-lg">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-nuvia-mauve/30 to-nuvia-rose/30 flex items-center justify-center">
                    <span className="text-2xl font-bold text-nuvia-deep">
                      {selectedUser.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-bold text-nuvia-deep truncate">{selectedUser.username}</h3>
                    <p className="text-nuvia-mauve truncate">{selectedUser.email}</p>
                    <Badge className={`${getStatusColor(selectedUser.status)} mt-1`}>{getStatusText(selectedUser.status)}</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border border-nuvia-silver/20">
                    <p className="text-xs text-nuvia-deep/60">Rol</p>
                    <p className="font-medium capitalize">{selectedUser.role}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-nuvia-silver/20">
                    <p className="text-xs text-nuvia-deep/60">Usuario ID</p>
                    <p className="font-medium">{selectedUser.userId}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-nuvia-silver/20">
                    <p className="text-xs text-nuvia-deep/60">Fecha de registro</p>
                    <p className="font-medium">{formatDate(selectedUser.createdAt)}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-nuvia-silver/20">
                    <p className="text-xs text-nuvia-deep/60">Último acceso</p>
                    <p className="font-medium">{formatDate(selectedUser.lastLogin)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-nuvia-deep">Almacenamiento</p>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm">
                    <span>Usado: {selectedUser.storageUsed.toFixed(2)} GB</span>
                    <span>Límite: {selectedUser.storageLimit} GB</span>
                    <span className="font-bold">{Math.round((selectedUser.storageUsed / selectedUser.storageLimit) * 100)}%</span>
                  </div>
                  <div className="w-full bg-nuvia-silver/30 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        selectedUser.storageUsed / selectedUser.storageLimit > 0.8
                          ? "bg-red-500"
                          : "bg-gradient-to-r from-nuvia-mauve to-nuvia-rose"
                      }`}
                      style={{
                        width: `${Math.min((selectedUser.storageUsed / selectedUser.storageLimit) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border border-nuvia-silver/20">
                    <div className="flex items-center gap-2">
                      <Image className="w-4 h-4 text-nuvia-mauve" />
                      <p className="text-xs text-nuvia-deep/60">Imágenes</p>
                    </div>
                    <p className="text-xl font-bold text-nuvia-deep">{selectedUser.totalImages}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-nuvia-silver/20">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-nuvia-rose" />
                      <p className="text-xs text-nuvia-deep/60">Videos</p>
                    </div>
                    <p className="text-xl font-bold text-nuvia-deep">{selectedUser.totalVideos}</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUserDialog(false)} className="border-nuvia-silver/30">
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showStorageDialog} onOpenChange={setShowStorageDialog}>
          <DialogContent className="sm:max-w-md bg-gradient-to-br from-white to-nuvia-peach/5 border-nuvia-peach/30">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-nuvia-deep">
                <HardDrive className="w-5 h-5 text-nuvia-mauve" />
                Ajustar límite de almacenamiento
              </DialogTitle>
              <DialogDescription>Ingresa el nuevo límite en GB para {selectedUser?.username}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="storage-limit">Límite de almacenamiento (GB)</Label>
                <Input
                  id="storage-limit"
                  type="number"
                  min="1"
                  step="0.5"
                  placeholder="Ej: 10"
                  value={newStorageLimit}
                  onChange={(e) => setNewStorageLimit(e.target.value)}
                  className="bg-white/50 border-nuvia-silver/30"
                />
              </div>
              <div className="text-sm text-nuvia-deep/70">Límite actual: {selectedUser?.storageLimit} GB</div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowStorageDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateStorage} className="bg-gradient-to-r from-nuvia-mauve to-nuvia-rose text-white">
                Actualizar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
          <DialogContent className="sm:max-w-md bg-gradient-to-br from-white to-nuvia-peach/5 border-nuvia-peach/30">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-nuvia-deep">
                <UserX className="w-5 h-5 text-nuvia-mauve" />
                {selectedUser?.status === "suspended" ? "Reactivar usuario" : "Suspender usuario"}
              </DialogTitle>
              <DialogDescription>
                {selectedUser?.status === "suspended"
                  ? `¿Estás seguro de que quieres reactivar a ${selectedUser?.username}?`
                  : `¿Estás seguro de que quieres suspender a ${selectedUser?.username}?`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSuspendDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (selectedUser) {
                    handleSuspendUser(selectedUser.id, selectedUser.status !== "suspended");
                  }
                }}
                className={
                  selectedUser?.status === "suspended"
                    ? "bg-green-500 hover:bg-green-600 text-white"
                    : "bg-nuvia-rose hover:bg-nuvia-rose/90 text-white"
                }
              >
                {selectedUser?.status === "suspended" ? "Reactivar" : "Suspender"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-md bg-gradient-to-br from-white to-nuvia-peach/5 border-nuvia-peach/30">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="w-5 h-5" />
                Eliminar usuario permanentemente
              </DialogTitle>
              <DialogDescription>
                Esta acción no se puede deshacer. Se eliminarán todos los archivos y datos de {selectedUser?.username}.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (selectedUser) {
                    handleDeleteUser(selectedUser.id);
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Eliminar permanentemente
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Admin;