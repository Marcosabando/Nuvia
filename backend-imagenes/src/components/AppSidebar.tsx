import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { 
  Images, 
  Heart, 
  Trash2, 
  Upload, 
  Search,
  Grid3X3,
  List,
  Settings,
  Star,
  Folder,
  Clock
} from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;

  const getNavClasses = (path: string) => {
    const baseClasses = "w-full justify-start gap-3 h-10 transition-all duration-smooth";
    return isActive(path) 
      ? `${baseClasses} bg-primary text-primary-foreground shadow-md`
      : `${baseClasses} hover:bg-muted-hover text-muted-foreground hover:text-foreground`;
  };

  return (
    <Sidebar className="border-r border-border/50 bg-gradient-to-br from-orange-100/90 to-peach-100/80 dark:from-orange-950/50 dark:to-peach-950/40 backdrop-blur-sm">
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
              <p className="text-xs text-muted-foreground">Gestión Multimedia</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="p-4">
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

      <SidebarFooter className="p-4 border-t border-orange-200/30 dark:border-orange-900/30">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink to="/settings" className={getNavClasses("/settings")}>
                <Settings className="w-5 h-5" />
                {!collapsed && <span>Configuración</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}