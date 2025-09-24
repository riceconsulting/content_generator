
import React from 'react';

const AudienceIcon: React.FC<{ className?: string }> = ({ className }) => (
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
        d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.5-2.962A3.75 3.75 0 0112 15v-2.25A3.75 3.75 0 0115.75 9v-2.25a3.75 3.75 0 01-3.75-3.75zM14.25 18.75a3.75 3.75 0 10-7.5 0v-2.25a3.75 3.75 0 00-3.75-3.75V9.75a3.75 3.75 0 013.75-3.75h1.5a3.75 3.75 0 013.75 3.75v.75a3.75 3.75 0 003.75 3.75v2.25a3.75 3.75 0 01-3.75 3.75z" 
    />
  </svg>
);

export default AudienceIcon;
