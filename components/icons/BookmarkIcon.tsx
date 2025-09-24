
import React from 'react';

const BookmarkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c.1.128.2.27.2.428V21a.75.75 0 01-1.085.67L12 18.089l-4.708 3.583A.75.75 0 016.207 21V3.75c0-.158.1-.3.2-.428l5.5-4.25a.75.75 0 01.986 0l5.5 4.25z" />
  </svg>
);

export default BookmarkIcon;
