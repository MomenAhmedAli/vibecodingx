interface ProjectLogoRevealProps {
  title: string;
  hoverImageSrc: string;
  isHovered: boolean;
}

/**
 * HTML fallback circular center-to-edges hover reveal (only active if WebGL is unavailable).
 * When WebGL is active, DomSyncWebGL performs the circular reveal inside the scroll-shaded shader
 * so scroll shade & lens curvature stay unbroken while hovering.
 */
export function ProjectLogoReveal({
  title,
  hoverImageSrc,
  isHovered,
}: ProjectLogoRevealProps) {
  return (
    <div
      className="absolute inset-0 z-10 pointer-events-none transition-[clip-path,opacity] duration-450 ease-out"
      style={{
        clipPath: isHovered ? 'circle(150% at 50% 50%)' : 'circle(0% at 50% 50%)',
        opacity: isHovered ? 1 : 0,
      }}
    >
      <img
        src={hoverImageSrc}
        alt={`${title} — Alternate View`}
        className={`w-full h-full object-cover rounded-none transition-transform duration-500 ease-out will-change-transform ${
          isHovered ? 'scale-100' : 'scale-[1.15]'
        }`}
      />
    </div>
  );
}
