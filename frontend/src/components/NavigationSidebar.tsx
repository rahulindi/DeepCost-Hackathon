import React, { useState } from 'react';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  IconButton,
  Divider,
  Tooltip,
  useMediaQuery,
  useTheme as useMuiTheme,
  Typography,
  alpha,
  keyframes
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  AccountBalance as ResourceIcon,
  Warning as WarningIcon,
  AttachMoney as MoneyIcon,
  Security as SecurityIcon,
  ShowChart as ShowChartIcon,
  TrendingUp as ForecastIcon,
  AutoFixHigh as AutoFixHighIcon,
  BugReport as BugReportIcon,
  GetApp as GetAppIcon,
  Webhook as WebhookIcon,
  Storage as StorageIcon,
  ChevronLeft,
  ChevronRight,
  Speed as SpeedIcon,
  Shield as ShieldIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';

// Halloween animations
const subtleFloat = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
`;

const subtlePulse = keyframes`
  0%, 100% { opacity: 0.6; }
  50% { opacity: 0.9; }
`;

interface NavigationGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: NavigationItem[];
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  view: string;
}

interface NavigationSidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const DRAWER_WIDTH = 260;
const DRAWER_WIDTH_COLLAPSED = 72;

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  currentView,
  onViewChange,
  mobileOpen,
  onMobileClose
}) => {
  const { isDarkMode } = useTheme();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Sidebar is expanded if pinned OR hovered (Gmail-style)
  const isExpanded = isPinned || isHovered;

  // Color scheme for each group
  const groupColors = {
    core: { light: '#667eea', dark: '#60a5fa' },
    optimization: { light: '#f59e0b', dark: '#fbbf24' },
    governance: { light: '#10b981', dark: '#34d399' },
    integration: { light: '#8b5cf6', dark: '#a78bfa' }
  };

  // Individual feature colors for inactive state (modern, vibrant yet simple)
  const featureColors = {
    // Core Features
    dashboard: { light: '#3b82f6', dark: '#60a5fa' },      // Blue
    resources: { light: '#8b5cf6', dark: '#a78bfa' },      // Purple
    trends: { light: '#06b6d4', dark: '#22d3ee' },         // Cyan
    forecasting: { light: '#10b981', dark: '#34d399' },    // Green

    // Optimization
    anomalies: { light: '#ef4444', dark: '#f87171' },      // Red
    reserved: { light: '#f59e0b', dark: '#fbbf24' },       // Amber
    lifecycle: { light: '#8b5cf6', dark: '#a78bfa' },      // Purple

    // Governance
    compliance: { light: '#10b981', dark: '#34d399' },     // Green
    testing: { light: '#6366f1', dark: '#818cf8' },        // Indigo

    // Integration
    exports: { light: '#0ea5e9', dark: '#38bdf8' },        // Sky
    webhooks: { light: '#8b5cf6', dark: '#a78bfa' },       // Purple
    datalake: { light: '#06b6d4', dark: '#22d3ee' }        // Cyan
  };

  const navigationGroups: NavigationGroup[] = [
    {
      id: 'core',
      label: 'Core Features',
      icon: <DashboardIcon />,
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon />, view: 'dashboard' },
        { id: 'resources', label: 'Resources', icon: <ResourceIcon />, view: 'resource-allocation' },
        { id: 'trends', label: 'Trend Analysis', icon: <ShowChartIcon />, view: 'trends' },
        { id: 'forecasting', label: 'Forecasting', icon: <ForecastIcon />, view: 'business-forecast' }
      ]
    },
    {
      id: 'optimization',
      label: 'Optimization',
      icon: <SpeedIcon />,
      items: [
        { id: 'anomalies', label: 'Anomaly Detection', icon: <WarningIcon />, view: 'anomalies' },
        { id: 'reserved', label: 'Reserved Instances', icon: <MoneyIcon />, view: 'reserved-instances' },
        { id: 'lifecycle', label: 'Resource Lifecycle', icon: <AutoFixHighIcon />, view: 'lifecycle-management' }
      ]
    },
    {
      id: 'governance',
      label: 'Governance',
      icon: <ShieldIcon />,
      items: [
        { id: 'compliance', label: 'Compliance & Tags', icon: <SecurityIcon />, view: 'compliance-governance' },
      ]
    },
    {
      id: 'integration',
      label: 'Integration',
      icon: <LinkIcon />,
      items: [
        { id: 'exports', label: 'Export Manager', icon: <GetAppIcon />, view: 'export-manager' },
        { id: 'webhooks', label: 'Webhooks', icon: <WebhookIcon />, view: 'webhook-manager' },
        { id: 'datalake', label: 'Data Lake', icon: <StorageIcon />, view: 'data-lake-manager' }
      ]
    }
  ];

  const handleItemClick = (view: string) => {
    onViewChange(view);
    if (isMobile) {
      onMobileClose();
    }
  };

  const drawerContent = (
    <Box
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => !isMobile && setIsHovered(false)}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: isDarkMode
          ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)'
          : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        borderRight: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)'
      }}
    >
      {/* Sidebar Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 64
        }}
      >
        {isExpanded && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                background: isDarkMode
                  ? 'linear-gradient(135deg, #60a5fa 0%, #a855f7 50%, #f97316 100%)'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f97316 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent'
              }}
            >
              Navigation
            </Typography>
            {/* Halloween decoration */}
            <Box
              component="span"
              sx={{
                fontSize: '1rem',
                animation: `${subtleFloat} 3s ease-in-out infinite`,
                opacity: 0.7,
              }}
            >
              🎃
            </Box>
          </Box>
        )}
        {!isMobile && (
          <Tooltip title={isPinned ? 'Unpin sidebar' : 'Pin sidebar'} placement="right">
            <IconButton
              onClick={() => setIsPinned(!isPinned)}
              size="small"
              sx={{
                color: isPinned
                  ? (isDarkMode ? '#60a5fa' : '#667eea')
                  : (isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)'),
                transition: 'color 0.2s ease'
              }}
            >
              {isPinned ? <ChevronLeft /> : <ChevronRight />}
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Divider sx={{ opacity: 0.1 }} />

      {/* Navigation Groups */}
      <List sx={{ flex: 1, overflow: 'auto', py: 1, position: 'relative' }}>
        {/* Subtle Halloween decoration at bottom */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 1,
            opacity: 0.15,
            pointerEvents: 'none',
          }}
        >
          <Box component="span" sx={{ fontSize: 14, animation: `${subtlePulse} 4s ease-in-out infinite` }}>🕸️</Box>
          <Box component="span" sx={{ fontSize: 12, animation: `${subtleFloat} 3s ease-in-out infinite` }}>🦇</Box>
          <Box component="span" sx={{ fontSize: 14, animation: `${subtlePulse} 4s ease-in-out infinite`, animationDelay: '2s' }}>🕸️</Box>
        </Box>
        {navigationGroups.map((group) => (
          <Box key={group.id}>
            {/* Group Header - Non-clickable label */}
            {isExpanded && (
              <Box
                sx={{
                  mx: 1,
                  mt: group.id === 'core' ? 0 : 2,
                  mb: 1,
                  px: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <Box
                  sx={{
                    color: isDarkMode
                      ? groupColors[group.id as keyof typeof groupColors].dark
                      : groupColors[group.id as keyof typeof groupColors].light,
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '1.1rem'
                  }}
                >
                  {group.icon}
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: isDarkMode ? '#94a3b8' : '#64748b',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase'
                  }}
                >
                  {group.label}
                </Typography>
              </Box>
            )}

            {/* Group Items - Always visible, no dropdown */}
            <List component="div" disablePadding>
              {group.items.map((item) => {
                const isActive = currentView === item.view;
                const groupColor = groupColors[group.id as keyof typeof groupColors];
                return (
                  <Tooltip key={item.id} title={!isExpanded ? item.label : ''} placement="right">
                    <ListItemButton
                      selected={isActive}
                      onClick={() => handleItemClick(item.view)}
                      sx={{
                        mx: 1,
                        mb: 0.5,
                        pl: isExpanded ? 3 : 1.5,
                        justifyContent: isExpanded ? 'flex-start' : 'center',
                        borderRadius: 1.5,
                        minHeight: 48,
                        transition: 'all 0.2s ease',
                        '&.Mui-selected': {
                          background: isDarkMode
                            ? alpha(groupColor.dark, 0.15)
                            : alpha(groupColor.light, 0.12),
                          borderLeft: `4px solid ${isDarkMode ? groupColor.dark : groupColor.light}`,
                          '&:hover': {
                            background: isDarkMode
                              ? alpha(groupColor.dark, 0.2)
                              : alpha(groupColor.light, 0.18)
                          }
                        },
                        '&:hover': {
                          backgroundColor: isDarkMode
                            ? alpha(groupColor.dark, 0.08)
                            : alpha(groupColor.light, 0.06),
                          transform: isExpanded ? 'translateX(4px)' : 'none'
                        }
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: isExpanded ? 40 : 0,
                          color: isActive
                            ? (isDarkMode ? groupColor.dark : groupColor.light)
                            : (isDarkMode
                              ? featureColors[item.id as keyof typeof featureColors]?.dark || '#94a3b8'
                              : featureColors[item.id as keyof typeof featureColors]?.light || '#64748b'),
                          justifyContent: 'center'
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      {isExpanded && (
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{
                            fontSize: '0.875rem',
                            fontWeight: isActive ? 600 : 500,
                            color: isActive
                              ? (isDarkMode ? '#ffffff' : '#1e293b')
                              : (isDarkMode
                                ? featureColors[item.id as keyof typeof featureColors]?.dark || '#e2e8f0'
                                : featureColors[item.id as keyof typeof featureColors]?.light || '#475569')
                          }}
                        />
                      )}
                    </ListItemButton>
                  </Tooltip>
                );
              })}
            </List>
          </Box>
        ))}
      </List>
    </Box>
  );

  return (
    <>
      {/* Desktop Drawer */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: isExpanded ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: isExpanded ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED,
              boxSizing: 'border-box',
              transition: 'width 0.3s ease',
              overflowX: 'hidden',
              border: 'none'
            }
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={onMobileClose}
          ModalProps={{
            keepMounted: true // Better mobile performance
          }}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box'
            }
          }}
        >
          {drawerContent}
        </Drawer>
      )}
    </>
  );
};
