import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, Sparkles, ExternalLink } from 'lucide-react';
import { Project } from '../types';

interface ProjectVideoCardProps {
  id: string;
  title: string;
  category: string;
  tag: string;
  year: string;
  coords: string;
  videoSrc?: string;
  previewType: 'video-file' | 'nurabi-interactive' | 'rivka-interactive' | 'game-interactive' | 'wasm-interactive';
  onSelect?: () => void;
  offsetY?: number;
}

export function ProjectVideoCard({
  id,
  title,
  category,
  tag,
  year,
  coords,
  videoSrc,
  previewType,
  onSelect,
  offsetY = 0,
}: ProjectVideoCardProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // NURABI interactive state
  const [activeTutorIndex, setActiveTutorIndex] = useState(0);

  // RIVKA interactive state
  const [activeCampTab, setActiveCampTab] = useState<'siwa' | 'dahab' | 'fayoum'>('siwa');

  // GAME interactive state
  const [gemCount, setGemCount] = useState(500);
  const [claimed, setClaimed] = useState(false);

  // WASM interactive state (inspire mono toggle like in the video)
  const [inspireMode, setInspireMode] = useState<'orange' | 'cyan'>('orange');

  useEffect(() => {
    if (previewType === 'nurabi-interactive') {
      const interval = setInterval(() => {
        setActiveTutorIndex((prev) => (prev + 1) % 4);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [previewType]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative flex flex-col cursor-pointer transition-all duration-300"
      style={{
        transform: `translateY(${offsetY}px)`,
      }}
    >
      {/* The Visual Media / Video Window */}
      <div className="relative w-full aspect-[16/10] sm:aspect-[16/9.5] rounded-2xl overflow-hidden bg-[#161616] border border-black/15 shadow-sm group-hover:shadow-xl group-hover:border-black/30 transition-all duration-300">
        {/* Top-Right Neon Lime Badge (Exact aesthetic from video) */}
        <div className="absolute top-3.5 right-3.5 z-30">
          <span className="px-2.5 py-1 bg-[#c6ff00] text-black text-[10px] sm:text-[11px] font-mono-code font-bold tracking-tight uppercase rounded-sm shadow-sm">
            {tag}
          </span>
        </div>

        {/* 1. ACTUAL VIDEO FILE PREVIEW (Using User's Video) */}
        {previewType === 'video-file' && videoSrc && (
          <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              src={videoSrc}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover filter contrast-[1.05]"
            />

            {/* Video Controls Overlay */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-20 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md text-white text-xs">
                <button
                  onClick={togglePlay}
                  className="hover:text-amber-300 transition-colors cursor-pointer"
                  title={isPlaying ? 'Pause video' : 'Play video'}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={toggleMute}
                  className="hover:text-amber-300 transition-colors ml-1 cursor-pointer"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
                <span className="text-[10px] font-mono-code text-zinc-300 ml-1">LIVE REEL</span>
              </div>

              <div className="bg-black/70 px-2 py-1 rounded text-[10px] font-mono-code text-zinc-400">
                1080P // 60FPS
              </div>
            </div>
          </div>
        )}

        {/* 2. NURABI ANIMATED EDTECH VIDEO MOCKUP */}
        {previewType === 'nurabi-interactive' && (
          <div className="relative w-full h-full bg-gradient-to-br from-[#0c3558] via-[#082844] to-[#041628] p-5 sm:p-7 flex flex-col justify-between text-white overflow-hidden">
            {/* Dynamic Background Mesh */}
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:18px_18px]" />

            {/* Top Bar */}
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold tracking-tight text-white font-sans">NURABI LIVE PORTAL</span>
              </div>
            </div>

            {/* Center Arabic Live Banner with Dynamic Tutor Cycle */}
            <div className="my-auto z-10 text-center space-y-3">
              <h4 className="text-lg sm:text-2xl font-black text-white leading-tight font-sans dir-rtl">
                منصتك المفضلة للحصول على دروس خصوصية
              </h4>
              <p className="text-[11px] text-sky-200/80 font-light max-w-sm mx-auto font-mono-code">
                Interactive real-time whiteboard &amp; private tutor matchmaking
              </p>

              {/* Animated Floating Tutors Strip */}
              <div className="flex items-center justify-center gap-2 pt-1">
                {[
                  { name: 'د. أحمد', subject: 'CALCULUS', rating: '5.0★' },
                  { name: 'أ. سارة', subject: 'PHYSICS', rating: '4.9★' },
                  { name: 'م. طارق', subject: 'CS & AI', rating: '5.0★' },
                  { name: 'د. ياسمين', subject: 'CHEMISTRY', rating: '4.8★' },
                ].map((tutor, idx) => (
                  <div
                    key={idx}
                    className={`px-2.5 py-1.5 rounded-xl border transition-all text-left ${
                      idx === activeTutorIndex
                        ? 'bg-sky-400 text-sky-950 font-bold border-sky-300 scale-105 shadow-lg'
                        : 'bg-white/10 text-zinc-300 border-white/10 opacity-70'
                    }`}
                  >
                    <div className="text-[10px] font-sans font-bold leading-none">{tutor.name}</div>
                    <div className="text-[8px] font-mono-code opacity-80 mt-0.5">{tutor.subject}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Floating Booking HUD */}
            <div className="z-10 flex items-center justify-between pt-2 border-t border-white/10 text-[10px] font-mono-code text-sky-200">
              <span>ACTIVE SESSION: 00:42:18</span>
              <span className="bg-sky-500/20 px-2 py-0.5 rounded text-sky-300 font-bold">120 STUDENTS ONLINE</span>
            </div>
          </div>
        )}

        {/* 3. RIVKA ANIMATED DESERT TRAVEL APP */}
        {previewType === 'rivka-interactive' && (
          <div className="relative w-full h-full bg-gradient-to-br from-[#c99a63] via-[#b0804b] to-[#734e26] p-5 sm:p-7 flex flex-col justify-between text-white overflow-hidden">
            {/* Top Bar with Camp Filter Tabs */}
            <div className="flex items-center justify-between z-10">
              <span className="text-xs font-bold tracking-tight text-white font-sans">RIVKA // EXPEDITIONS</span>
              <div className="flex items-center gap-1 bg-black/25 backdrop-blur-sm p-0.5 rounded-lg text-[9px] font-mono-code">
                {(['siwa', 'dahab', 'fayoum'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveCampTab(tab);
                    }}
                    className={`px-2 py-0.5 rounded uppercase font-semibold transition-colors ${
                      activeCampTab === tab ? 'bg-amber-100 text-neutral-900 shadow' : 'text-amber-100/70 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Center Dynamic iPhone Device Visual with Interactive Map Pins */}
            <div className="my-auto z-10 flex items-center justify-center gap-6">
              <div className="w-48 sm:w-56 bg-neutral-900/90 rounded-2xl p-3 border border-amber-300/30 shadow-2xl backdrop-blur-md">
                <div className="flex items-center justify-between text-[10px] font-mono-code text-amber-200 mb-1.5">
                  <span>GPS: 29.2032° N, 25.5195° E</span>
                  <span className="text-emerald-400">OFFLINE READY</span>
                </div>
                <div className="h-20 rounded-xl bg-gradient-to-b from-[#dfb987] to-[#ba8a50] p-2 flex flex-col justify-between text-neutral-900 shadow-inner">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>
                      {activeCampTab === 'siwa' && '⛺ Sakina Desert Camp'}
                      {activeCampTab === 'dahab' && '🌊 Blue Lagoon Sanctuary'}
                      {activeCampTab === 'fayoum' && '🌌 Magic Lake Dune Camp'}
                    </span>
                    <span className="text-[10px] bg-neutral-900 text-white px-1.5 py-0.5 rounded">4.9★</span>
                  </div>
                  <div className="text-[9px] font-mono-code text-neutral-800">
                    Host: Sheikh Mansour Al-Siwi · Bedouin Verified
                  </div>
                </div>
                <div className="mt-2 text-[10px] font-bold text-center text-amber-100 py-1 rounded bg-white/10">
                  Book Bedouin Tent · $45 / Night
                </div>
              </div>
            </div>

            {/* Bottom Badges */}
            <div className="z-10 flex items-center justify-between pt-2 border-t border-white/20 text-[10px] font-mono-code text-amber-100">
              <span>TOPO VECTOR ENGINE v3.4</span>
              <span>GOOGLE PLAY &amp; APP STORE</span>
            </div>
          </div>
        )}

        {/* 4. GAME SHOP HUD INTERACTIVE / ANIMATED */}
        {previewType === 'game-interactive' && (
          <div className="relative w-full h-full bg-gradient-to-br from-[#1f1747] via-[#2d1b66] to-[#130b2e] p-5 sm:p-7 flex flex-col justify-between text-white overflow-hidden">
            {/* Top Bar with In-Game Currency Counters */}
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <span className="font-black text-xs text-amber-300 tracking-wider font-sans">SUPPORTAL SHOP HUD</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono-code font-bold">
                <div className="bg-black/40 px-2 py-0.5 rounded border border-amber-400/40 text-amber-300 flex items-center gap-1">
                  <span>🪙</span>
                  <span>100,000</span>
                </div>
                <div className="bg-black/40 px-2 py-0.5 rounded border border-sky-400/40 text-sky-300 flex items-center gap-1">
                  <span>💎</span>
                  <span>{gemCount}</span>
                </div>
              </div>
            </div>

            {/* Center Interactive Shop Reward Chest */}
            <div className="my-auto z-10 flex items-center justify-center gap-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center max-w-xs shadow-2xl backdrop-blur-sm">
                <span className="text-3xl sm:text-4xl block mb-1">🎁 💎 🎒</span>
                <div className="text-xs font-black text-amber-200">EPIC STARTER BUNDLE</div>
                <p className="text-[10px] text-zinc-300 font-mono-code mt-0.5 mb-2.5">
                  Instant +500 Gems &amp; Rare Adventurer Backpack
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!claimed) {
                      setGemCount((c) => c + 500);
                      setClaimed(true);
                    }
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    claimed
                      ? 'bg-emerald-600 text-white cursor-default'
                      : 'bg-amber-400 hover:bg-amber-300 text-neutral-950 shadow-md cursor-pointer active:scale-95'
                  }`}
                >
                  {claimed ? 'CLAIMED! (+500 GEMS)' : 'TEST PURCHASE ($0.99)'}
                </button>
              </div>
            </div>

            <div className="z-10 flex items-center justify-between pt-2 border-t border-white/10 text-[10px] font-mono-code text-purple-200">
              <span>HUD PERFORMANCE: 60 FPS</span>
              <span className="text-emerald-400">+42% STARTER ADOPTION</span>
            </div>
          </div>
        )}

        {/* 5. INSPIRE MONO DYNAMIC SWITCHER (Exact reference to video frame 00:08 - 00:10) */}
        {previewType === 'wasm-interactive' && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setInspireMode((m) => (m === 'orange' ? 'cyan' : 'orange'));
            }}
            className={`relative w-full h-full p-5 sm:p-7 flex flex-col justify-between text-white transition-colors duration-500 overflow-hidden ${
              inspireMode === 'orange'
                ? 'bg-gradient-to-br from-[#121212] via-[#1c0d0d] to-[#0c0404]'
                : 'bg-gradient-to-br from-[#d4f3ef] via-[#aee8e0] to-[#7bd8cc] text-neutral-900'
            }`}
          >
            <div className="flex items-center justify-between z-10">
              <span
                className={`text-xs font-bold tracking-tight font-sans ${
                  inspireMode === 'orange' ? 'text-zinc-300' : 'text-neutral-900'
                }`}
              >
                INSPIRE MONO // KINETIC TYPE
              </span>
              <span
                className={`text-[10px] font-mono-code ${
                  inspireMode === 'orange' ? 'text-zinc-500' : 'text-neutral-700'
                }`}
              >
                CLICK TO TOGGLE PALETTE
              </span>
            </div>

            {/* Center Pill Logo with Animated Toggle exactly like video 00:08 */}
            <div className="my-auto z-10 flex items-center justify-center">
              <div
                className={`rounded-full px-6 sm:px-8 py-3.5 sm:py-4.5 flex items-center gap-3 shadow-2xl transition-all duration-300 transform group-hover:scale-105 ${
                  inspireMode === 'orange'
                    ? 'bg-[#ea3822] text-white'
                    : 'bg-[#18181b] text-white'
                }`}
              >
                <span className="font-extrabold text-xl sm:text-2xl tracking-tight font-sans">
                  Inspire
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs sm:text-sm font-mono-code font-bold ${
                    inspireMode === 'orange' ? 'bg-white text-black' : 'bg-cyan-400 text-black'
                  }`}
                >
                  Mono
                </span>
              </div>
            </div>

            <div
              className={`z-10 flex items-center justify-between pt-2 border-t text-[10px] font-mono-code ${
                inspireMode === 'orange' ? 'border-white/10 text-zinc-400' : 'border-neutral-900/10 text-neutral-700'
              }`}
            >
              <span>INTERACTIVE FONT ENGINE</span>
              <span>2025 RELEASE</span>
            </div>
          </div>
        )}
      </div>

      {/* Card Monospace Metadata Bottom Bar (Exact replica of video layout) */}
      <div className="w-full mt-3 flex items-center justify-between text-xs font-mono-code text-neutral-800">
        <span className="font-bold uppercase tracking-tight text-neutral-900 font-sans">
          {title}
        </span>
        <span className="text-neutral-500 text-[11px] hidden sm:inline">
          {coords}
        </span>
        <span className="font-semibold text-neutral-700">
          {year}
        </span>
      </div>
    </div>
  );
}
