import { useState, useEffect, useRef } from 'react';
import { Globe } from 'lucide-react';

interface AsteriskTransitionCardProps {
  scrollVelocity?: number;
}

export function AsteriskTransitionCard({ scrollVelocity = 0 }: AsteriskTransitionCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 1269, y: 8693 });
  const [rotation, setRotation] = useState(0);

  // Mouse coordinate tracker & Asterisk rotation
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const relX = Math.round((e.clientX - rect.left) * 2.8);
    const relY = Math.round((e.clientY - rect.top) * 3.4);
    setCoords({ x: 1000 + relX, y: 8000 + relY });
  };

  useEffect(() => {
    let frameId = 0;
    const animate = () => {
      setRotation((prev) => (prev + 0.5 + Math.abs(scrollVelocity) * 0.1) % 360);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [scrollVelocity]);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className="w-full max-w-4xl mx-auto mb-14 sm:mb-20 rounded-2xl bg-[#D6D4CE] border border-black/15 p-8 sm:p-14 shadow-sm hover:shadow-lg transition-all relative overflow-hidden select-none cursor-crosshair group"
    >
      {/* Top Right Neon Lime Badge from Video */}
      <div className="absolute top-4 right-4 z-20">
        <span className="px-2.5 py-1 bg-[#c6ff00] text-black text-[10px] sm:text-[11px] font-mono-code font-bold tracking-tight uppercase rounded-sm shadow-sm">
          CODING PROJECT
        </span>
      </div>

      {/* Center Signature 5-Arm Rotating Asterisk from Video */}
      <div className="min-h-[220px] sm:min-h-[280px] flex items-center justify-center relative">
        <svg
          className="w-24 h-24 sm:w-32 sm:h-32 text-[#111111] transition-transform duration-75"
          style={{ transform: `rotate(${rotation}deg)` }}
          viewBox="0 0 100 100"
          fill="currentColor"
        >
          {/* 5-Arm Bold Graphic Asterisk */}
          <g transform="translate(50, 50)">
            {[0, 72, 144, 216, 288].map((angle, i) => (
              <rect
                key={i}
                x="-8"
                y="-42"
                width="16"
                height="34"
                rx="8"
                transform={`rotate(${angle})`}
              />
            ))}
            <circle cx="0" cy="0" r="14" />
          </g>
        </svg>
      </div>

      {/* Bottom Monospace Metadata Bar exactly like in video */}
      <div className="flex items-center justify-between text-xs font-mono-code text-neutral-800 pt-4 border-t border-black/10">
        <span className="font-bold tracking-wider uppercase text-neutral-900 font-sans">
          REUNIMOS™
        </span>
        <span className="text-neutral-600 font-semibold tracking-wider">
          {coords.x} X {coords.y} Y
        </span>
        <div className="flex items-center gap-2">
          <span>2024-2026</span>
          <Globe className="w-3.5 h-3.5 animate-spin [animation-duration:12s] text-neutral-600" />
        </div>
      </div>
    </div>
  );
}
