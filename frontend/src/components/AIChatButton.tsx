import React, { useState } from 'react';
import { MessageSquare, X, Sparkles } from 'lucide-react';

interface AIChatButtonProps {
  onClick: () => void;
  isOpen: boolean;
  unreadCount?: number;
}

const AIChatButton: React.FC<AIChatButtonProps> = ({ 
  onClick, 
  isOpen, 
  unreadCount = 0 
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Button */}
      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          relative group
          w-16 h-16 rounded-full
          bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500
          hover:from-blue-600 hover:via-purple-600 hover:to-pink-600
          shadow-lg hover:shadow-2xl
          transform transition-all duration-300 ease-out
          ${isHovered ? 'scale-110' : 'scale-100'}
          ${isOpen ? 'rotate-90' : 'rotate-0'}
          focus:outline-none focus:ring-4 focus:ring-purple-300
        `}
        aria-label={isOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
      >
        {/* Animated Gradient Border */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 opacity-75 blur-md animate-pulse" />
        
        {/* Button Content */}
        <div className="relative flex items-center justify-center w-full h-full">
          {isOpen ? (
            <X className="w-7 h-7 text-white transition-transform duration-300" />
          ) : (
            <MessageSquare className="w-7 h-7 text-white transition-transform duration-300" />
          )}
        </div>

        {/* Sparkle Effect */}
        {!isOpen && (
          <Sparkles 
            className={`
              absolute -top-1 -right-1 w-5 h-5 text-yellow-300
              transition-all duration-300
              ${isHovered ? 'opacity-100 scale-110' : 'opacity-0 scale-50'}
            `}
          />
        )}

        {/* Unread Badge */}
        {!isOpen && unreadCount > 0 && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
            <span className="text-white text-xs font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </div>
        )}

        {/* Ripple Effect on Hover */}
        {isHovered && !isOpen && (
          <div className="absolute inset-0 rounded-full">
            <div className="absolute inset-0 rounded-full bg-white opacity-20 animate-ping" />
          </div>
        )}
      </button>

      {/* Tooltip */}
      {!isOpen && (
        <div 
          className={`
            absolute bottom-full right-0 mb-2
            px-4 py-2 rounded-lg
            bg-gray-900 text-white text-sm font-medium
            whitespace-nowrap shadow-xl
            transition-all duration-300
            ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
          `}
        >
          Ask AI Cost Assistant
          <div className="absolute top-full right-6 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-gray-900" />
        </div>
      )}

      {/* Pulsing Ring Animation */}
      {!isOpen && (
        <div className="absolute inset-0 rounded-full">
          <div className="absolute inset-0 rounded-full border-4 border-purple-400 opacity-75 animate-ping" 
               style={{ animationDuration: '2s' }} />
        </div>
      )}
    </div>
  );
};

export default AIChatButton;
