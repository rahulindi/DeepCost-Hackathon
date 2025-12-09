import React from 'react';

const SimpleTestButton: React.FC = () => {
  return (
    <div 
      className="fixed bottom-6 right-6 z-50"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999
      }}
    >
      <button
        onClick={() => alert('Button clicked!')}
        className="w-16 h-16 rounded-full bg-blue-500 text-white shadow-lg hover:bg-blue-600"
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#3B82F6',
          color: 'white',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        💬
      </button>
    </div>
  );
};

export default SimpleTestButton;
