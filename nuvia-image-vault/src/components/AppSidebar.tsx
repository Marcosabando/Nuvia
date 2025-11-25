import { useState, useMemo, useEffect } from "react";
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
  Shield,
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

const MAIN_ITEMS = [
  { title: "Todos los archivos", url: "/home", icon: Images },
  { title: "Favoritos", url: "/favorites", icon: Heart },
  { title: "Recientes", url: "/recent", icon: Clock },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const collapsed = state === "collapsed";

  // Precargar imagen del logo
  useEffect(() => {
    const img = new Image();
    img.src = "/nuvia-color.png";
  }, []);

  // Gestión de carpetas
  const { systemFolders, userFolders, loading, createFolder, deleteFolder } = useFolders();

  // Estados
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<number | null>(null);

  // Memoizar rol de usuario
  const isAdmin = useMemo(() => localStorage.getItem("userRole") === "admin", []);

  // Funciones auxiliares
  const isActive = (path: string) => location.pathname === path;

  const getNavClasses = (path: string) => {
    const base = "w-full justify-start gap-3 h-10 transition-all duration-200";
    return isActive(path)
      ? `${base} bg-primary text-primary-foreground shadow-md`
      : `${base} hover:bg-orange-100/50 dark:hover:bg-orange-900/30 text-muted-foreground hover:text-foreground`;
  };

  // Handlers
  const handleCreateFolder = async (data: any) => {
    try {
      await createFolder(data);
      setCreateDialogOpen(false);
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

  return (
    <>
      <Sidebar className="border-r border-border/50 bg-gradient-to-br from-orange-100/90 to-peach-100/80 dark:from-orange-950/50 dark:to-peach-950/40 backdrop-blur-sm">
        {/* HEADER */}
        <SidebarHeader className="p-6 border-b border-orange-200/30 dark:border-orange-900/30 bg-gradient-to-r from-orange-50/50 to-transparent dark:from-orange-950/30 dark:to-transparent">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 to-pink-400/20 rounded-xl blur-md transition-opacity group-hover:opacity-75" />
              <img
                src="/nuvia-color.png"
                alt="Nuvia"
                loading="eager"
                decoding="sync"
                className="relative w-11 h-11 drop-shadow-lg transition-all duration-300 group-hover:drop-shadow-2xl group-hover:-translate-y-0.5"
                style={{ imageRendering: 'crisp-edges' }}
              />
            </div>

            {!collapsed && (
              <div className="flex flex-col gap-0.5">
                <h1 className="text-2xl font-display font-bold nuvia-gradient-text tracking-tight leading-none">
                  Nuvia
                </h1>
                <p className="text-[11px] text-orange-500/80 dark:text-orange-300/70 font-semibold uppercase tracking-wider">
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
              <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-2">
                Biblioteca
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {MAIN_ITEMS.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={getNavClasses(item.url)}>
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span className="flex-1">{item.title}</span>}
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
                <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-2">
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
                          className={getNavClasses(`/folders/${folder.id}`)}>
                          <Folder className="w-5 h-5 flex-shrink-0" style={{ color: folder.color }} />
                          {!collapsed && (
                            <>
                              <span className="flex-1 truncate">{folder.name}</span>
                              {folder.itemCount > 0 && (
                                <Badge variant="secondary" className="text-xs ml-auto">
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
            {!collapsed ? (
              <div className="flex items-center justify-between mb-2 px-2">
                <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Mis Carpetas
                </SidebarGroupLabel>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-orange-200/50 dark:hover:bg-orange-900/30"
                  onClick={() => setCreateDialogOpen(true)}
                  title="Crear carpeta">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="w-full h-10 hover:bg-orange-200/50 dark:hover:bg-orange-900/30 mb-2"
                onClick={() => setCreateDialogOpen(true)}
                title="Crear carpeta">
                <Plus className="h-5 w-5" />
              </Button>
            )}

            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {loading ? (
                  <div className="text-sm text-muted-foreground px-3 py-2">Cargando...</div>
                ) : userFolders.length === 0 ? (
                  !collapsed && (
                    <div className="text-sm text-muted-foreground px-3 py-2">No hay carpetas</div>
                  )
                ) : (
                  userFolders.map((folder) => (
                    <SidebarMenuItem key={folder.id}>
                      <div className="flex items-center gap-1 w-full">
                        <SidebarMenuButton asChild className="flex-1">
                          <NavLink
                            to={`/folders/${folder.id}`}
                            className={getNavClasses(`/folders/${folder.id}`)}>
                            <Folder
                              className="w-5 h-5 flex-shrink-0"
                              style={{ color: folder.color }}
                            />
                            {!collapsed && (
                              <>
                                <span className="flex-1 truncate">{folder.name}</span>
                                {folder.itemCount > 0 && (
                                  <Badge variant="secondary" className="text-xs ml-auto">
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
                                className="h-8 w-8 flex-shrink-0 hover:bg-orange-200/50 dark:hover:bg-orange-900/30"
                                onClick={(e) => e.stopPropagation()}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => navigate(`/folders/${folder.id}/edit`)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setFolderToDelete(folder.id)}
                                className="text-red-600 focus:text-red-600">
                                <Trash className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </SidebarMenuItem>
                  ))
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
                      <Trash2 className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && <span className="flex-1">Papelera</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* FOOTER */}
        <SidebarFooter className="p-4 border-t border-orange-200/30 dark:border-orange-900/30">
          <SidebarMenu className="space-y-1">
            {/* Admin */}
            {isAdmin && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/admin" className={getNavClasses("/admin")}>
                    <Shield className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && <span>Admin</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* Configuración */}
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton>
                    <Settings className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && <span>Configuración</span>}
                  </SidebarMenuButton>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  side="right"
                  align="end"
                  className="w-48 bg-white dark:bg-neutral-900 border border-border/50 shadow-lg rounded-xl">
                  <DropdownMenuItem
                    onClick={() => navigate("/profile")}
                    className="cursor-pointer">
                    <User className="mr-2 w-4 h-4" />
                    <span>Mi Perfil</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => AuthService.logout()}
                    className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/40">
                    <LogOut className="mr-2 w-4 h-4" />
                    <span>Cerrar sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* Diálogos */}
      <CreateFolderDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreateFolder={handleCreateFolder}
      />

      <AlertDialog open={folderToDelete !== null} onOpenChange={() => setFolderToDelete(null)}>
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
              className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}