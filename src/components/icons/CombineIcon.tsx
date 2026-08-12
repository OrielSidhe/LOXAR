
import React from 'react';

const CombineIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="2" y="16" width="8" height="6" rx="1" />
    <path d="M17.5 22H14a2 2 0 0 1-2-2V7.5a2.5 2.5 0 0 1 5 0V20a2 2 0 0 1-2 2Z" />
    <path d="M6 16v-3a2 2 0 0 1 2-2h1" />
    <path d="M12 12h.5a2.5 2.5 0 0 0 2.5-2.5V7.5a2.5 2.5 0 0 0-5 0V10" />
  </svg>
);

export default CombineIcon;
