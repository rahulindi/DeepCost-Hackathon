import React, { useState } from 'react';
import { MessageSquare, X, Sparkles } from 'lucide-react';

interface AIChatButtonProps {
  onClick: () => void;
  isOpen: boolean;
  unreadCount?: number;
}

const AIChatButtonInline: React.FC<AIChatButtonProps> = ({ 
  onClick, 
  isOpen, 
  unreadCount = 0 
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const buttonStyle: React.CSSProperties = {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3B82F6 0%, #A855F7 50%, #EC4899 100%)',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    transform: isHovered ? 'scale(1.1)' : 'scale(1)',
    outline: 'none',
  };

  const iconStyle: React.CSSProperties = {
    color: 'white',
    width: '28px',
    height: '28px',
    transition: 'transform 0.3s ease',
    transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
  };

  const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '100%',
    right: '0',
    marginBottom: '8px',
    padding: '8px 16px',
    borderRadius: '8px',
    background: '#1F2937',
    color: 'white',
    fontSize: '14px',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
    opacity: isHovered && !isOpen ? 1 : 0,
    transform: isHovered && !isOpen ? 'translateY(0)' : 'translateY(8px)',
    transition: 'all 0.3s ease',
    pointerEvents: 'none',
  };

  const tooltipArrowStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    right: '24px',
    width: '0',
    height: '0',
    borderLeft: '8px solid transparent',
    borderRight: '8px solid transparent',
    borderTop: '8px solid #1F2937',
  };

  const badgeStyle: React.CSSProperties = {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: '#EF4444',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    animation: 'bounce 1s infinite',
  };

  const sparkleStyle: React.CSSProperties = {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    color: '#FCD34D',
    width: '20px',
    height: '20px',
    opacity: isHovered && !isOpen ? 1 : 0,
    transform: isHovered && !isOpen ? 'scale(1.1)' : 'scale(0.5)',
    transition: 'all 0.3s ease',
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 100000 }}>
      <style>
        {`
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
      
      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={buttonStyle}
        aria-label={isOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
      >
        {isOpen ? (
          <X style={iconStyle} />
        ) : (
          <MessageSquare style={iconStyle} />
        )}

        {/* Sparkle Effect */}
        {!isOpen && <Sparkles style={sparkleStyle} />}

        {/* Unread Badge */}
        {!isOpen && unreadCount > 0 && (
          <div style={badgeStyle}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {/* Tooltip */}
      {!isOpen && (
        <div style={tooltipStyle}>
          Ask AI Cost Assistant
          <div style={tooltipArrowStyle} />
        </div>
      )}
    </div>
  );
};

export default AIChatButtonInline;
