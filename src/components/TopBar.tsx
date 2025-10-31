import { useState } from "react";
import { 
  Search, 
  Grid3X3, 
  List, 
  Filter, 
  Upload,
  MoreHorizontal,
  SlidersHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";

type ViewMode = "grid" | "list";

export function TopBar() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();

  return (
    <header className="h-14 md:h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center justify-between h-full px-3 sm:px-4 md:px-6 gap-2 md:gap-4">
        {/* Left Section - Navigation & Search */}
        <div className="flex items-center gap-2 md:gap-4 flex-1">
          <SidebarTrigger className="hover:bg-muted rounded-lg transition-colors" />
          
          {/* Desktop Search */}
          {!isMobile && (
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar archivos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/50 border-border focus:border-primary transition-colors"
              />
            </div>
          )}
        </div>

        {/* Right Section - Actions & Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Mobile Search Button */}
          {isMobile && (
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <Search className="w-4 h-4" />
            </Button>
          )}

          {/* View Mode Toggle - Hidden on mobile */}
          {!isMobile && (
            <div className="flex items-center rounded-lg border border-border p-1 bg-muted/30">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className={`h-8 w-8 p-0 ${
                  viewMode === "grid" 
                    ? "bg-nuvia-mauve hover:bg-nuvia-mauve-hover text-white" 
                    : "hover:bg-nuvia-rose/20"
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={`h-8 w-8 p-0 ${
                  viewMode === "list" 
                    ? "bg-nuvia-mauve hover:bg-nuvia-mauve-hover text-white" 
                    : "hover:bg-nuvia-rose/20"
                }`}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Filter Button - Responsive */}
          <Button 
            variant="outline" 
            size="sm" 
            className={`${isMobile ? "h-9 w-9 p-0" : "gap-2"} bg-nuvia-mauve hover:bg-nuvia-rose text-nuvia-deep hover:text-nuvia-deep border-nuvia-mauve/30 transition-all`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {!isMobile && "Filtrar"}
          </Button>

          {/* Upload Button - Responsive */}
          <Button 
            className={`bg-nuvia-mauve hover:bg-nuvia-rose text-nuvia-deep hover:text-nuvia-deep shadow-nuvia-soft hover:shadow-nuvia-glow transition-all ${
              isMobile ? "h-9 w-9 p-0" : "gap-2"
            }`}
            size="sm"
          >
            <Upload className="w-4 h-4" />
            {!isMobile && "Subir"}
          </Button>

          {/* More Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <Grid3X3 className="w-4 h-4 mr-2" />
                Vista cuadrícula
              </DropdownMenuItem>
              <DropdownMenuItem>
                <List className="w-4 h-4 mr-2" />
                Vista lista
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Filter className="w-4 h-4 mr-2" />
                Filtros avanzados
              </DropdownMenuItem>
              {isMobile && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Search className="w-4 h-4 mr-2" />
                    Buscar
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}