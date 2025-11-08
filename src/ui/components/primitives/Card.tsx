import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: ReactNode;
}

/**
 * Card Primitive Component
 *
 * Dual-theme card with optional glassmorphism effect.
 * Variants:
 * - default: Standard card with border
 * - glass: Glassmorphic effect (dark mode only)
 * - elevated: Extra shadow for emphasis
 */
export function Card({
  variant = 'default',
  padding = 'md',
  className = '',
  children,
  ...props
}: CardProps) {
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const variantStyles = {
    default: 'bg-surface border border-border shadow-md',
    glass: 'glass-surface', // Defined in tokens.css for dark mode
    elevated: 'bg-surface-elevated border border-border shadow-xl',
  };

  return (
    <div
      className={`rounded-lg ${paddingStyles[padding]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
