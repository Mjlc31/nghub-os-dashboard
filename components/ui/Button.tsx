import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    icon,
    className = '',
    disabled,
    ...props
}) => {
    const baseStyles = "inline-flex items-center justify-center font-bold tracking-wide transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#050505] disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]";

    const variants = {
        primary: "bg-brand-gold text-black hover:bg-[#E5C158] shadow-[0_4px_20px_rgba(212,175,55,0.15)] hover:shadow-[0_4px_30px_rgba(212,175,55,0.3)] border border-transparent",
        secondary: "bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600",
        outline: "bg-transparent text-zinc-300 border border-zinc-700 hover:border-brand-gold/50 hover:text-brand-gold hover:bg-brand-gold/5",
        ghost: "bg-transparent text-zinc-400 hover:text-white hover:bg-white/5",
        danger: "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
    };

    const sizes = {
        sm: "px-3 py-1.5 text-xs gap-1.5",
        md: "px-4 py-2.5 text-sm gap-2",
        lg: "px-6 py-3.5 text-base gap-2.5"
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={isLoading || disabled}
            {...props}
        >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {!isLoading && icon && <span className="flex-shrink-0">{icon}</span>}
            {children}
        </button>
    );
};
