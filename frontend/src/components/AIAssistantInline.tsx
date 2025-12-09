import React, { useState } from 'react';
import AIChatButtonInline from './AIChatButtonInline';
import AIChatWindowInline from './AIChatWindowInline';

const AIAssistantInline: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount] = useState(0);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <AIChatButtonInline 
        onClick={toggleChat} 
        isOpen={isOpen}
        unreadCount={unreadCount}
      />
      <AIChatWindowInline 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
};

export default AIAssistantInline;
