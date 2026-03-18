import React, { forwardRef } from 'react';
import { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    icon?: React.ReactNode | LucideIcon;
    containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, hint, icon, className = '', containerClassName = '', ...props }, ref) => {
        const Icon = icon as any;
        return (
            <div className={`group ${containerClassName}`}>
                {label && (
                    <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 group-focus-within:text-brand-gold transition-colors">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {icon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-brand-gold transition-colors pointer-events-none flex items-center justify-center">
                            {React.isValidElement(icon) ? (
                                React.cloneElement(icon as React.ReactElement, {
                                    className: `w-4 h-4 ${(icon.props as any).className || ''}`
                                })
                            ) : typeof icon === 'function' || (typeof icon === 'object' && icon !== null && (icon as any).render) ? (
                                <Icon className="w-4 h-4" />
                            ) : (
                                icon as React.ReactNode
                            )}
                        </div>
                    )}
                    <input
                        ref={ref}
                        className={`
              w-full bg-brand-dark border rounded-lg text-zinc-200 text-sm
              focus:outline-none focus:ring-1 transition-all placeholder:text-zinc-700 shadow-inner
              ${Icon ? 'pl-10 pr-4' : 'px-4'} py-3
              ${error
                                ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
                                : 'border-brand-border focus:border-brand-gold focus:ring-brand-gold/20'
                            }
              ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''}
              ${className}
            `}
                        {...props}
                    />
                </div>
                {hint && !error && (
                    <p className="mt-1 text-[11px] text-zinc-600">{hint}</p>
                )}
                {error && (
                    <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                        {error}
                    </p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';
