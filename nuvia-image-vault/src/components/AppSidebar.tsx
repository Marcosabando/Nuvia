import { useLocation, NavLink, useNavigate } from "react-router-dom";
import { 
  Images, 
  Heart, 
  Trash2, 
  Clock,
  Folder,
  Settings,
  User,
  LogOut
} from "lucide-react";
import { AuthService } from "@/services/auth.service";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const mainItems = [
  { title: "Todos los archivos", url: "/home", icon: Images, count: 0 },
  { title: "Favoritos", url: "/favorites", icon: Heart, count: 0 },
  { title: "Recientes", url: "/recent", icon: Clock, count: 0 },
];

const folderItems = [
  { title: "Capturas", url: "/screenshots", icon: Folder, count: 0 },
  { title: "Descargas", url: "/downloads", icon: Folder, count: 0 },
  { title: "Carpetas", url: "/folders", icon: Folder, count: 0 },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;

  const getNavClasses = (path: string) => {
    const baseClasses =
      "w-full justify-start gap-3 h-10 transition-all duration-smooth";
    return isActive(path)
      ? `${baseClasses} bg-primary text-primary-foreground shadow-md`
      : `${baseClasses} hover:bg-muted-hover text-muted-foreground hover:text-foreground`;
  };

  return (
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

        {/* Carpetas */}
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Carpetas
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {folderItems.map((item) => (
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

      {/* FOOTER con menú desplegable de Configuración */}
      <SidebarFooter className="p-4 border-t border-orange-200/30 dark:border-orange-900/30">
        <SidebarMenu>
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
  );
}

export default AppSidebar;
