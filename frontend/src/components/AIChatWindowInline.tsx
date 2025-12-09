import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, TrendingUp, DollarSign, AlertCircle, Minimize2, Maximize2, RotateCcw, X } from 'lucide-react';

// API URL - uses environment variable in production
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatWindowInlineProps {
  isOpen: boolean;
  onClose: () => void;
}

const AIChatWindowInline: React.FC<AIChatWindowInlineProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const quickActions = [
    { icon: TrendingUp, label: 'Top Costs', query: 'What are my top 3 AWS costs?' },
    { icon: DollarSign, label: 'Save Money', query: 'How can I reduce my AWS costs?' },
    { icon: AlertCircle, label: 'Anomalies', query: 'Are there any cost anomalies?' },
  ];

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ message: inputValue }),
      });

      const data = await response.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || 'Sorry, I encountered an error.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I\'m having trouble connecting. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (query: string) => {
    setInputValue(query);
    inputRef.current?.focus();
  };

  const handleReset = () => {
    setMessages([]);
  };

  if (!isOpen) return null;

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: isMinimized ? '90px' : '100px',
    right: '24px',
    width: '420px',
    height: isMinimized ? '60px' : '650px',
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 20px 60px -10px rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.3s ease',
    zIndex: 99999,
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    background: 'linear-gradient(135deg, #EFF6FF 0%, #F3E8FF 100%)',
    borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
  };

  const headerLeftStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  };

  const avatarStyle: React.CSSProperties = {
    position: 'relative',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3B82F6 0%, #A855F7 50%, #EC4899 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const onlineIndicatorStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '0',
    right: '0',
    width: '12px',
    height: '12px',
    background: '#10B981',
    borderRadius: '50%',
    border: '2px solid white',
  };

  const headerTextStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#6B7280',
    margin: 0,
  };

  const headerActionsStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const iconButtonStyle: React.CSSProperties = {
    padding: '8px',
    background: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  };

  const messagesContainerStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    display: isMinimized ? 'none' : 'flex',
    flexDirection: 'column',
    gap: '16px',
  };

  const emptyStateStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    textAlign: 'center',
    padding: '24px',
  };

  const emptyIconContainerStyle: React.CSSProperties = {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #DBEAFE 0%, #E9D5FF 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
  };

  const emptyTitleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '8px',
  };

  const emptySubtitleStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#6B7280',
    marginBottom: '24px',
    lineHeight: '1.5',
  };

  const quickActionsContainerStyle: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  };

  const quickActionsLabelStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: '4px',
  };

  const quickActionButtonStyle: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    background: '#F9FAFB',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'left',
  };

  const quickActionTextStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#374151',
    fontWeight: '500',
  };

  const messageStyle = (isUser: boolean): React.CSSProperties => ({
    display: 'flex',
    justifyContent: isUser ? 'flex-end' : 'flex-start',
  });

  const messageBubbleStyle = (isUser: boolean): React.CSSProperties => ({
    maxWidth: '80%',
    padding: '12px 16px',
    borderRadius: '16px',
    background: isUser 
      ? 'linear-gradient(135deg, #3B82F6 0%, #A855F7 50%, #EC4899 100%)'
      : '#F3F4F6',
    color: isUser ? 'white' : '#111827',
  });

  const messageContentStyle: React.CSSProperties = {
    fontSize: '14px',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  };

  const messageTimeStyle = (isUser: boolean): React.CSSProperties => ({
    fontSize: '11px',
    marginTop: '4px',
    color: isUser ? 'rgba(255, 255, 255, 0.7)' : '#9CA3AF',
  });

  const typingIndicatorStyle: React.CSSProperties = {
    display: 'flex',
    gap: '4px',
    padding: '12px 16px',
    background: '#F3F4F6',
    borderRadius: '16px',
    width: 'fit-content',
  };

  const typingDotStyle: React.CSSProperties = {
    width: '8px',
    height: '8px',
    background: '#9CA3AF',
    borderRadius: '50%',
    animation: 'bounce 1.4s infinite ease-in-out',
  };

  const inputContainerStyle: React.CSSProperties = {
    padding: '16px 20px',
    borderTop: '1px solid rgba(0, 0, 0, 0.05)',
    background: '#F9FAFB',
    display: isMinimized ? 'none' : 'flex',
    flexDirection: 'column',
    gap: '8px',
  };

  const inputRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid #D1D5DB',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s',
  };

  const sendButtonStyle: React.CSSProperties = {
    padding: '12px 16px',
    background: inputValue.trim() && !isLoading
      ? 'linear-gradient(135deg, #3B82F6 0%, #A855F7 50%, #EC4899 100%)'
      : '#E5E7EB',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: inputValue.trim() && !isLoading ? 'pointer' : 'not-allowed',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    opacity: inputValue.trim() && !isLoading ? 1 : 0.5,
  };

  const footerTextStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#9CA3AF',
    textAlign: 'center',
  };

  return (
    <>
      <style>
        {`
          @keyframes bounce {
            0%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
          }
          
          .quick-action-button:hover {
            background: #F3F4F6 !important;
            transform: translateX(4px);
          }
          
          .icon-button:hover {
            background: #F3F4F6 !important;
          }
          
          .send-button:hover {
            transform: scale(1.05);
          }
          
          .send-button:active {
            transform: scale(0.95);
          }
        `}
      </style>
      
      <div style={containerStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={headerLeftStyle}>
            <div style={avatarStyle}>
              <Sparkles style={{ width: '20px', height: '20px', color: 'white' }} />
              <div style={onlineIndicatorStyle} />
            </div>
            <div style={headerTextStyle}>
              <h3 style={titleStyle}>AI Cost Assistant</h3>
              <p style={subtitleStyle}>Always here to help</p>
            </div>
          </div>
          
          <div style={headerActionsStyle}>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              style={iconButtonStyle}
              className="icon-button"
              aria-label={isMinimized ? 'Maximize' : 'Minimize'}
            >
              {isMinimized ? (
                <Maximize2 style={{ width: '16px', height: '16px', color: '#6B7280' }} />
              ) : (
                <Minimize2 style={{ width: '16px', height: '16px', color: '#6B7280' }} />
              )}
            </button>
            <button
              onClick={handleReset}
              style={iconButtonStyle}
              className="icon-button"
              aria-label="Reset conversation"
            >
              <RotateCcw style={{ width: '16px', height: '16px', color: '#6B7280' }} />
            </button>
            <button
              onClick={onClose}
              style={iconButtonStyle}
              className="icon-button"
              aria-label="Close"
            >
              <X style={{ width: '16px', height: '16px', color: '#6B7280' }} />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div style={messagesContainerStyle}>
          {messages.length === 0 ? (
            <div style={emptyStateStyle}>
              <div style={emptyIconContainerStyle}>
                <Sparkles style={{ width: '32px', height: '32px', color: '#A855F7' }} />
              </div>
              <h4 style={emptyTitleStyle}>Hi! I'm your AI Cost Assistant</h4>
              <p style={emptySubtitleStyle}>
                Ask me anything about your AWS costs, optimization tips, or budget insights.
              </p>
              
              <div style={quickActionsContainerStyle}>
                <p style={quickActionsLabelStyle}>Quick Actions:</p>
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickAction(action.query)}
                    style={quickActionButtonStyle}
                    className="quick-action-button"
                  >
                    <action.icon style={{ width: '20px', height: '20px', color: '#A855F7' }} />
                    <span style={quickActionTextStyle}>{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div key={message.id} style={messageStyle(message.role === 'user')}>
                  <div style={messageBubbleStyle(message.role === 'user')}>
                    <p style={messageContentStyle}>{message.content}</p>
                    <p style={messageTimeStyle(message.role === 'user')}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div style={messageStyle(false)}>
                  <div style={typingIndicatorStyle}>
                    <div style={{...typingDotStyle, animationDelay: '0ms'}} />
                    <div style={{...typingDotStyle, animationDelay: '200ms'}} />
                    <div style={{...typingDotStyle, animationDelay: '400ms'}} />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div style={inputContainerStyle}>
          <div style={inputRowStyle}>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about your AWS costs..."
              disabled={isLoading}
              style={inputStyle}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              style={sendButtonStyle}
              className="send-button"
              aria-label="Send message"
            >
              <Send style={{ width: '18px', height: '18px' }} />
            </button>
          </div>
          <p style={footerTextStyle}>Powered by AI • Always learning</p>
        </div>
      </div>
    </>
  );
};

export default AIChatWindowInline;
