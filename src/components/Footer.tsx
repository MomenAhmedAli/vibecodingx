interface FooterProps {
  onOpenContact?: () => void;
  onScrollToTop?: () => void;
}

export function Footer({ onOpenContact, onScrollToTop }: FooterProps) {
  const handleTop = () => {
    if (onScrollToTop) {
      onScrollToTop();
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer
      className="w-full relative z-20 pt-8 pb-16"
      style={{ borderTop: '1px solid var(--border-color)' }}
    >
      <div className="w-full px-[2.5%] grid grid-cols-12 items-center gap-y-4 font-pixel text-[10px] sm:text-[11px] uppercase">
        {/* Left Zone (Cols 1-4): Copyright */}
        <div className="col-span-12 md:col-span-4 px-2 sm:px-3 flex items-center gap-3">
          <span>MOAMEN © 2026</span>
        </div>

        {/* Middle Zone (Cols 5-8): Design Tagline */}
        <div className="col-span-6 md:col-span-4 px-2 sm:px-3 flex items-center opacity-70">
          <span>PRODUCT &amp; UX DESIGN</span>
        </div>

        {/* Right Zone (Cols 9-12): Aligned Links matching top bar */}
        <div className="col-span-6 md:col-span-4 px-2 sm:px-3 flex items-center justify-between gap-3">
          <a
            href="https://www.linkedin.com/in/supworld/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-65 transition-opacity"
          >
            LINKEDIN
          </a>
          <a
            href="https://www.behance.net/supworld"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-65 transition-opacity"
          >
            BEHANCE
          </a>
          {onOpenContact && (
            <button
              onClick={onOpenContact}
              className="hover:opacity-65 transition-opacity cursor-pointer"
            >
              EMAIL
            </button>
          )}
          <button
            onClick={handleTop}
            className="hover:opacity-65 transition-opacity cursor-pointer"
          >
            TOP ↑
          </button>
        </div>
      </div>
    </footer>
  );
}
