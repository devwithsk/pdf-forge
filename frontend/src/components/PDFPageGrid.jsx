import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { Trash2, GripVertical, AlertCircle, Loader2 } from 'lucide-react';

// Configure the PDF.js worker using the bundled worker from pdfjs-dist
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// ─── Single Page Thumbnail ──────────────────────────────────────────────────

const PageThumbnail = ({
  pageNum: _pageNum,      // 0-based original page index
  displayNum,   // 1-based display label
  canvasDataUrl,
  isRemoved,
  isDragging,
  isOver,
  mode,
  onRemove,
  // DnD props
  draggable,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}) => {
  return (
    <div
      draggable={mode === 'organize' ? draggable : false}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`
        relative group flex flex-col items-center select-none
        transition-all duration-200
        ${isRemoved ? 'opacity-30' : 'opacity-100'}
        ${isDragging ? 'opacity-50 scale-95' : ''}
        ${isOver && !isDragging ? 'scale-105' : ''}
      `}
    >
      {/* Card wrapper */}
      <div
        className={`
          relative w-full rounded-xl border-2 overflow-hidden shadow-sm
          transition-all duration-150
          ${isOver && !isDragging ? 'border-primary shadow-lg shadow-primary/20' : 'border-slate-200'}
          ${isRemoved ? 'border-red-300' : ''}
          ${mode === 'organize' ? 'cursor-grab active:cursor-grabbing' : ''}
          bg-white
        `}
        style={{ aspectRatio: '3/4' }}
      >
        {/* Thumbnail image */}
        {canvasDataUrl ? (
          <img
            src={canvasDataUrl}
            alt={`Page ${displayNum}`}
            className="w-full h-full object-contain"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-50">
            <Loader2 size={20} className="text-slate-300 animate-spin" />
          </div>
        )}

        {/* REMOVE MODE: red trash overlay on hover */}
        {mode === 'remove' && !isRemoved && (
          <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/50 transition-all duration-200 flex items-center justify-center rounded-xl">
            <button
              type="button"
              onClick={onRemove}
              className="opacity-0 group-hover:opacity-100 transition-all duration-200 w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95"
              title="Remove this page"
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}

        {/* REMOVE MODE: restore overlay when removed */}
        {mode === 'remove' && isRemoved && (
          <div className="absolute inset-0 bg-red-50/70 flex items-center justify-center rounded-xl">
            <button
              type="button"
              onClick={onRemove}
              className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center shadow transition-all"
              title="Restore this page"
            >
              <span className="text-[10px] font-black">↺</span>
            </button>
          </div>
        )}

        {/* ORGANIZE MODE: drag handle indicator */}
        {mode === 'organize' && (
          <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-6 h-6 rounded bg-white/90 shadow flex items-center justify-center">
              <GripVertical size={12} className="text-slate-400" />
            </div>
          </div>
        )}
      </div>

      {/* Page number label */}
      <div
        className={`mt-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full
          ${isRemoved ? 'bg-red-100 text-red-400 line-through' : 'bg-slate-100 text-slate-500'}
        `}
      >
        {isRemoved ? 'Removed' : `Page ${displayNum}`}
      </div>
    </div>
  );
};

// ─── Main PDFPageGrid Component ─────────────────────────────────────────────

/**
 * Props:
 *  - pdfFile:        File object (the uploaded PDF)
 *  - mode:           'remove' | 'organize'
 *  - onPagesChange:  (pageOrderArray: number[]) => void
 *                    Called whenever the effective page order changes.
 *                    Array contains 0-based original page indices in desired output order.
 */
