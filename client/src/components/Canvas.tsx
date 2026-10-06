/* ─── InkBoard Canvas Component ─── */
import { useRef, useEffect, useCallback, useState } from 'react';
import { nanoid } from 'nanoid';
import { useCanvasStore } from '../store';
import {
  renderCanvas,
  screenToCanvas,
  hitTestElements,
  hitTestHandle,
  getHandleCursor,
  getElementBounds,
  findNearestConnectionPoint,
} from '../engine';
import type { CanvasElement, Point, HandlePosition, ToolType, PointBinding } from '../types';

function createElement(
  type: CanvasElement['type'],
  x: number,
  y: number,
  style: ReturnType<typeof useCanvasStore.getState>['currentStyle'],
): CanvasElement {
  return {
    id: nanoid(),
    type,
    x,
    y,
    width: 0,
    height: 0,
    angle: 0,
    strokeColor: style.strokeColor,
    backgroundColor: style.backgroundColor,
    fillStyle: style.fillStyle,
    strokeWidth: style.strokeWidth,
    roughness: style.roughness,
    opacity: style.opacity,
    seed: Math.floor(Math.random() * 2147483647),
    points: type === 'freedraw' || type === 'line' || type === 'arrow' ? [{ x: 0, y: 0 }] : undefined,
    text: type === 'text' ? '' : undefined,
    fontSize: style.fontSize,
    fontFamily: style.fontFamily,
    isDeleted: false,
    locked: false,
    groupIds: [],
    version: 1,
    versionNonce: Math.floor(Math.random() * 2147483647),
  };
}

