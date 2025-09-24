import React from 'react';

const PromotionIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m-6 0l6 6" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 1015 0 7.5 7.5 0 00-15 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75h.01M14.25 14.25h.01" />
  </svg>
);

export default PromotionIcon;
