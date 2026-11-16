interface GridCrosshairProps {
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  className?: string;
}

export function GridCrosshair({ position = 'bottom-right', className = '' }: GridCrosshairProps) {
  const positionClasses = {
    'bottom-left': '-bottom-[7px] -left-[4.5px]',
    'bottom-right': '-bottom-[7px] -right-[4.5px]',
    'top-left': '-top-[7px] -left-[4.5px]',
    'top-right': '-top-[7px] -right-[4.5px]',
  }[position];

  return (
    <span
      className={`absolute ${positionClasses} crosshair-marker text-xs font-mono font-normal leading-none z-20 pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      +
    </span>
  );
}
