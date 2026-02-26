import React from 'react';
import { Loader2, LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    icon?: LucideIcon;
    iconPosition?: 'left' | 'right';
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    icon: Icon,
    iconPosition = 'left',
    className = '',
    disabled,
    ...props
}) => {
    const baseStyles = "inline-flex items-center justify-center font-semibold tracking-wide transition-all duration-200 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-darker disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98] select-none";

    const variants: Record<string, string> = {
        primary: "bg-brand-gold text-black hover:bg-[#E5C158] shadow-[0_4px_20px_rgba(212,175,55,0.15)] hover:shadow-[0_4px_30px_rgba(212,175,55,0.3)] focus-visible:ring-brand-gold border border-transparent",
        secondary: "bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 focus-visible:ring-zinc-600",
        outline: "bg-transparent text-zinc-300 border border-zinc-700 hover:border-brand-gold/50 hover:text-brand-gold hover:bg-brand-gold/5 focus-visible:ring-brand-gold",
        ghost: "bg-transparent text-zinc-400 hover:text-white hover:bg-white/5 focus-visible:ring-zinc-600",
        danger: "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 focus-visible:ring-red-500",
    };

    const sizes: Record<string, string> = {
        sm: "px-3 py-1.5 text-xs gap-1.5",
        md: "px-4 py-2.5 text-sm gap-2",
        lg: "px-6 py-3.5 text-base gap-2.5",
    };

    const iconSize: Record<string, string> = {
        sm: "w-3.5 h-3.5",
        md: "w-4 h-4",
        lg: "w-5 h-5",
    };

    const renderIcon = () => {
        if (isLoading) return <Loader2 className={`${iconSize[size]} animate-spin`} />;
        if (Icon) return <Icon className={iconSize[size]} />;
        return null;
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={isLoading || disabled}
            aria-busy={isLoading}
            {...props}
        >
            {iconPosition === 'left' && renderIcon()}
            {children && <span>{children}</span>}
            {iconPosition === 'right' && !isLoading && renderIcon()}
        </button>
    );
};
