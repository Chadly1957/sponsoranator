'use client';

import { useCallback, useRef } from 'react';

export interface PctBox {
  x: number; // percent of container width, 0-100
  y: number; // percent of container height, 0-100
  w: number;
  h: number;
}

interface Props {
  box: PctBox;
  onChange: (box: PctBox) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  label: string;
  /** CSS color (hex/rgb) used for the border, handles, and label chip. */
  color: string;
}

const MIN_PCT = 3;

function clampBox(box: PctBox): PctBox {
  const w = Math.min(100, Math.max(MIN_PCT, box.w));
  const h = Math.min(100, Math.max(MIN_PCT, box.h));
  const x = Math.min(100 - w, Math.max(0, box.x));
  const y = Math.min(100 - h, Math.max(0, box.y));
  return { x, y, w, h };
}

/** A draggable, resizable percentage-positioned box, meant to sit inside a relatively
 *  positioned container the same aspect ratio as the PDF page it represents a placeholder for. */
export default function DraggableBox({ box, onChange, containerRef, label, color }: Props) {
  const dragState = useRef<{
    mode: 'move' | 'resize';
    startX: number;
    startY: number;
    startBox: PctBox;
  } | null>(null);

  const startDrag = useCallback(
    (mode: 'move' | 'resize') => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragState.current = { mode, startX: e.clientX, startY: e.clientY, startBox: box };

      function onMouseMove(ev: MouseEvent) {
        const state = dragState.current;
        const container = containerRef.current;
        if (!state || !container) return;
        const rect = container.getBoundingClientRect();
        const dxPct = ((ev.clientX - state.startX) / rect.width) * 100;
        const dyPct = ((ev.clientY - state.startY) / rect.height) * 100;

        if (state.mode === 'move') {
          onChange(clampBox({ ...state.startBox, x: state.startBox.x + dxPct, y: state.startBox.y + dyPct }));
        } else {
          onChange(
            clampBox({
              ...state.startBox,
              w: state.startBox.w + dxPct,
              h: state.startBox.h + dyPct,
            })
          );
        }
      }

      function onMouseUp() {
        dragState.current = null;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      }

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [box, containerRef, onChange]
  );

  return (
    <div
      className="absolute flex cursor-move items-start justify-start border-2"
      style={{
        left: `${box.x}%`,
        top: `${box.y}%`,
        width: `${box.w}%`,
        height: `${box.h}%`,
        borderColor: color,
        backgroundColor: `${color}1a`,
      }}
      onMouseDown={startDrag('move')}
    >
      <span
        className="pointer-events-none select-none rounded-br px-1 text-[10px] font-semibold text-white opacity-90"
        style={{ backgroundColor: color }}
      >
        {label}
      </span>
      <div
        className="absolute bottom-0 right-0 h-3 w-3 cursor-nwse-resize"
        style={{ backgroundColor: color }}
        onMouseDown={startDrag('resize')}
      />
    </div>
  );
}
