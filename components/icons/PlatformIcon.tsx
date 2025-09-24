
import React from 'react';

const PlatformIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c1.355 0 2.707-.158 4.008-.464M12 21c-1.355 0-2.707-.158-4.008-.464M9.75 9.75c0-1.381 1.007-2.5 2.25-2.5s2.25 1.119 2.25 2.5c0 1.009-.496 1.905-1.285 2.459M12 3a9.004 9.004 0 00-8.716 6.747M12 3c1.355 0 2.707.158 4.008.464M12 3c-1.355 0-2.707-.158-4.008.464" />
  </svg>
);

export default PlatformIcon;
