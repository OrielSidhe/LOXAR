import React, { useCallback } from 'react';

// Compact IPA symbol subset - extend as needed
const IPA_SYMBOLS: { symbol: string; label: string }[] = [
  { symbol: 'ɑ', label: 'alpha' },
  { symbol: 'æ', label: 'ash' },
  { symbol: 'ɛ', label: 'epsilon' },
  { symbol: 'ə', label: 'schwa' },
  { symbol: 'ɪ', label: 'iota' },
  { symbol: 'ɔ', label: 'open-o' },
  { symbol: 'ʊ', label: 'upsilon' },
  { symbol: 'ʌ', label: 'wedge' },
  { symbol: 'e', label: 'e' },
  { symbol: 'i', label: 'i' },
  { symbol: 'o', label: 'o' },
  { symbol: 'u', label: 'u' },
  { symbol: 'p', label: 'p' },
  { symbol: 'b', label: 'b' },
  { symbol: 't', label: 't' },
  { symbol: 'd', label: 'd' },
  { symbol: 'k', label: 'k' },
  { symbol: 'g', label: 'g' },
  { symbol: 'ʔ', label: 'glottal-stop' },
  { symbol: 'm', label: 'm' },
  { symbol: 'n', label: 'n' },
  { symbol: 'ŋ', label: 'eng' },
  { symbol: 'ɱ', label: 'labiodental-nasal' },
  { symbol: 'f', label: 'f' },
  { symbol: 'v', label: 'v' },
  { symbol: 'θ', label: 'theta' },
  { symbol: 'ð', label: 'eth' },
  { symbol: 's', label: 's' },
  { symbol: 'z', label: 'z' },
  { symbol: 'ʃ', label: 'esh' },
  { symbol: 'ʒ', label: 'ezh' },
  { symbol: 'ʂ', label: 's-with-retroflex' },
  { symbol: 'ʐ', label: 'z-with-retroflex' },
  { symbol: 'ç', label: 'c-with-cedilla' },
  { symbol: 'ʝ', label: 'j-with-crossed-tail' },
  { symbol: 'x', label: 'x' },
  { symbol: 'ɣ', label: 'gamma' },
  { symbol: 'χ', label: 'chi' },
  { symbol: 'ʁ', label: 'r-with-tail' },
  { symbol: 'ħ', label: 'h-with-bar' },
  { symbol: 'ʕ', label: 'ain' },
  { symbol: 'h', label: 'h' },
  { symbol: 'ɦ', label: 'h-with-hook' },
  { symbol: 'ɬ', label: 'l-with-belt' },
  { symbol: 'ɮ', label: 'l-with-retroflex' },
  { symbol: 'ʋ', label: 'v-with-hook' },
  { symbol: 'ɹ', label: 'r-with-tail' },
  { symbol: 'ɻ', label: 'r-with-retroflex' },
  { symbol: 'j', label: 'j' },
  { symbol: 'ɰ', label: 'gamma-with-tail' },
  { symbol: 'l', label: 'l' },
  { symbol: 'ɭ', label: 'l-with-retroflex' },
  { symbol: 'w', label: 'w' },
  { symbol: 'ɥ', label: 'hue-with-hook' },
  { symbol: 'ʍ', label: 'w-with-hook' },
];

interface IPAKeyboardProps {
  targetId: string;
  onInsert?: (symbol: string) => void;
}

const IPAKeyboard: React.FC<IPAKeyboardProps> = ({ targetId, onInsert }) => {
  const insertSymbol = useCallback((symbol: string) => {
    const target = document.getElementById(targetId) as HTMLInputElement | HTMLTextAreaElement | null;
    if (!target) {
      if (onInsert) onInsert(symbol);
      return;
    }

    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    const before = target.value.slice(0, start);
    const after = target.value.slice(end);
    
    target.value = before + symbol + after;
    
    // Move cursor after inserted symbol
    const newPos = start + symbol.length;
    target.setSelectionRange(newPos, newPos);
    target.focus();
    
    // Trigger input event so React state updates
    const event = new Event('input', { bubbles: true });
    target.dispatchEvent(event);
    
    if (onInsert) onInsert(symbol);
  }, [targetId, onInsert]);

  return (
    <div className="mt-2 p-3 bg-background/50 rounded-lg border border-subtle">
      <div className="text-xs text-text-secondary mb-2 font-medium">IPA Keyboard</div>
      <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
        {IPA_SYMBOLS.map((item) => (
          <button
            key={item.symbol}
            type="button"
            onClick={() => insertSymbol(item.symbol)}
            title={item.label}
            className="h-9 w-9 flex items-center justify-center text-lg font-mono rounded border border-subtle hover:bg-accent hover:text-white transition-colors"
          >
            {item.symbol}
          </button>
        ))}
      </div>
    </div>
  );
};

export default IPAKeyboard;
