import { useState, useRef, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type FloatingModalMode = 'modal' | 'free';

interface FloatingModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  /** Slot rendered on the right side of the header (e.g. a "detach" button). */
  headerRight?: ReactNode;
  /** Starting mode. 'modal' = centered overlay; 'free' = draggable/resizable window. */
  defaultMode?: FloatingModalMode;
  /** Initial size for the panel (modal uses max sizes; free uses exact). */
  width?: number;
  height?: number;
}

const MIN_W = 320;
const MIN_H = 240;

/**
 * FloatingModal — a reusable overlay that solves two problems with the old
 * inline `fixed inset-0 z-50` modals:
 *  1. It mounts through a portal on document.body, escaping the `z-0` stacking
 *     context of <main> so it can never get trapped "behind" toasts/modals.
 *  2. It can be switched from a centered modal to a free-floating, draggable,
 *     resizable window (no external libs), so panels are not "rigid".
 */
export default function FloatingModal({
  open,
  title,
  onClose,
  children,
  headerRight,
  defaultMode = 'modal',
  width = 640,
  height = 560,
}: FloatingModalProps) {
  const [mode, setMode] = useState<FloatingModalMode>(defaultMode);
  const [rect, setRect] = useState({ x: 0, y: 0, w: width, h: height });
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const resizeRef = useRef<{ dx: number; dy: number } | null>(null);

  // Reset free-window position when (re)opened or toggled to free mode.
  useEffect(() => {
    if (!open) return;
    setMode(defaultMode);
    setRect((r) => ({ ...r, w: width, h: height }));
  }, [open, defaultMode, width, height]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Drag (header) and resize (corner) listeners live on document so the pointer
  // keeps tracking even if it leaves the panel.
  useEffect(() => {
    if (mode !== 'free') return;
    const onMove = (e: PointerEvent) => {
      if (dragRef.current) {
        setRect((r) => ({
          ...r,
          x: Math.max(0, e.clientX - dragRef.current!.dx),
          y: Math.max(0, e.clientY - dragRef.current!.dy),
        }));
      } else if (resizeRef.current) {
        setRect((r) => ({
          ...r,
          w: Math.max(MIN_W, e.clientX - resizeRef.current!.dx),
          h: Math.max(MIN_H, e.clientY - resizeRef.current!.dy),
        }));
      }
    };
    const onUp = () => {
      dragRef.current = null;
      resizeRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [mode]);

  if (!open) return null;

  const isFree = mode === 'free';

  const panel = (
    <div
      className={
        isFree
          ? 'fixed z-[60] bg-background rounded-2xl border border-border-dark shadow-2xl flex flex-col'
          : 'w-full max-w-2xl max-h-[90vh] overflow-hidden bg-background rounded-2xl border border-border-dark shadow-2xl flex flex-col'
      }
      style={
        isFree
          ? { left: rect.x, top: rect.y, width: rect.w, height: rect.h }
          : undefined
      }
    >
      {/* Header — draggable in free mode */}
      <div
        className="flex items-center justify-between p-5 border-b border-border-dark flex-shrink-0"
        onPointerDown={(e) => {
          if (!isFree) return;
          dragRef.current = { dx: e.clientX - rect.x, dy: e.clientY - rect.y };
        }}
        style={isFree ? { cursor: 'grab' } : undefined}
      >
        <div className={isFree ? 'select-none' : ''}>
          {title && (
            <h2 className="text-xl font-bold text-white font-display">{title}</h2>
          )}
        </div>
        <div className="flex items-center gap-2">
          {headerRight}
          <button
            type="button"
            onClick={() => setMode(isFree ? 'modal' : 'free')}
            aria-label={isFree ? 'Acoplar ventana' : 'Desacoplar ventana'}
            title={isFree ? 'Volver a modal centrado' : 'Mover y redimensionar libremente'}
            className="text-text-secondary hover:text-white text-sm px-2 py-1 rounded border border-border-dark hover:border-primary/40 transition-colors"
          >
            {isFree ? '⧉' : '⧉'}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-text-secondary hover:text-white text-2xl leading-none px-2"
          >
            ×
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>

      {/* Resize handle (free mode only) */}
      {isFree && (
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
            resizeRef.current = { dx: e.clientX - rect.w, dy: e.clientY - rect.h };
          }}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
          style={{
            background:
              'linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.3) 50%)',
          }}
          aria-hidden
        />
      )}
    </div>
  );

  if (isFree) {
    return createPortal(panel, document.body);
  }

  // Modal mode: dim scrim that closes on outside click.
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {panel}
    </div>,
    document.body,
  );
}