type ActionState =
  | { type: 'idle' }
  | { type: 'drawing'; element: CanvasElement; startX: number; startY: number }
  | { type: 'moving'; startX: number; startY: number; origPositions: Map<string, { x: number; y: number }> }
  | { type: 'resizing'; elementId: string; handle: HandlePosition; startX: number; startY: number; origBounds: { x: number; y: number; width: number; height: number } }
  | { type: 'panning'; startX: number; startY: number; startScrollX: number; startScrollY: number }
  | { type: 'selecting'; startX: number; startY: number };

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<ActionState>({ type: 'idle' });
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const [editingText, setEditingText] = useState<{ id: string; x: number; y: number } | null>(null);
  const [snapPoint, setSnapPoint] = useState<Point | null>(null);
  const rafRef = useRef<number>(0);

  const store = useCanvasStore;

  // Render loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const state = store.getState();
    renderCanvas(
      canvas,
      state.elements,
      state.selectedElementIds,
      state.viewport,
      state.collaborators,
      snapPoint,
    );
  }, [store, snapPoint]);

  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      render();
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [render]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.style.width = `${container.clientWidth}px`;
      canvas.style.height = `${container.clientHeight}px`;
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getCanvasCoords = useCallback((e: React.MouseEvent | MouseEvent | React.PointerEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const viewport = store.getState().viewport;
    return screenToCanvas(e.clientX - rect.left, e.clientY - rect.top, viewport);
  }, [store]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const state = store.getState();
    const { activeTool, viewport } = state;
    const pos = getCanvasCoords(e);

    // Middle mouse button = pan
    if (e.button === 1 || activeTool === 'pan') {
      actionRef.current = {
        type: 'panning',
        startX: e.clientX,
        startY: e.clientY,
        startScrollX: viewport.scrollX,
        startScrollY: viewport.scrollY,
      };
      return;
    }

    if (activeTool === 'select') {
      // Check handles
      for (const id of state.selectedElementIds) {
        const el = state.elements.find((item: CanvasElement) => item.id === id);
        if (el) {
          const handle = hitTestHandle(pos.x, pos.y, el, viewport.zoom);
          if (handle) {
            const bounds = getElementBounds(el);
            state.pushHistory();
            actionRef.current = {
              type: 'resizing',
              elementId: el.id,
              handle,
              startX: pos.x,
              startY: pos.y,
              origBounds: { ...bounds },
            };
            return;
          }
        }
      }

      // Hit test elements
      const nonDeleted = state.elements.filter((item: CanvasElement) => !item.isDeleted);
      const hit = hitTestElements(pos.x, pos.y, nonDeleted);
      if (hit) {
        const isAlreadySelected = state.selectedElementIds.includes(hit.id);
        if (e.shiftKey) {
          if (isAlreadySelected) {
            store.getState().setSelectedElementIds(state.selectedElementIds.filter((id: string) => id !== hit.id));
          } else {
            store.getState().setSelectedElementIds([...state.selectedElementIds, hit.id]);
          }
        } else if (!isAlreadySelected) {
          store.getState().setSelectedElementIds([hit.id]);
        }

        const selectedIds = store.getState().selectedElementIds;
        const origPositions = new Map<string, { x: number; y: number }>();
        for (const id of selectedIds) {
          const el = state.elements.find((item: CanvasElement) => item.id === id);
          if (el) origPositions.set(id, { x: el.x, y: el.y });
        }
        state.pushHistory();
        actionRef.current = {
          type: 'moving',
          startX: pos.x,
          startY: pos.y,
          origPositions,
        };
      } else {
        store.getState().setSelectedElementIds([]);
        actionRef.current = {
          type: 'selecting',
          startX: pos.x,
          startY: pos.y,
        };
      }
      return;
    }

    if (activeTool === 'eraser') {
      const nonDeleted = state.elements.filter((item: CanvasElement) => !item.isDeleted);
      const hit = hitTestElements(pos.x, pos.y, nonDeleted);
      if (hit) {
        store.getState().deleteElements([hit.id]);
      }
      return;
    }

    if (activeTool === 'text') {
      const el = createElement('text', pos.x, pos.y, state.currentStyle);
      el.width = 200;
      el.height = 30;
      store.getState().addElement(el);
      setEditingText({ id: el.id, x: e.clientX, y: e.clientY });
      return;
    }

    // Drawing shapes or connectors
    let startX = pos.x;
    let startY = pos.y;
    let startBinding: PointBinding | null = null;

    if (activeTool === 'line' || activeTool === 'arrow') {
      const snap = findNearestConnectionPoint(pos.x, pos.y, state.elements);
      if (snap) {
        startX = snap.x;
        startY = snap.y;
        startBinding = { elementId: snap.elementId, pointId: snap.pointId };
      }
    }

    const element = createElement(
      activeTool as CanvasElement['type'],
      startX,
      startY,
      state.currentStyle,
    );

    if (startBinding) {
      element.startBinding = startBinding;
    }

    actionRef.current = {
      type: 'drawing',
      element,
      startX,
      startY,
    };
  }, [store, getCanvasCoords]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const action = actionRef.current;
    const state = store.getState();
    const pos = getCanvasCoords(e);

    // Update cursor based on hover
    const canvas = canvasRef.current;
    if (canvas && action.type === 'idle' && state.activeTool === 'select') {
      for (const id of state.selectedElementIds) {
        const el = state.elements.find((item: CanvasElement) => item.id === id);
        if (el) {
          const handle = hitTestHandle(pos.x, pos.y, el, state.viewport.zoom);
          if (handle) {
            canvas.style.cursor = getHandleCursor(handle);
            return;
          }
        }
      }
      const nonDeleted = state.elements.filter((item: CanvasElement) => !item.isDeleted);
      const hit = hitTestElements(pos.x, pos.y, nonDeleted);
      canvas.style.cursor = hit ? 'move' : 'default';
    }

    switch (action.type) {
      case 'drawing': {
        const { element, startX, startY } = action;

        if (element.type === 'freedraw') {
          const newPoint = { x: pos.x - element.x, y: pos.y - element.y };
          element.points = [...(element.points || []), newPoint];
        } else if (element.type === 'line' || element.type === 'arrow') {
          // Check magnetic snap for end point
          const snap = findNearestConnectionPoint(pos.x, pos.y, state.elements, element.id);
          let endX = pos.x;
          let endY = pos.y;

          if (snap) {
            endX = snap.x;
            endY = snap.y;
            element.endBinding = { elementId: snap.elementId, pointId: snap.pointId };
            setSnapPoint({ x: snap.x, y: snap.y });
          } else {
            element.endBinding = null;
            setSnapPoint(null);
          }

          element.points = [{ x: 0, y: 0 }, { x: endX - startX, y: endY - startY }];
          element.width = Math.abs(endX - startX);
          element.height = Math.abs(endY - startY);
        } else {
          const x = Math.min(startX, pos.x);
          const y = Math.min(startY, pos.y);
          const w = Math.abs(pos.x - startX);
          const h = Math.abs(pos.y - startY);
          element.x = x;
          element.y = y;
          element.width = w;
          element.height = h;
        }

        const existingIndex = state.elements.findIndex((item: CanvasElement) => item.id === element.id);
        if (existingIndex >= 0) {
          store.getState().updateElement(element.id, { ...element });
        } else {
          store.getState().setElements([...state.elements, element]);
        }
        break;
      }

      case 'moving': {
        const dx = pos.x - action.startX;
        const dy = pos.y - action.startY;
        const updates = Array.from(action.origPositions.entries()).map(([id, orig]) => ({
          id,
          changes: { x: orig.x + dx, y: orig.y + dy },
        }));
        store.getState().updateElements(updates);
        break;
      }

      case 'resizing': {
        const el = state.elements.find((item: CanvasElement) => item.id === action.elementId);
        if (!el) break;
        const { handle, origBounds } = action;
        const dx = pos.x - action.startX;
        const dy = pos.y - action.startY;

        let newX = origBounds.x;
        let newY = origBounds.y;
        let newW = origBounds.width;
        let newH = origBounds.height;

        if (handle.includes('w')) { newX = origBounds.x + dx; newW = origBounds.width - dx; }
        if (handle.includes('e')) { newW = origBounds.width + dx; }
        if (handle.includes('n')) { newY = origBounds.y + dy; newH = origBounds.height - dy; }
        if (handle.includes('s')) { newH = origBounds.height + dy; }

        if (newW < 5) newW = 5;
        if (newH < 5) newH = 5;

        store.getState().updateElement(action.elementId, {
          x: newX, y: newY, width: newW, height: newH,
        });
        break;
      }

      case 'panning': {
        const dx = (e.clientX - action.startX) / state.viewport.zoom;
        const dy = (e.clientY - action.startY) / state.viewport.zoom;
        store.getState().setViewport({
          scrollX: action.startScrollX + dx,
          scrollY: action.startScrollY + dy,
        });
        break;
      }

      case 'selecting': {
        const x1 = Math.min(action.startX, pos.x);
        const y1 = Math.min(action.startY, pos.y);
        const x2 = Math.max(action.startX, pos.x);
        const y2 = Math.max(action.startY, pos.y);
        const selected = state.elements
          .filter((item: CanvasElement) => !item.isDeleted)
          .filter((item: CanvasElement) => {
            const b = getElementBounds(item);
            return b.x >= x1 && b.y >= y1 && b.x + b.width <= x2 && b.y + b.height <= y2;
          })
          .map((item: CanvasElement) => item.id);
        store.getState().setSelectedElementIds(selected);
        break;
      }
    }

    // Broadcast cursor for collaboration
    if (state.isCollaborating && (window as any).__yjsAwareness) {
      const awareness = (window as any).__yjsAwareness;
      awareness.setLocalStateField('cursor', { x: pos.x, y: pos.y });
    }
  }, [store, getCanvasCoords]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (canvas) canvas.releasePointerCapture(e.pointerId);

    const action = actionRef.current;
    const state = store.getState();

    if (action.type === 'drawing') {
      const el = action.element;
      if (el.type === 'freedraw') {
        if (el.points && el.points.length > 2) {
          state.pushHistory();
        }
      } else if (el.type === 'line' || el.type === 'arrow') {
        if (el.points && el.points.length >= 2) {
          const p = el.points[el.points.length - 1];
          if (Math.abs(p.x) > 2 || Math.abs(p.y) > 2) {
            state.pushHistory();
          }
        }
      } else {
        if (el.width > 2 && el.height > 2) {
          state.pushHistory();
        } else {
          store.getState().setElements(state.elements.filter((item: CanvasElement) => item.id !== el.id));
        }
      }
    }

    setSnapPoint(null);
    actionRef.current = { type: 'idle' };
  }, [store]);

  // Wheel zoom and pan
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const state = store.getState();
    const { viewport } = state;

    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = Math.min(Math.max(viewport.zoom * zoomFactor, 0.1), 5);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newScrollX = mouseX / newZoom - (mouseX / viewport.zoom - viewport.scrollX);
      const newScrollY = mouseY / newZoom - (mouseY / viewport.zoom - viewport.scrollY);

      store.getState().setViewport({
        zoom: newZoom,
        scrollX: newScrollX,
        scrollY: newScrollY,
      });
    } else {
      store.getState().setViewport({
        scrollX: viewport.scrollX - e.deltaX / viewport.zoom,
        scrollY: viewport.scrollY - e.deltaY / viewport.zoom,
      });
    }
  }, [store]);

  // Keyboard shortcuts & Clipboard & Grouping
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      const state = store.getState();

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) state.redo();
        else state.undo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        state.redo();
        return;
      }

      // Copy (Ctrl+C)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        state.copySelected();
        return;
      }

      // Paste (Ctrl+V)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        state.pasteClipboard();
        return;
      }

      // Duplicate (Ctrl+D)
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        state.duplicateElements(state.selectedElementIds);
        return;
      }

      // Group / Ungroup (Ctrl+G / Ctrl+Shift+G)
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        if (e.shiftKey) {
          state.ungroupSelected();
        } else {
          state.groupSelected();
        }
        return;
      }

      // Select All (Ctrl+A)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        state.selectAll();
        return;
      }

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedElementIds.length > 0) {
          e.preventDefault();
          state.deleteElements(state.selectedElementIds);
        }
        return;
      }

      // Tool shortcuts
      const toolMap: Record<string, ToolType> = {
        v: 'select',
        h: 'pan',
        r: 'rectangle',
        o: 'ellipse',
        d: 'diamond',
        l: 'line',
        a: 'arrow',
        p: 'freedraw',
        t: 'text',
        e: 'eraser',
      };

      const key = e.key.toLowerCase();
      if (toolMap[key] && !e.ctrlKey && !e.metaKey && !e.altKey) {
        state.setActiveTool(toolMap[key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store]);

  // Double click for text editing
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const state = store.getState();
    const pos = getCanvasCoords(e);
    const nonDeleted = state.elements.filter((item: CanvasElement) => !item.isDeleted);
    const hit = hitTestElements(pos.x, pos.y, nonDeleted);
    if (hit && hit.type === 'text') {
      setEditingText({ id: hit.id, x: e.clientX, y: e.clientY });
    }
  }, [store, getCanvasCoords]);

  const handleTextBlur = useCallback(() => {
    if (editingText && textInputRef.current) {
      const text = textInputRef.current.value;
      if (text.trim()) {
        store.getState().updateElement(editingText.id, { text });
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const state = store.getState();
            const el = state.elements.find((item: CanvasElement) => item.id === editingText.id);
            if (el) {
              const fontSize = el.fontSize || 20;
              ctx.font = `${fontSize}px ${el.fontFamily || "'Architects Daughter', cursive"}`;
              const lines = text.split('\n');
              const maxWidth = Math.max(...lines.map((l: string) => ctx.measureText(l).width));
              store.getState().updateElement(editingText.id, {
                text,
                width: maxWidth + 10,
                height: lines.length * fontSize * 1.3,
              });
            }
          }
        }
      } else {
        store.getState().deleteElements([editingText.id]);
      }
    }
    setEditingText(null);
  }, [editingText, store]);

  const cursorMap: Record<ToolType, string> = {
    select: 'default',
    pan: 'grab',
    rectangle: 'crosshair',
    ellipse: 'crosshair',
    diamond: 'crosshair',
    line: 'crosshair',
    arrow: 'crosshair',
    freedraw: 'crosshair',
    text: 'text',
    eraser: 'pointer',
  };

  const activeTool = useCanvasStore((s) => s.activeTool);

  return (
    <div ref={containerRef} className="canvas-container" onDoubleClick={handleDoubleClick}>
      <canvas
        ref={canvasRef}
        className="main-canvas"
        style={{ cursor: cursorMap[activeTool] || 'default' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      />
      {editingText && (
        <textarea
          ref={textInputRef}
          className="canvas-text-editor"
          style={{
            left: editingText.x,
            top: editingText.y,
          }}
          autoFocus
          onBlur={handleTextBlur}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              handleTextBlur();
            }
          }}
        />
      )}
    </div>
  );
}
