
import React from 'react';

const DnaIcon = ({ className }: { className?: string }) => (
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
        <path d="M17 3.5c-1.9 1.9-1.9 5.1 0 7"/>
        <path d="M7 13.5c-1.9 1.9-1.9 5.1 0 7"/>
        <path d="M17 10.5c1.9 1.9 1.9 5.1 0 7"/>
        <path d="M7 3.5c1.9 1.9 1.9 5.1 0 7"/>
        <path d="m14 7-4 4"/>
        <path d="m10 13-4 4"/>
        <path d="m14 17-4-4"/>
    </svg>
);

export default DnaIcon;