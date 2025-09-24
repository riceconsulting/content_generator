import React from 'react';

const MagicWandIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    className={className}
    aria-hidden="true"
    >
    <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M9.53 16.122a3 3 0 00-3.48-2.14-3 3 0 00-2.43 2.805 3 3 0 00.34 2.035l-2.002 2.002a.75.75 0 001.06 1.06l2.002-2.002a3 3 0 002.036.34 3 3 0 002.805-2.43 3 3 0 00-2.14-3.48z" 
    />
    <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
    />
</svg>
);

export default MagicWandIcon;
