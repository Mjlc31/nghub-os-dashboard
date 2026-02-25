import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    className?: string;
    variant?: 'rectangular' | 'circular' | 'rounded';
}

export function Skeleton({
    className = '',
    variant = 'rounded',
    ...props
}: SkeletonProps) {
    const baseClasses = 'animate-pulse bg-zinc-800/80';

    const variantClasses = {
        rectangular: '',
        circular: 'rounded-full',
        rounded: 'rounded-xl', // Silicon Valley standard rounded styling
    };

    return (
        <div
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
            {...props}
        />
    );
}
