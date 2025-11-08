import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

/**
 * Button Primitive Component
 *
 * Dual-theme button with gradient backgrounds and hover effects.
 * Variants:
 * - primary: Gradient with glow (default)
 * - secondary: Solid accent color
 * - outline: Border only
 * - ghost: No background
 */
export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'font-semibold transition-all duration-200 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-3 text-base',
    lg: 'px-6 py-4 text-lg',
  };

  const variantStyles = {
    primary: 'text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed',
    secondary: 'bg-accent hover:bg-accent-hover text-white shadow-md hover:shadow-lg disabled:opacity-50',
    outline: 'border-2 border-accent text-accent hover:bg-accent hover:text-white disabled:opacity-50',
    ghost: 'text-accent hover:bg-accent/10 disabled:opacity-50',
  };

  const gradientStyle = variant === 'primary' ? {
    background: 'var(--gradient-brand)',
  } : undefined;

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (variant === 'primary' && !disabled) {
      e.currentTarget.style.boxShadow = '0 0 24px rgba(99, 102, 241, 0.35)';
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (variant === 'primary') {
      e.currentTarget.style.boxShadow = '';
    }
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      style={gradientStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
