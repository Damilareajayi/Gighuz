import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'mark';
  className?: string;
}

const sizes = { sm: 28, md: 36, lg: 48 };

export function Logo({ size = 'md', variant = 'full', className }: LogoProps) {
  const h = sizes[size];

  if (variant === 'mark') {
    return (
      <Image
        src="/brand/gighuz-icon-512.png"
        alt="GigHuz"
        width={h}
        height={h}
        className={cn('object-contain', className)}
      />
    );
  }

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <Image
        src="/brand/gighuz-icon-512.png"
        alt="GigHuz icon"
        width={h}
        height={h}
        className="object-contain"
      />
      <span style={{ fontSize: h * 0.55 }} className="font-bold tracking-tight leading-none">
        <span className="text-teal-700">Gig</span>
        <span className="text-orange-600">Huz</span>
      </span>
    </div>
  );
}

// Inline SVG mark for sidebar (no image request)
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" fill="#1A5F7A" rx="12"/>
      <path d="M32 10C19.8 10 10 19.8 10 32C10 44.2 19.8 54 32 54C44.2 54 54 44.2 54 36L38 36L38 44C36.1 44.8 34.1 45.2 32 45.2C22.4 45.2 14.8 38.6 14.8 32C14.8 25.4 22.4 18.8 32 18.8C37 18.8 41.4 20.8 44.6 24L50.4 18.2C46.2 14 39.4 10 32 10Z"
        fill="white" opacity="0.95"/>
      <circle cx="50" cy="14" r="9" fill="#E8741A"/>
    </svg>
  );
}
