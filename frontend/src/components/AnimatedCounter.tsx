// Create new file: /Users/rahulindi/aws-cost-tracker/frontend/src/components/AnimatedCounter.tsx
import React, { useState, useEffect } from 'react';
import { Typography } from '@mui/material';

interface AnimatedCounterProps {
    value: number;
    duration?: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
    variant?: any;
    sx?: any;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
    value,
    duration = 1000,
    prefix = '',
    suffix = '',
    decimals = 2,
    variant = 'h4',
    sx = {}
}) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let startTime: number;
        let animationFrame: number;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);

            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            setDisplayValue(value * easeOutQuart);

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [value, duration]);

    return (
        <Typography variant={variant} sx={sx}>
            {prefix}{displayValue.toFixed(decimals)}{suffix}
        </Typography>
    );
};

export { };