const PDFPageGrid = ({ pdfFile, mode, onPagesChange }) => {
  // pages: [{ originalIndex: number, canvasDataUrl: string|null }]
  const [pages, setPages] = useState([]);
  const [removedSet, setRemovedSet] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [totalPages, setTotalPages] = useState(0);

  // DnD state
  const [draggingIdx, setDraggingIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  const renderTaskRef = useRef(null);

  // ── Render all page thumbnails from the PDF file ──
  useEffect(() => {
    if (!pdfFile) return;
    setIsLoading(true);
    setLoadError(null);
    setPages([]);
    setRemovedSet(new Set());
    setTotalPages(0);

    let cancelled = false;

    const renderAll = async () => {
      try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        renderTaskRef.current = loadingTask;
        const doc = await loadingTask.promise;
        if (cancelled) return;

        const count = doc.numPages;
        setTotalPages(count);

        // Initialise pages array with nulls so the grid shows skeletons immediately
        const initialPages = Array.from({ length: count }, (_, i) => ({
          originalIndex: i,
          canvasDataUrl: null
        }));
        setPages(initialPages);
        setIsLoading(false);

        // Render thumbnails progressively
        for (let i = 0; i < count; i++) {
          if (cancelled) break;
          try {
            const page = await doc.getPage(i + 1); // pdfjs is 1-indexed
            const viewport = page.getViewport({ scale: 0.4 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport }).promise;
            if (cancelled) break;
            const dataUrl = canvas.toDataURL('image/jpeg', 0.75);

            setPages(prev => {
              const next = [...prev];
              next[i] = { ...next[i], canvasDataUrl: dataUrl };
              return next;
            });
          } catch {
            // leave canvasDataUrl as null for this page
          }
        }
        } catch {
          if (!cancelled) {
            setLoadError('Failed to render PDF. The file may be corrupt or password-protected.');
            setIsLoading(false);
        }
      }
    };

    renderAll();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try { renderTaskRef.current.destroy(); } catch {}
      }
    };
  }, [pdfFile]);

  // ── Notify parent of current effective page order ──
  const notifyParent = useCallback((pagesState, removedState) => {
    const effectiveOrder = pagesState
      .filter(p => !removedState.has(p.originalIndex))
      .map(p => p.originalIndex);
    onPagesChange(effectiveOrder);
  }, [onPagesChange]);

  useEffect(() => {
    if (pages.length > 0) {
      notifyParent(pages, removedSet);
    }
  }, [pages, removedSet, notifyParent]);

  // ── Remove/Restore toggle ──
  const toggleRemoved = (originalIndex) => {
    setRemovedSet(prev => {
      const next = new Set(prev);
      if (next.has(originalIndex)) {
        next.delete(originalIndex);
      } else {
        next.add(originalIndex);
      }
      return next;
    });
  };

  // ── HTML5 Drag-and-Drop handlers ──
  const handleDragStart = (e, idx) => {
    setDraggingIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggingIdx(null);
    setOverIdx(null);
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (idx !== draggingIdx) setOverIdx(idx);
  };

  const handleDrop = (e, dropIdx) => {
    e.preventDefault();
    if (draggingIdx === null || draggingIdx === dropIdx) {
      setDraggingIdx(null);
      setOverIdx(null);
      return;
    }
    setPages(prev => {
      const next = [...prev];
      const [moved] = next.splice(draggingIdx, 1);
      next.splice(dropIdx, 0, moved);
      return next;
    });
    setDraggingIdx(null);
    setOverIdx(null);
  };

  // ── Render ──
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-slate-400">
        <Loader2 size={36} className="animate-spin text-primary/60" />
        <p className="text-sm font-semibold">Rendering PDF pages…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-red-500">
        <AlertCircle size={36} />
        <p className="text-sm font-semibold text-center max-w-xs">{loadError}</p>
      </div>
    );
  }

  const activeCount = pages.length - removedSet.size;

  return (
    <div className="flex flex-col h-full">
      {/* Status bar */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          {mode === 'remove' ? (
            <>
              <span className="text-sm font-bold text-slate-700">
                {activeCount} <span className="text-slate-400 font-normal">of</span> {totalPages} pages kept
              </span>
              {removedSet.size > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[11px] font-bold">
                  {removedSet.size} removed
                </span>
              )}
            </>
          ) : (
            <span className="text-sm font-bold text-slate-700">
              {totalPages} pages — drag to reorder
            </span>
          )}
        </div>
        {mode === 'remove' && removedSet.size > 0 && (
          <button
            type="button"
            onClick={() => setRemovedSet(new Set())}
            className="text-xs text-slate-500 hover:text-primary font-semibold underline underline-offset-2 transition-colors"
          >
            Restore all
          </button>
        )}
      </div>

      {/* Instruction hint */}
      <p className="text-[11px] text-slate-400 font-medium mb-4 shrink-0">
        {mode === 'remove'
          ? 'Hover over a page and click the trash icon to mark it for removal. Click again to restore.'
          : 'Drag and drop pages to change their order in the final PDF.'}
      </p>

      {/* Thumbnails grid */}
      <div
        className="grid gap-3 overflow-y-auto flex-grow pb-2"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}
      >
        {pages.map((page, idx) => (
          <PageThumbnail
            key={page.originalIndex}
            pageNum={page.originalIndex}
            displayNum={page.originalIndex + 1}
            canvasDataUrl={page.canvasDataUrl}
            isRemoved={removedSet.has(page.originalIndex)}
            isDragging={draggingIdx === idx}
            isOver={overIdx === idx}
            mode={mode}
            onRemove={() => toggleRemoved(page.originalIndex)}
            draggable={mode === 'organize'}
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={(e) => handleDrop(e, idx)}
          />
        ))}
      </div>
    </div>
  );
};

export default PDFPageGrid;
