import React from 'react';
import { Box, Typography, keyframes } from '@mui/material';

// Spooky animations
const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
`;

const ghostWobble = keyframes`
  0%, 100% { transform: rotate(-3deg); }
  50% { transform: rotate(3deg); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.05); }
`;

const flicker = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
  75% { opacity: 0.9; }
`;

const skeletonShimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// New spooky animations
const floatAcross = keyframes`
  0% { transform: translateX(-100px) translateY(0); opacity: 0; }
  10% { opacity: 0.3; }
  90% { opacity: 0.3; }
  100% { transform: translateX(calc(100vw + 100px)) translateY(-20px); opacity: 0; }
`;

const swing = keyframes`
  0%, 100% { transform: rotate(-5deg); }
  50% { transform: rotate(5deg); }
`;

const spookyGlow = keyframes`
  0%, 100% { 
    text-shadow: 0 0 10px #a855f7, 0 0 20px #a855f7, 0 0 30px #a855f7;
    filter: brightness(1);
  }
  50% { 
    text-shadow: 0 0 20px #f97316, 0 0 40px #f97316, 0 0 60px #f97316;
    filter: brightness(1.2);
  }
`;

const candleFlicker = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  25% { opacity: 0.8; transform: scale(0.98); }
  50% { opacity: 0.9; transform: scale(1.02); }
  75% { opacity: 0.85; transform: scale(0.99); }
`;

const fogDrift = keyframes`
  0% { transform: translateX(-10%) translateY(0); opacity: 0.1; }
  50% { opacity: 0.15; }
  100% { transform: translateX(10%) translateY(-5px); opacity: 0.1; }
