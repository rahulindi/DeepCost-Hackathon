import React, { useState } from 'react';
import AIChatButton from './AIChatButton';
import AIChatWindow from './AIChatWindow';

const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount] = useState(0); // TODO: Implement unread logic

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <AIChatButton 
        onClick={toggleChat} 
        isOpen={isOpen}
        unreadCount={unreadCount}
      />
      <AIChatWindow 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
};

export default AIAssistant;
