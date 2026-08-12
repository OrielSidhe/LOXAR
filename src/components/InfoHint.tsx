import { useState } from 'react';

interface InfoHintProps {
  /** Plain-language explanation shown in the tooltip. */
  text: string;
  /** Optional accessible label / name for the badge (defaults to "más información"). */
  label?: string;
}

/**
 * InfoHint — a small "(i)" badge that reveals a plain-language explanation on
 * hover (CSS `group`) and on click/focus (keyboard + touch friendly).
 *
 * Used next to every Grammar-tab section title so a conlanger with no
 * linguistics background understands what each area is for. No external deps,
 * no dangerouslySetInnerHTML.
 */
export default function InfoHint({ text, label = 'más información' }: InfoHintProps) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative group inline-flex items-center justify-center ml-2 align-middle z-40">
      <button
        type="button"
        aria-label={label}
        title={text}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        className="w-4 h-4 rounded-full bg-white/10 text-white/60 text-[10px] font-bold flex items-center justify-center border border-white/20 group-hover:bg-accent/20 group-hover:text-accent group-hover:border-accent/50 group-focus-visible:bg-accent/20 group-focus-visible:text-accent transition-colors cursor-help"
      >
        i
      </button>
      <span
        role="tooltip"
        className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-[#1a1a24] border border-white/10 rounded-lg shadow-2xl text-xs text-white/80 font-normal leading-relaxed pointer-events-none transition-all ${
          open ? 'opacity-100 visible' : 'opacity-0 invisible group-hover:opacity-100 group-hover:visible'
        }`}
      >
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1a1a24]" />
      </span>
    </span>
  );
}
