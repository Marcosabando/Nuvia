import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Favorites from "./pages/Favorites";
import Recent from "./pages/Recent";
import FolderView from "./pages/FolderView";
import Downloads from "./pages/Downloads";
import Screenshots from "./pages/Screenshots";
import Trash from "./pages/Trash";
import NotFound from "./pages/NotFound";
import Home from "./pages/Home";
// import Login from "./pages/Login"

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/recent" element={<Recent />} />
          <Route path="/folders/:folderId" element={<FolderView />} />
          <Route path="/downloads" element={<Downloads />} />
          <Route path="/screenshots" element={<Screenshots />} />
          <Route path="/trash" element={<Trash />} />
          <Route path="/home" element={<Home />} />
          {/* <Route path="/login" element={<Login />} /> */}
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;