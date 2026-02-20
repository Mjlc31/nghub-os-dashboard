import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
    containerClassName?: string;
    options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ label, error, icon, className = '', containerClassName = '', options, ...props }, ref) => {
        return (
            <div className={`group ${containerClassName}`}>
                {label && (
                    <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 group-focus-within:text-brand-gold transition-colors">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {icon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-brand-gold transition-colors flex items-center justify-center pointer-events-none">
                            {icon}
                        </div>
                    )}
                    <select
                        ref={ref}
                        className={`
              w-full bg-brand-dark border rounded-lg text-zinc-200 text-sm 
              focus:outline-none focus:ring-1 transition-all placeholder-zinc-700 shadow-inner appearance-none
              ${icon ? 'pl-10 pr-10' : 'px-4 pr-10'} py-3 
              ${error
                                ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
                                : 'border-brand-border focus:border-brand-gold focus:ring-brand-gold/20'
                            }
              ${className}
            `}
                        {...props}
                    >
                        {options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 group-focus-within:text-brand-gold transition-colors">
                        <ChevronDown className="w-4 h-4" />
                    </div>
                </div>
                {error && (
                    <p className="mt-1 text-xs text-red-400 animate-slide-up-fast flex items-center gap-1">
                        {error}
                    </p>
                )}
            </div>
        );
    }
);

Select.displayName = 'Select';
