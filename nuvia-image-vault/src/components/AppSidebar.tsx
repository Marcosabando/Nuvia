import { useState } from "react";
import { useLocation, NavLink, useNavigate } from "react-router-dom";
import { 
  Images, 
  Heart, 
  Trash2, 
  Clock,
  Folder,
  Settings,
  User,
  LogOut,
  Plus,
  MoreVertical,
  Pencil,
  Trash,
  Shield
} from "lucide-react";
import { AuthService } from "@/services/auth.service";
import { useFolders } from "@/hooks/useFolders";
import { CreateFolderDialog } from "@/components/CreateFolderDialog";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const mainItems = [
  { title: "Todos los archivos", url: "/home", icon: Images, count: 0 },
  { title: "Favoritos", url: "/favorites", icon: Heart, count: 0 },
  { title: "Recientes", url: "/recent", icon: Clock, count: 0 },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  // Gestión de carpetas
  const { 
    systemFolders, 
    userFolders, 
    loading, 
    createFolder, 
    deleteFolder 
  } = useFolders();

  // Estados para diálogos
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<number | null>(null);

  const isActive = (path: string) => currentPath === path;

  const getNavClasses = (path: string) => {
    const baseClasses =
      "w-full justify-start gap-3 h-10 transition-all duration-smooth";
    return isActive(path)
      ? `${baseClasses} bg-primary text-primary-foreground shadow-md`
      : `${baseClasses} hover:bg-muted-hover text-muted-foreground hover:text-foreground`;
  };

  const handleCreateFolder = async (data: any) => {
    try {
      await createFolder(data);
    } catch (error) {
      console.error("Error al crear carpeta:", error);
      throw error;
    }
  };

  const handleDeleteFolder = async (folderId: number) => {
    try {
      await deleteFolder(folderId);
      setFolderToDelete(null);
    } catch (error: any) {
      console.error("Error al eliminar carpeta:", error);
      alert(error.response?.data?.error || "Error al eliminar la carpeta");
    }
  };

  const userRole = localStorage.getItem("userRole");
  const isAdmin = userRole === "admin";

  return (
    <>
      <Sidebar className="border-r border-border/50 bg-gradient-to-br from-orange-100/90 to-peach-100/80 dark:from-orange-950/50 dark:to-peach-950/40 backdrop-blur-sm">
        {/* HEADER */}
        <SidebarHeader className="p-6 border-b border-orange-200/30 dark:border-orange-900/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center shadow-lg shadow-orange-400/30">
              <Images className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-xl font-display font-bold nuvia-gradient-text">
                  Nuvia
                </h1>
                <p className="text-xs text-muted-foreground">
                  Gestión Multimedia
                </p>
              </div>
            )}
          </div>
        </SidebarHeader>

        {/* CONTENT */}
        <SidebarContent className="p-4">
          {/* Biblioteca */}
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Biblioteca
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {mainItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={getNavClasses(item.url)}>
                        <item.icon className="w-5 h-5" />
                        {!collapsed && (
                          <>
                            <span className="flex-1">{item.title}</span>
                            {item.count > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {item.count}
                              </Badge>
                            )}
                          </>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Carpetas del Sistema */}
          {systemFolders.length > 0 && (
            <SidebarGroup>
              {!collapsed && (
                <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Sistema
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {systemFolders.map((folder) => (
                    <SidebarMenuItem key={folder.id}>
                      <SidebarMenuButton asChild>
                        <NavLink 
                          to={`/folders/${folder.id}`} 
                          className={getNavClasses(`/folders/${folder.id}`)}
                        >
                          <Folder 
                            className="w-5 h-5" 
                            style={{ color: folder.color }}
                          />
                          {!collapsed && (
                            <>
                              <span className="flex-1">{folder.name}</span>
                              {folder.itemCount > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {folder.itemCount}
                                </Badge>
                              )}
                            </>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Mis Carpetas */}
          <SidebarGroup>
            {!collapsed && (
              <div className="flex items-center justify-between mb-2">
                <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Mis Carpetas
                </SidebarGroupLabel>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-orange-200/50"
                  onClick={() => setCreateDialogOpen(true)}
                  title="Crear carpeta"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
            {collapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="w-full h-10 hover:bg-orange-200/50"
                onClick={() => setCreateDialogOpen(true)}
                title="Crear carpeta"
              >
                <Plus className="h-5 w-5" />
              </Button>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
  {loading ? (
    <div className="text-sm text-muted-foreground px-3 py-2">
      Cargando...
    </div>
  ) : userFolders.length === 0 ? (
    !collapsed && (
      <div className="text-sm text-muted-foreground px-3 py-2">
        No hay carpetas
      </div>
    )
  ) : (
    <>
      {userFolders.map((folder) => {
        console.log("📁 Carpeta en sidebar - ID:", folder.id, "Nombre:", folder.name, "Tipo:", typeof folder.id);
        return (
          <SidebarMenuItem key={folder.id}>
            <div className="flex items-center gap-1 w-full">
              <SidebarMenuButton asChild className="flex-1">
                <NavLink 
                  to={`/folders/${folder.id}`} 
                  className={getNavClasses(`/folders/${folder.id}`)}
                  onClick={(e) => {
                    console.log("🖱️ CLIC EN CARPETA:");
                    console.log("   📍 ID:", folder.id);
                    console.log("   📝 Nombre:", folder.name);
                    console.log("   🔗 URL destino:", `/folders/${folder.id}`);
                    console.log("   🎯 Evento:", e);
                  }}
                >
                  <Folder 
                    className="w-5 h-5" 
                    style={{ color: folder.color }}
                  />
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{folder.name}</span>
                      {folder.itemCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {folder.itemCount}
                        </Badge>
                      )}
                    </>
                  )}
                </NavLink>
              </SidebarMenuButton>

              {/* Menú de opciones */}
              {!collapsed && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-orange-200/50 dark:hover:bg-orange-900/30"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => navigate(`/folders/${folder.id}/edit`)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setFolderToDelete(folder.id)}
                      className="text-red-600"
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </SidebarMenuItem>
        );
      })}
    </>
  )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Papelera */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/trash" className={getNavClasses("/trash")}>
                      <Trash2 className="w-5 h-5" />
                      {!collapsed && (
                        <>
                          <span className="flex-1">Papelera</span>
                          <Badge variant="destructive" className="text-xs">
                            0
                          </Badge>
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* FOOTER */}
<SidebarFooter className="p-4 border-t border-orange-200/30 dark:border-orange-900/30">
  <SidebarMenu>

    {/* BOTÓN ADMIN */}
    {isAdmin && (
      <SidebarMenuItem>
        <SidebarMenuButton 
          asChild 
          className={getNavClasses("/admin")}
        >
          <NavLink to="/admin">
            <Shield className="w-5 h-5" />
            {!collapsed && <span>Admin</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )}

    {/* CONFIGURACIÓN */}
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton className={getNavClasses("/settings")}>
            <Settings className="w-5 h-5" />
            {!collapsed && <span>Configuración</span>}
          </SidebarMenuButton>
        </DropdownMenuTrigger>

                <DropdownMenuContent
                  side="right"
                  align="start"
                  className="w-48 bg-white dark:bg-neutral-900 border border-border/50 shadow-lg rounded-xl"
                >
                  <DropdownMenuItem
                    onClick={() => navigate("/profile")}
                    className="flex items-center gap-2 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-950/40"
                  >
                    <User className="w-4 h-4" />
                    <span>Mi Perfil</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => AuthService.logout()}
                    className="flex items-center gap-2 cursor-pointer text-red-500 hover:bg-red-100 dark:hover:bg-red-950/40"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Cerrar sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* Diálogo crear carpeta */}
      <CreateFolderDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreateFolder={handleCreateFolder}
      />

      {/* Diálogo confirmar eliminación */}
      <AlertDialog 
        open={folderToDelete !== null} 
        onOpenChange={() => setFolderToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar carpeta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La carpeta se eliminará permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => folderToDelete && handleDeleteFolder(folderToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default AppSidebar;