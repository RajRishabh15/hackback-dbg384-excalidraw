/* ─── Canvas Rendering Engine ─── */
import rough from 'roughjs';
import type { CanvasElement, Viewport, Collaborator, Point, HandlePosition, TransformHandle } from './types';
import type { RoughCanvas } from 'roughjs/bin/canvas';
import type { Options as RoughOptions } from 'roughjs/bin/core';

const HANDLE_SIZE = 8;
const COLLABORATOR_COLORS = [
  '#ff6b6b', '#51cf66', '#339af0', '#fcc419', '#cc5de8',
  '#ff922b', '#20c997', '#845ef7', '#f06595', '#22b8cf',
];

export function getCollaboratorColor(index: number): string {
  return COLLABORATOR_COLORS[index % COLLABORATOR_COLORS.length];
}

/** Convert screen coordinates to canvas coordinates */
export function screenToCanvas(screenX: number, screenY: number, viewport: Viewport): Point {
  return {
    x: (screenX) / viewport.zoom - viewport.scrollX,
    y: (screenY) / viewport.zoom - viewport.scrollY,
  };
}

/** Convert canvas coordinates to screen coordinates */
export function canvasToScreen(canvasX: number, canvasY: number, viewport: Viewport): Point {
  return {
    x: (canvasX + viewport.scrollX) * viewport.zoom,
    y: (canvasY + viewport.scrollY) * viewport.zoom,
  };
}

/** Get element bounding box */
export function getElementBounds(el: CanvasElement): { x: number; y: number; width: number; height: number } {
  if (el.type === 'freedraw' && el.points && el.points.length > 0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of el.points) {
      minX = Math.min(minX, el.x + p.x);
      minY = Math.min(minY, el.y + p.y);
      maxX = Math.max(maxX, el.x + p.x);
      maxY = Math.max(maxY, el.y + p.y);
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
  if ((el.type === 'line' || el.type === 'arrow') && el.points && el.points.length >= 2) {
    const start = el.points[0];
    const end = el.points[el.points.length - 1];
    const minX = Math.min(el.x + start.x, el.x + end.x);
    const minY = Math.min(el.y + start.y, el.y + end.y);
    const maxX = Math.max(el.x + start.x, el.x + end.x);
    const maxY = Math.max(el.y + start.y, el.y + end.y);
    return { x: minX, y: minY, width: maxX - minX || 1, height: maxY - minY || 1 };
  }
  return { x: el.x, y: el.y, width: el.width, height: el.height };
}

/** Get transform handles for an element */
export function getTransformHandles(el: CanvasElement): TransformHandle[] {
  const b = getElementBounds(el);
  const hw = HANDLE_SIZE / 2;
  return [
    { position: 'nw', x: b.x - hw, y: b.y - hw },
    { position: 'n', x: b.x + b.width / 2 - hw, y: b.y - hw },
    { position: 'ne', x: b.x + b.width - hw, y: b.y - hw },
    { position: 'e', x: b.x + b.width - hw, y: b.y + b.height / 2 - hw },
    { position: 'se', x: b.x + b.width - hw, y: b.y + b.height - hw },
    { position: 's', x: b.x + b.width / 2 - hw, y: b.y + b.height - hw },
    { position: 'sw', x: b.x - hw, y: b.y + b.height - hw },
    { position: 'w', x: b.x - hw, y: b.y + b.height / 2 - hw },
  ];
}

/** Hit test: check if a point hits a transform handle */
export function hitTestHandle(
  canvasX: number, canvasY: number, el: CanvasElement, zoom: number
): HandlePosition | null {
  const handles = getTransformHandles(el);
  const threshold = (HANDLE_SIZE + 4) / zoom;
  for (const h of handles) {
    if (Math.abs(canvasX - h.x - HANDLE_SIZE / 2) < threshold &&
        Math.abs(canvasY - h.y - HANDLE_SIZE / 2) < threshold) {
      return h.position;
    }
  }
  return null;
}

/** Hit test: check if a point is inside an element */
export function hitTestElement(canvasX: number, canvasY: number, el: CanvasElement): boolean {
  if (el.isDeleted) return false;

  const margin = Math.max(el.strokeWidth, 6);

  switch (el.type) {
    case 'rectangle':
    case 'diamond':
    case 'text': {
      return (
        canvasX >= el.x - margin &&
        canvasX <= el.x + el.width + margin &&
        canvasY >= el.y - margin &&
        canvasY <= el.y + el.height + margin
      );
    }
    case 'ellipse': {
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      const rx = el.width / 2 + margin;
      const ry = el.height / 2 + margin;
      const dx = (canvasX - cx) / rx;
      const dy = (canvasY - cy) / ry;
      return dx * dx + dy * dy <= 1;
    }
    case 'line':
    case 'arrow': {
      if (!el.points || el.points.length < 2) return false;
      const start = el.points[0];
      const end = el.points[el.points.length - 1];
      return distToSegment(
        canvasX, canvasY,
        el.x + start.x, el.y + start.y,
        el.x + end.x, el.y + end.y
      ) < margin + 4;
    }
    case 'freedraw': {
      if (!el.points || el.points.length < 2) return false;
      for (let i = 1; i < el.points.length; i++) {
        const dist = distToSegment(
          canvasX, canvasY,
          el.x + el.points[i - 1].x, el.y + el.points[i - 1].y,
          el.x + el.points[i].x, el.y + el.points[i].y
        );
        if (dist < margin + 4) return true;
      }
      return false;
    }
    default:
      return false;
  }
}

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/** Hit test all elements (reverse order for top element first) */
export function hitTestElements(canvasX: number, canvasY: number, elements: CanvasElement[]): CanvasElement | null {
  for (let i = elements.length - 1; i >= 0; i--) {
    if (hitTestElement(canvasX, canvasY, elements[i])) {
      return elements[i];
    }
  }
  return null;
}

/** Draw an arrow head */
function drawArrowhead(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, strokeWidth: number) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = Math.max(15, strokeWidth * 5);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
  ctx.restore();
}