`;

// Ghost icon for anomalies
export const GhostIcon: React.FC<{ size?: number; color?: string }> = ({ 
  size = 24, 
  color = '#a855f7' 
}) => (
  <Box
    component="span"
    sx={{
      display: 'inline-flex',
      fontSize: size,
      animation: `${float} 3s ease-in-out infinite, ${ghostWobble} 2s ease-in-out infinite`,
      filter: `drop-shadow(0 0 8px ${color}40)`,
    }}
  >
    👻
  </Box>
);

// Pumpkin icon for warnings
export const PumpkinIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <Box
    component="span"
    sx={{
      display: 'inline-flex',
      fontSize: size,
      animation: `${pulse} 2s ease-in-out infinite`,
      filter: 'drop-shadow(0 0 8px #f97316)',
    }}
  >
    🎃
  </Box>
);

// Skull icon for critical alerts
export const SkullIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <Box
    component="span"
    sx={{
      display: 'inline-flex',
      fontSize: size,
      animation: `${flicker} 1.5s ease-in-out infinite`,
      filter: 'drop-shadow(0 0 6px #ef4444)',
    }}
  >
    💀
  </Box>
);

// Bat icon for cost spikes
export const BatIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <Box
    component="span"
    sx={{
      display: 'inline-flex',
      fontSize: size,
      animation: `${float} 2s ease-in-out infinite`,
    }}
  >
    🦇
  </Box>
);

// Spider web decoration
export const SpiderWebIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <Box
    component="span"
    sx={{
      display: 'inline-flex',
      fontSize: size,
      opacity: 0.6,
    }}
  >
    🕸️
  </Box>
);

// Skeleton loading component with Halloween theme
export const SkeletonLoader: React.FC<{ 
  width?: string | number; 
  height?: string | number;
  variant?: 'text' | 'rectangular' | 'circular';
}> = ({ 
  width = '100%', 
  height = 20,
  variant = 'rectangular'
}) => (
  <Box
    sx={{
      width,
      height,
      borderRadius: variant === 'circular' ? '50%' : variant === 'text' ? 1 : 2,
      background: 'linear-gradient(90deg, rgba(168, 85, 247, 0.1) 25%, rgba(168, 85, 247, 0.2) 50%, rgba(168, 85, 247, 0.1) 75%)',
      backgroundSize: '200% 100%',
      animation: `${skeletonShimmer} 1.5s ease-in-out infinite`,
    }}
  />
);

// Cost spike warning with Halloween flair
export const SpookyCostWarning: React.FC<{ 
  message: string; 
  severity: 'low' | 'medium' | 'high' | 'critical';
}> = ({ message, severity }) => {
  const getIcon = () => {
    switch (severity) {
      case 'critical': return <SkullIcon size={20} />;
      case 'high': return <PumpkinIcon size={20} />;
      case 'medium': return <GhostIcon size={20} />;
      default: return <BatIcon size={20} />;
    }
  };

  const getColor = () => {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#a855f7';
      default: return '#64748b';
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1.5,
        borderRadius: 2,
        background: `linear-gradient(135deg, ${getColor()}15 0%, ${getColor()}05 100%)`,
        border: `1px solid ${getColor()}30`,
      }}
    >
      {getIcon()}
      <Typography variant="body2" sx={{ color: getColor(), fontWeight: 500 }}>
        {message}
      </Typography>
    </Box>
  );
};

// Halloween badge for the app - Enhanced version
export const HalloweenBadge: React.FC = () => (
  <Box
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.5,
      px: 2,
      py: 0.75,
      borderRadius: 3,
      background: 'linear-gradient(135deg, #f97316 0%, #dc2626 50%, #a855f7 100%)',
      color: 'white',
      fontSize: '0.8rem',
      fontWeight: 800,
      letterSpacing: '0.5px',
      animation: `${pulse} 2.5s ease-in-out infinite`,
      boxShadow: '0 4px 20px rgba(249, 115, 22, 0.4), 0 0 30px rgba(168, 85, 247, 0.3)',
      border: '1px solid rgba(255,255,255,0.2)',
      textTransform: 'uppercase',
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: '-100%',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
        animation: 'shimmer 3s infinite',
      },
      '@keyframes shimmer': {
        '0%': { left: '-100%' },
        '100%': { left: '100%' },
      },
    }}
  >
    <Box component="span" sx={{ animation: `${swing} 1s ease-in-out infinite` }}>🎃</Box>
    <span>KIROWEEN 2025</span>
    <Box component="span" sx={{ animation: `${float} 2s ease-in-out infinite` }}>👻</Box>
  </Box>
);

// Floating decorations for dashboard - Enhanced version
export const FloatingDecorations: React.FC = () => (
  <Box
    sx={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none',
      zIndex: 0,
      overflow: 'hidden',
    }}
  >
    {/* Subtle fog effect at bottom */}
    <Box
      sx={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '150px',
        background: 'linear-gradient(to top, rgba(168, 85, 247, 0.05), transparent)',
        animation: `${fogDrift} 8s ease-in-out infinite alternate`,
      }}
    />

    {/* Top left spider web - larger and more visible */}
    <Box
      sx={{
        position: 'absolute',
        top: 70,
        left: 260,
        fontSize: 50,
        opacity: 0.25,
        transform: 'rotate(-15deg)',
        filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.3))',
      }}
    >
      🕸️
    </Box>

    {/* Spider hanging from web */}
    <Box
      sx={{
        position: 'absolute',
        top: 130,
        left: 290,
        fontSize: 18,
        opacity: 0.3,
        animation: `${swing} 3s ease-in-out infinite`,
      }}
    >
      🕷️
    </Box>
    
    {/* Floating bat 1 */}
    <Box
      sx={{
        position: 'absolute',
        top: 100,
        right: 80,
        fontSize: 28,
        opacity: 0.25,
        animation: `${float} 3s ease-in-out infinite`,
        filter: 'drop-shadow(0 0 8px rgba(100, 100, 100, 0.5))',
      }}
    >
      🦇
    </Box>

    {/* Floating bat 2 - crosses screen slowly */}
    <Box
      sx={{
        position: 'absolute',
        top: '20%',
        left: 0,
        fontSize: 22,
        animation: `${floatAcross} 25s linear infinite`,
        animationDelay: '5s',
      }}
    >
      🦇
    </Box>

    {/* Ghost floating across */}
    <Box
      sx={{
        position: 'absolute',
        top: '40%',
        left: 0,
        fontSize: 26,
        animation: `${floatAcross} 30s linear infinite`,
        animationDelay: '15s',
      }}
    >
      👻
    </Box>
    
    {/* Bottom right pumpkin - glowing */}
    <Box
      sx={{
        position: 'absolute',
        bottom: 30,
        right: 30,
        fontSize: 40,
        opacity: 0.3,
        animation: `${candleFlicker} 2s ease-in-out infinite`,
        filter: 'drop-shadow(0 0 15px rgba(249, 115, 22, 0.6))',
      }}
    >
      🎃
    </Box>

    {/* Bottom left skull */}
    <Box
      sx={{
        position: 'absolute',
        bottom: 40,
        left: 280,
        fontSize: 28,
        opacity: 0.2,
        animation: `${flicker} 3s ease-in-out infinite`,
      }}
    >
      💀
    </Box>

    {/* Candle decoration */}
    <Box
      sx={{
        position: 'absolute',
        bottom: 25,
        left: 320,
        fontSize: 24,
        opacity: 0.25,
        animation: `${candleFlicker} 1.5s ease-in-out infinite`,
        filter: 'drop-shadow(0 0 10px rgba(249, 115, 22, 0.5))',
      }}
    >
      🕯️
    </Box>

    {/* Top right corner web */}
    <Box
      sx={{
        position: 'absolute',
        top: 65,
        right: 20,
        fontSize: 35,
        opacity: 0.2,
        transform: 'rotate(15deg) scaleX(-1)',
      }}
    >
      🕸️
    </Box>

    {/* Floating stars/sparkles for magic effect */}
    <Box
      sx={{
        position: 'absolute',
        top: '30%',
        right: '15%',
        fontSize: 16,
        opacity: 0.2,
        animation: `${pulse} 2s ease-in-out infinite`,
        animationDelay: '0.5s',
      }}
    >
      ✨
    </Box>
    <Box
      sx={{
        position: 'absolute',
        top: '50%',
        left: '20%',
        fontSize: 14,
        opacity: 0.15,
        animation: `${pulse} 2.5s ease-in-out infinite`,
        animationDelay: '1s',
      }}
    >
      ✨
    </Box>
  </Box>
);

// Spooky Welcome Title for landing page
export const SpookyWelcomeTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography
    variant="h4"
    sx={{
      fontWeight: 800,
      background: 'linear-gradient(135deg, #667eea 0%, #a855f7 50%, #f97316 100%)',
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      position: 'relative',
      display: 'inline-block',
      '&::after': {
        content: '"👻"',
        position: 'absolute',
        right: -40,
        top: -5,
        fontSize: '1.5rem',
        animation: `${float} 2s ease-in-out infinite`,
      },
    }}
  >
    {children}
  </Typography>
);

// Halloween-themed button
export const SpookyButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  startIcon?: React.ReactNode;
}> = ({ children, onClick, startIcon }) => (
  <Box
    component="button"
    onClick={onClick}
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 1,
      px: 4,
      py: 1.5,
      fontSize: '1rem',
      fontWeight: 700,
      color: 'white',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f97316 100%)',
      backgroundSize: '200% 200%',
      border: 'none',
      borderRadius: 3,
      cursor: 'pointer',
      boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4), 0 0 30px rgba(249, 115, 22, 0.2)',
      transition: 'all 0.3s ease',
      position: 'relative',
      overflow: 'hidden',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 6px 30px rgba(102, 126, 234, 0.5), 0 0 40px rgba(249, 115, 22, 0.3)',
        backgroundPosition: '100% 0',
      },
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: '-100%',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
        transition: 'left 0.5s ease',
      },
      '&:hover::before': {
        left: '100%',
      },
    }}
  >
    {startIcon}
    {children}
    <Box component="span" sx={{ ml: 0.5, animation: `${pulse} 1.5s ease-in-out infinite` }}>
      🎃
    </Box>
  </Box>
);

// Spooky cloud icon for landing
export const SpookyCloudIcon: React.FC<{ size?: number }> = ({ size = 80 }) => (
  <Box
    sx={{
      position: 'relative',
      display: 'inline-block',
    }}
  >
    <Box
      sx={{
        fontSize: size,
        filter: 'drop-shadow(0 0 20px rgba(102, 126, 234, 0.5))',
        animation: `${float} 3s ease-in-out infinite`,
      }}
    >
      ☁️
    </Box>
    {/* Ghost peeking from cloud */}
    <Box
      sx={{
        position: 'absolute',
        bottom: -5,
        right: -10,
        fontSize: size * 0.4,
        animation: `${ghostWobble} 2s ease-in-out infinite`,
        filter: 'drop-shadow(0 0 10px rgba(168, 85, 247, 0.5))',
      }}
    >
      👻
    </Box>
  </Box>
);

// Halloween card wrapper
export const SpookyCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box
    sx={{
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: -2,
        left: -2,
        right: -2,
        bottom: -2,
        background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.3), rgba(168, 85, 247, 0.3))',
        borderRadius: 4,
        zIndex: -1,
        opacity: 0,
        transition: 'opacity 0.3s ease',
      },
      '&:hover::before': {
        opacity: 1,
      },
    }}
  >
    {children}
  </Box>
);

// Animated cost number with spooky effect
export const SpookyCostDisplay: React.FC<{ amount: number; label?: string }> = ({ amount, label }) => (
  <Box sx={{ textAlign: 'center' }}>
    <Typography
      variant="h3"
      sx={{
        fontWeight: 800,
        color: amount > 1000 ? '#ef4444' : amount > 100 ? '#f97316' : '#22c55e',
        textShadow: amount > 1000 
          ? '0 0 20px rgba(239, 68, 68, 0.5)' 
          : '0 0 20px rgba(34, 197, 94, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
      }}
    >
      {amount > 1000 && <SkullIcon size={32} />}
      ${amount.toFixed(2)}
      {amount > 500 && amount <= 1000 && <PumpkinIcon size={28} />}
    </Typography>
    {label && (
      <Typography variant="body2" color="textSecondary">
        {label}
      </Typography>
    )}
  </Box>
);

export default {
  GhostIcon,
  PumpkinIcon,
  SkullIcon,
  BatIcon,
  SpiderWebIcon,
  SkeletonLoader,
  SpookyCostWarning,
  HalloweenBadge,
  FloatingDecorations,
  SpookyWelcomeTitle,
  SpookyButton,
  SpookyCloudIcon,
  SpookyCard,
  SpookyCostDisplay,
};
