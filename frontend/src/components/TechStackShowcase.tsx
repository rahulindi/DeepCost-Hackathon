import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Tooltip,
  Paper
} from '@mui/material';
import {
  Cloud as CloudIcon,
  Psychology as AIIcon,
  Storage as DatabaseIcon,
  BarChart as ChartIcon,
  Webhook as WebhookIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Notifications as NotificationIcon
} from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';

interface TechItem {
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  category: string;
}

export const TechStackShowcase: React.FC = () => {
  const { isDarkMode } = useTheme();

  const techStack: TechItem[] = [
    {
      name: 'AWS Cost Explorer',
      description: 'Real-time cost data from AWS APIs',
      icon: <CloudIcon />,
      color: '#FF9900',
      category: 'Data Source'
    },
    {
      name: 'Google Gemini AI',
      description: 'Intelligent cost analysis & recommendations',
      icon: <AIIcon />,
      color: '#4285F4',
      category: 'AI/ML'
    },
    {
      name: 'PostgreSQL',
      description: 'Persistent data storage & caching',
      icon: <DatabaseIcon />,
      color: '#336791',
      category: 'Database'
    },
    {
      name: 'Chart.js + Recharts',
      description: 'Beautiful data visualizations',
      icon: <ChartIcon />,
      color: '#FF6384',
      category: 'Visualization'
    },
    {
      name: 'Webhooks',
      description: 'Real-time event notifications',
      icon: <WebhookIcon />,
      color: '#10B981',
      category: 'Integration'
    },
    {
      name: 'Slack Integration',
      description: 'Team notifications & slash commands',
      icon: <NotificationIcon />,
      color: '#4A154B',
      category: 'Integration'
    },
    {
      name: 'ARIMA Forecasting',
      description: 'ML-powered cost predictions',
      icon: <SpeedIcon />,
      color: '#8B5CF6',
      category: 'AI/ML'
    },
    {
      name: 'JWT + Encryption',
      description: 'Enterprise-grade security',
      icon: <SecurityIcon />,
      color: '#EF4444',
      category: 'Security'
    }
  ];

  const categories = Array.from(new Set(techStack.map(t => t.category)));

  return (
    <Card sx={{
      background: isDarkMode
        ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(51, 65, 85, 0.9) 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
      borderRadius: 3,
      overflow: 'hidden'
    }}>
      <CardContent>
        {/* Header */}
        <Box sx={{ mb: 3, textAlign: 'center', position: 'relative' }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              mb: 1,
              background: isDarkMode
                ? 'linear-gradient(135deg, #60a5fa 0%, #a855f7 50%, #f97316 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f97316 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Box 
              component="span" 
              sx={{ 
                animation: 'zombieWalk 2s ease-in-out infinite',
                '@keyframes zombieWalk': {
                  '0%, 100%': { transform: 'rotate(-5deg)' },
                  '50%': { transform: 'rotate(5deg)' },
                },
              }}
            >
              🧟
            </Box>
            Frankenstein Tech Stack
            <Box 
              component="span" 
              sx={{ 
                animation: 'pumpkinGlow 2s ease-in-out infinite',
                '@keyframes pumpkinGlow': {
                  '0%, 100%': { filter: 'brightness(1)', transform: 'scale(1)' },
                  '50%': { filter: 'brightness(1.3)', transform: 'scale(1.1)' },
                },
              }}
            >
              🎃
            </Box>
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Stitched together from the best technologies to create something <em>monstrously</em> powerful 👻
          </Typography>
          {/* Decorative lightning bolts */}
          <Box
            sx={{
              position: 'absolute',
              top: -5,
              left: '10%',
              fontSize: 16,
              opacity: 0.3,
              animation: 'flicker 1.5s ease-in-out infinite',
              '@keyframes flicker': {
                '0%, 100%': { opacity: 0.3 },
                '50%': { opacity: 0.1 },
                '75%': { opacity: 0.4 },
              },
            }}
          >
            ⚡
          </Box>
          <Box
            sx={{
              position: 'absolute',
              top: -5,
              right: '10%',
              fontSize: 16,
              opacity: 0.3,
              animation: 'flicker 1.5s ease-in-out infinite',
              animationDelay: '0.5s',
            }}
          >
            ⚡
          </Box>
        </Box>

        {/* Tech Grid */}
        <Grid container spacing={2}>
          {techStack.map((tech, index) => (
            <Grid size={{ xs: 6, sm: 4, md: 3 }} key={tech.name}>
              <Tooltip title={tech.description} arrow placement="top">
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    background: isDarkMode
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(0, 0, 0, 0.02)',
                    border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: `0 8px 25px ${tech.color}40`,
                      borderColor: tech.color,
                      '& .tech-icon': {
                        transform: 'scale(1.2)',
                        color: tech.color
                      }
                    }
                  }}
                >
                  <Box
                    className="tech-icon"
                    sx={{
                      color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                      transition: 'all 0.3s ease',
                      mb: 1,
                      '& svg': { fontSize: 32 }
                    }}
                  >
                    {tech.icon}
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      mb: 0.5
                    }}
                  >
                    {tech.name}
                  </Typography>
                  <Chip
                    label={tech.category}
                    size="small"
                    sx={{
                      fontSize: '0.6rem',
                      height: 18,
                      bgcolor: `${tech.color}20`,
                      color: tech.color,
                      fontWeight: 600
                    }}
                  />
                </Paper>
              </Tooltip>
            </Grid>
          ))}
        </Grid>

        {/* Stats */}
        <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}` }}>
          <Grid container spacing={2} justifyContent="center">
            <Grid size={{ xs: 4 }}>
              <Box textAlign="center">
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#FF9900' }}>
                  8+
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Technologies
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <Box textAlign="center">
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#4285F4' }}>
                  15+
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Features
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <Box textAlign="center">
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#10B981' }}>
                  3
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  AI Models
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TechStackShowcase;
