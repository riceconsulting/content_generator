
import React from 'react';

const LoadingBar: React.FC = () => {
  return (
    <div className="w-full bg-border-light dark:bg-border-dark rounded-full h-1.5 overflow-hidden">
      <div
        className="h-1.5 rounded-full bg-gradient-to-r from-transparent via-primary-light to-transparent dark:via-primary-dark animate-loading-bar"
        style={{ backgroundSize: '200% 100%' }}
      ></div>
    </div>
  );
};

export default LoadingBar;
