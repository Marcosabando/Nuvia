import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Download, Share2, Trash2, Search, Calendar, Monitor, Smartphone, MoreVertical } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const Screenshots = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDevice, setSelectedDevice] = useState("all");

  const screenshots = [
    { id: 1, name: "Dashboard_2024.png", device: "desktop", size: "2.1 MB", date: "Hoy, 15:30", resolution: "1920x1080" },
    { id: 2, name: "App_Login.png", device: "mobile", size: "456 KB", date: "Hoy, 14:15", resolution: "390x844" },
    { id: 3, name: "Error_Report.png", device: "desktop", size: "1.8 MB", date: "Hoy, 10:22", resolution: "2560x1440" },
    { id: 4, name: "Chat_Conversation.png", device: "mobile", size: "523 KB", date: "Ayer, 18:45", resolution: "428x926" },
    { id: 5, name: "Analytics_View.png", device: "desktop", size: "3.2 MB", date: "Ayer, 16:30", resolution: "1920x1080" },
    { id: 6, name: "Profile_Settings.png", device: "tablet", size: "892 KB", date: "Hace 2 días", resolution: "1024x768" },
    { id: 7, name: "Payment_Success.png", device: "desktop", size: "1.5 MB", date: "Hace 3 días", resolution: "1920x1080" },
    { id: 8, name: "Map_Location.png", device: "mobile", size: "678 KB", date: "Hace 1 semana", resolution: "390x844" },
    { id: 9, name: "Video_Player.png", device: "desktop", size: "2.8 MB", date: "Hace 1 semana", resolution: "2560x1440" },
  ];

  const filteredScreenshots = screenshots.filter(screenshot => {
    const matchesSearch = screenshot.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDevice = selectedDevice === "all" || screenshot.device === selectedDevice;
    return matchesSearch && matchesDevice;
  });

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case "desktop": return <Monitor className="w-3 h-3" />;
      case "mobile": return <Smartphone className="w-3 h-3" />;
      case "tablet": return <Monitor className="w-3 h-3" />;
      default: return null;
    }
  };

  const getDeviceBadgeColor = (device: string) => {
    switch (device) {
      case "desktop": return "bg-nuvia-deep/10 text-nuvia-deep border-nuvia-deep/30 shadow-nuvia-soft";
      case "mobile": return "bg-nuvia-peach/15 text-nuvia-peach-dark border-nuvia-peach/40 shadow-nuvia-soft";
      case "tablet": return "bg-nuvia-mauve/10 text-nuvia-mauve border-nuvia-mauve/30 shadow-nuvia-soft";
      default: return "";
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold idebar-background text-white  font-bold bg-clip-text text-transparent">
              Capturas de Pantalla
            </h1>
            <p className="text-sm sm:text-base text-white mt-1">
              Todas tus capturas organizadas en un solo lugar
            </p>
          </div>
          <Button className="text-white font-bold py-4 px-6 rounded-xl bg-gradient-to-r from-nuvia-deep via-nuvia-mauve to-nuvia-rose hover:from-nuvia-mauve hover:via-nuvia-rose hover:to-nuvia-peach transition-all duration-500 flex items-center justify-center space-x-3 shadow-nuvia-strong hover:shadow-nuvia-glow transform hover:scale-[1.02] group">
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva Captura</span>
            <span className="sm:hidden">Capturar</span>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium">Total</p>
                <div className="p-2 rounded-lg bg-gradient-nuvia-royal shadow-nuvia-soft">
                  <Camera className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-xl md:text-2xl font-bold mt-2 text-nuvia-deep bg-clip-text text-transparent">{screenshots.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium">Hoy</p>
                <div className="p-2 rounded-lg bg-gradient-nuvia-warm shadow-nuvia-soft">
                  <Calendar className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-xl md:text-2xl font-bold mt-2 text-nuvia-deep">3</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium">Escritorio</p>
                <div className="p-2 rounded-lg bg-gradient-nuvia-ethereal shadow-nuvia-soft">
                  <Monitor className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-xl md:text-2xl font-bold mt-2 text-nuvia-deep">5</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-white to-nuvia-peach/10 border border-nuvia-peach/30 shadow-nuvia-soft rounded-2xl hover:shadow-nuvia-glow transition-all">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm text-nuvia-deep/70 font-medium">Móvil</p>
                <div className="p-2 rounded-lg bg-gradient-nuvia-dawn shadow-nuvia-soft">
                  <Smartphone className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-xl md:text-2xl font-bold mt-2 text-nuvia-deep">3</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nuvia-mauve/60" />
            <Input
              placeholder="Buscar capturas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/50  border-nuvia-silver/30 focus:border-nuvia-mauve focus:ring-nuvia-mauve/20 transition-all duration-smooth"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={selectedDevice === "all" ? "default" : "outline"}
              onClick={() => setSelectedDevice("all")}
              className={selectedDevice === "all" 
                ? "text-white font-bold py-4 px-6 rounded-xl bg-gradient-to-r from-nuvia-deep via-nuvia-mauve to-nuvia-rose hover:from-nuvia-mauve hover:via-nuvia-rose hover:to-nuvia-peach transition-all duration-500 flex items-center justify-center space-x-3 shadow-nuvia-strong hover:shadow-nuvia-glow" 
                : "text-white font-bold py-4 px-6 rounded-xl bg-gradient-to-r from-nuvia-deep via-nuvia-mauve to-nuvia-rose hover:from-nuvia-mauve hover:via-nuvia-rose hover:to-nuvia-peach transition-all duration-500 flex items-center justify-center space-x-3 shadow-nuvia-strong hover:shadow-nuvia-glow"}
            >
              Todos
            </Button>
            <Button
              variant={selectedDevice === "desktop" ? "default" : "outline"}
              onClick={() => setSelectedDevice("desktop")}
              className={selectedDevice === "desktop" 
                ? "bg-gradient-nuvia-royal text-white shadow-nuvia-accent hover:shadow-nuvia-glow transition-all duration-smooth" 
                : "border-nuvia-silver/40 text-nuvia-deep hover:bg-nuvia-deep/5 hover:border-nuvia-deep/40 transition-all duration-smooth"}
            >
              <Monitor className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Escritorio</span>
            </Button>
            <Button
              variant={selectedDevice === "mobile" ? "default" : "outline"}
              onClick={() => setSelectedDevice("mobile")}
              className={selectedDevice === "mobile" 
                ? "bg-gradient-nuvia-warm text-white shadow-nuvia-accent hover:shadow-nuvia-glow transition-all duration-smooth" 
                : "border-nuvia-silver/40 text-nuvia-peach-dark hover:bg-nuvia-peach/5 hover:border-nuvia-peach/40 transition-all duration-smooth"}
            >
              <Smartphone className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Móvil</span>
            </Button>
          </div>
        </div>

        {/* Screenshots Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredScreenshots.map(screenshot => (
            <Card
              key={screenshot.id}
              className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/80 to-nuvia-silver/10 hover:shadow-nuvia-strong transition-all duration-smooth group overflow-hidden hover:scale-105 hover:border-nuvia-mauve/40"
            >
              <div className="aspect-video bg-gradient-to-br from-nuvia-peach/10 via-nuvia-rose/10 to-nuvia-mauve/10 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-nuvia-radial-glow opacity-30"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Camera className="w-12 h-12 text-nuvia-mauve/20 group-hover:text-nuvia-mauve/40 transition-all duration-smooth group-hover:scale-110" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-nuvia-deep/80 via-nuvia-deep/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-smooth">
                  <div className="absolute bottom-0 left-0 right-0 p-3 flex justify-center gap-2">
                    <Button size="icon" className="h-8 w-8 bg-white/90 hover:bg-white text-nuvia-deep shadow-nuvia-soft hover:shadow-nuvia-medium transition-all duration-smooth hover:scale-110">
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button size="icon" className="h-8 w-8 bg-white/90 hover:bg-white text-nuvia-mauve shadow-nuvia-soft hover:shadow-nuvia-medium transition-all duration-smooth hover:scale-110">
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button size="icon" className="h-8 w-8 bg-white/90 hover:bg-white text-nuvia-rose shadow-nuvia-soft hover:shadow-nuvia-medium transition-all duration-smooth hover:scale-110">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <CardContent className="p-3 bg-white/50 backdrop-blur-sm">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-nuvia-deep truncate">{screenshot.name}</p>
                    <p className="text-xs  text-nuvia-deep">{screenshot.date}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 ml-2 text-nuvia-mauve hover:text-nuvia-deep hover:bg-nuvia-mauve/10 transition-all duration-smooth">
                        <MoreVertical className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-sm border-nuvia-silver/30">
                      <DropdownMenuItem className="text-nuvia-deep hover:bg-nuvia-mauve/10">Ver</DropdownMenuItem>
                      <DropdownMenuItem className="text-nuvia-deep hover:bg-nuvia-mauve/10">Descargar</DropdownMenuItem>
                      <DropdownMenuItem className="text-nuvia-deep hover:bg-nuvia-mauve/10">Compartir</DropdownMenuItem>
                      <DropdownMenuItem className="text-nuvia-deep hover:bg-nuvia-mauve/10">Renombrar</DropdownMenuItem>
                      <DropdownMenuItem className="text-nuvia-rose hover:bg-nuvia-rose/10">Eliminar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={`text-xs ${getDeviceBadgeColor(screenshot.device)} backdrop-blur-sm`}>
                    {getDeviceIcon(screenshot.device)}
                    <span className="ml-1">{screenshot.resolution}</span>
                  </Badge>
                  <span className="text-xs  text-nuvia-deep  font-medium">{screenshot.size}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredScreenshots.length === 0 && (
          <Card className="border-nuvia-silver/30 backdrop-blur-sm bg-gradient-to-br from-white/80 to-nuvia-silver/10">
            <CardContent className="py-12 text-center">
              <Camera className="w-12 h-12 mx-auto text-nuvia-mauve/30 mb-4" />
              <p className="text-nuvia-mauve/70">No se encontraron capturas</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default Screenshots;