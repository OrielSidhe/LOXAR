
import React from 'react';

const WandIcon = ({ className }: { className?: string }) => (
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
    <path d="M15 4V2" />
    <path d="M15 10V8" />
    <path d="M12.5 6.5h-5" />
    <path d="M17.5 6.5h-5" />
    <path d="m3 21 6-6" />
    <path d="m21 3-6 6" />
    <path d="M12 12 9 9" />
    <path d="M15 15 6.5 6.5" />
    <path d="M9 15 4 20" />
    <path d="M18 12h2" />
    <path d="M18 18h2" />
    <path d="M12 18v2" />
    <path d="M12 12v2" />
  </svg>
);

export default WandIcon;
