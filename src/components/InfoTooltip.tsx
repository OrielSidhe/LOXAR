import React, { ReactNode } from 'react';

export default function InfoTooltip({ text, children }: { text?: ReactNode, children?: ReactNode }) {
    return (
        <div className="relative group inline-flex items-center justify-center ml-2 cursor-help align-middle z-40">
            <span className="w-4 h-4 rounded-full bg-white/10 text-white/60 text-[10px] font-bold flex items-center justify-center border border-white/20 group-hover:bg-accent/20 group-hover:text-accent group-hover:border-accent/50 transition-colors">
                i
            </span>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-[#1a1a24] border border-white/10 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all text-xs text-white/80 font-normal leading-relaxed pointer-events-none shadow-black/50">
                {text}
                {children}
                {/* Arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1a1a24]"></div>
            </div>
        </div>
    );
}
