import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { MenuMusicLayer } from "./components/MenuMusicLayer";
import { LevelPrefetch } from "./components/LevelPrefetch";

import Index from "./pages/Index";
import Play from "./pages/Play";
import Discover from "./pages/Discover";
import Practice from "./pages/Practice";
import Create from "./pages/Create";
import HighScores from "./pages/HighScores";
import { NIP19Page } from "./pages/NIP19Page";
import NotFound from "./pages/NotFound";

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <MenuMusicLayer />
      <LevelPrefetch />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/play" element={<Play />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/create" element={<Create />} />
        <Route path="/high-scores" element={<HighScores />} />
        {/* NIP-19 route for npub1, note1, naddr1, nevent1, nprofile1 */}
        <Route path="/:nip19" element={<NIP19Page />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
export default AppRouter;