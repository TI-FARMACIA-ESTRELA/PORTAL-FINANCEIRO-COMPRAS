import { cn } from '@/utils/cn';

const LOGO_SRC = '/images/estrela-logo.png';

interface EstrelaLogoProps {
  className?: string;
  alt?: string;
}

export function EstrelaLogo({
  className,
  alt = 'Farmácias Estrela',
}: EstrelaLogoProps) {
  return (
    <img
      src={LOGO_SRC}
      alt={alt}
      className={cn('object-contain', className)}
      draggable={false}
    />
  );
}