/** Draw a single element */
export function drawElement(ctx: CanvasRenderingContext2D, rc: RoughCanvas, el: CanvasElement) {
  if (el.isDeleted) return;

  ctx.save();
  ctx.globalAlpha = el.opacity / 100;

  const roughOpts: RoughOptions = {
    stroke: el.strokeColor,
    fill: el.backgroundColor !== 'transparent' ? el.backgroundColor : undefined,
    fillStyle: el.fillStyle as string,
    strokeWidth: el.strokeWidth,
    roughness: el.roughness,
    seed: el.seed,
  };

  switch (el.type) {
    case 'rectangle':
      rc.rectangle(el.x, el.y, el.width, el.height, roughOpts);
      break;

    case 'ellipse':
      rc.ellipse(
        el.x + el.width / 2,
        el.y + el.height / 2,
        el.width,
        el.height,
        roughOpts
      );
      break;

    case 'diamond': {
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      rc.polygon(
        [
          [cx, el.y],
          [el.x + el.width, cy],
          [cx, el.y + el.height],
          [el.x, cy],
        ],
        roughOpts
      );
      break;
    }

    case 'line':
    case 'arrow': {
      if (el.points && el.points.length >= 2) {
        const start = el.points[0];
        const end = el.points[el.points.length - 1];
        rc.line(
          el.x + start.x, el.y + start.y,
          el.x + end.x, el.y + end.y,
          roughOpts
        );
        if (el.type === 'arrow') {
          drawArrowhead(
            ctx,
            el.x + start.x, el.y + start.y,
            el.x + end.x, el.y + end.y,
            el.strokeColor,
            el.strokeWidth
          );
        }
      }
      break;
    }

    case 'freedraw': {
      if (el.points && el.points.length > 1) {
        ctx.save();
        ctx.strokeStyle = el.strokeColor;
        ctx.lineWidth = el.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(el.x + el.points[0].x, el.y + el.points[0].y);
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.x + el.points[i].x, el.y + el.points[i].y);
        }
        ctx.stroke();
        ctx.restore();
      }
      break;
    }

    case 'text': {
      const fontSize = el.fontSize || 20;
      const fontFamily = el.fontFamily || "'Architects Daughter', cursive";
      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.fillStyle = el.strokeColor;
      ctx.textBaseline = 'top';
      const lines = (el.text || '').split('\n');
      lines.forEach((line, i) => {
        ctx.fillText(line, el.x, el.y + i * fontSize * 1.3);
      });
      break;
    }
  }

  ctx.restore();
}

/** Draw selection outline and handles */
export function drawSelectionOutline(ctx: CanvasRenderingContext2D, el: CanvasElement, zoom: number) {
  const b = getElementBounds(el);
  const padding = 4;

  ctx.save();
  ctx.strokeStyle = '#58a6ff';
  ctx.lineWidth = 1.5 / zoom;
  ctx.setLineDash([5 / zoom, 3 / zoom]);
  ctx.strokeRect(b.x - padding, b.y - padding, b.width + padding * 2, b.height + padding * 2);
  ctx.setLineDash([]);

  // Draw handles
  const handles = getTransformHandles(el);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#58a6ff';
  ctx.lineWidth = 1.5 / zoom;
  const size = HANDLE_SIZE / zoom;
  for (const h of handles) {
    ctx.fillRect(h.x + (HANDLE_SIZE - size) / 2, h.y + (HANDLE_SIZE - size) / 2, size, size);
    ctx.strokeRect(h.x + (HANDLE_SIZE - size) / 2, h.y + (HANDLE_SIZE - size) / 2, size, size);
  }
  ctx.restore();
}

/** Draw grid */
function drawGrid(ctx: CanvasRenderingContext2D, viewport: Viewport, canvasWidth: number, canvasHeight: number) {
  const gridSize = 20;
  const effectiveGridSize = gridSize * viewport.zoom;

  if (effectiveGridSize < 8) return; // Too zoomed out

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 0.5;

  const startX = (viewport.scrollX * viewport.zoom) % effectiveGridSize;
  const startY = (viewport.scrollY * viewport.zoom) % effectiveGridSize;

  for (let x = startX; x < canvasWidth; x += effectiveGridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasHeight);
    ctx.stroke();
  }
  for (let y = startY; y < canvasHeight; y += effectiveGridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvasWidth, y);
    ctx.stroke();
  }
  ctx.restore();
}

/** Draw collaborator cursors */
function drawCollaborators(ctx: CanvasRenderingContext2D, collaborators: Map<number, Collaborator>, viewport: Viewport) {
  collaborators.forEach((collab) => {
    if (!collab.cursor) return;
    const screen = canvasToScreen(collab.cursor.x, collab.cursor.y, viewport);

    ctx.save();
    // Cursor arrow
    ctx.fillStyle = collab.color;
    ctx.beginPath();
    ctx.moveTo(screen.x, screen.y);
    ctx.lineTo(screen.x + 2, screen.y + 16);
    ctx.lineTo(screen.x + 8, screen.y + 11);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Name label
    ctx.font = '12px Inter, sans-serif';
    const textWidth = ctx.measureText(collab.name).width;
    const labelX = screen.x + 10;
    const labelY = screen.y + 16;
    ctx.fillStyle = collab.color;
    ctx.beginPath();
    ctx.roundRect(labelX, labelY, textWidth + 12, 22, 4);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(collab.name, labelX + 6, labelY + 15);
    ctx.restore();
  });
}

/** Main render function */
export function renderCanvas(
  canvas: HTMLCanvasElement,
  elements: CanvasElement[],
  selectedIds: string[],
  viewport: Viewport,
  collaborators: Map<number, Collaborator>,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  // Set canvas size for sharp rendering
  if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
    canvas.width = width * dpr;
    canvas.height = height * dpr;
  }

  ctx.save();
  ctx.scale(dpr, dpr);

  // Clear
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, width, height);

  // Draw grid (in screen space)
  drawGrid(ctx, viewport, width, height);

  // Apply viewport transform
  ctx.save();
  ctx.scale(viewport.zoom, viewport.zoom);
  ctx.translate(viewport.scrollX, viewport.scrollY);

  // Draw elements
  const rc = rough.canvas(canvas);
  const nonDeleted = elements.filter((el) => !el.isDeleted);
  for (const el of nonDeleted) {
    drawElement(ctx, rc, el);
  }

  // Draw selection outlines
  const selectedSet = new Set(selectedIds);
  for (const el of nonDeleted) {
    if (selectedSet.has(el.id)) {
      drawSelectionOutline(ctx, el, viewport.zoom);
    }
  }

  ctx.restore(); // viewport transform

  // Draw collaborator cursors (in screen space)
  drawCollaborators(ctx, collaborators, viewport);

  ctx.restore(); // dpr scale
}

/** Get cursor style for a handle position */
export function getHandleCursor(position: HandlePosition): string {
  const cursors: Record<HandlePosition, string> = {
    nw: 'nwse-resize',
    n: 'ns-resize',
    ne: 'nesw-resize',
    e: 'ew-resize',
    se: 'nwse-resize',
    s: 'ns-resize',
    sw: 'nesw-resize',
    w: 'ew-resize',
  };
  return cursors[position];
}
