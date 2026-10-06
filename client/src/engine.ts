/* ─── Canvas Rendering Engine ─── */
import rough from 'roughjs';
import type {
  CanvasElement,
  Viewport,
  Collaborator,
  Point,
  HandlePosition,
  TransformHandle,
  ConnectionPointId,
  PointBinding,
} from './types';
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
    x: screenX / viewport.zoom - viewport.scrollX,
    y: screenY / viewport.zoom - viewport.scrollY,
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
    return { x: minX, y: minY, width: Math.max(maxX - minX, 1), height: Math.max(maxY - minY, 1) };
  }
  return { x: el.x, y: el.y, width: el.width, height: el.height };
}

/** Get logical perimeter connection points for shapes */
export function getConnectionPoints(el: CanvasElement): Array<{ id: ConnectionPointId; x: number; y: number }> {
  if (el.isDeleted || el.type === 'line' || el.type === 'arrow' || el.type === 'freedraw') {
    return [];
  }
  const midX = el.x + el.width / 2;
  const midY = el.y + el.height / 2;

  return [
    { id: 'top', x: midX, y: el.y },
    { id: 'right', x: el.x + el.width, y: midY },
    { id: 'bottom', x: midX, y: el.y + el.height },
    { id: 'left', x: el.x, y: midY },
    { id: 'center', x: midX, y: midY },
  ];
}

/** Find nearest connection point for magnetic snapping */
export function findNearestConnectionPoint(
  canvasX: number,
  canvasY: number,
  elements: CanvasElement[],
  excludeId?: string,
  maxDistance = 25,
): { elementId: string; pointId: ConnectionPointId; x: number; y: number } | null {
  let closest: { elementId: string; pointId: ConnectionPointId; x: number; y: number } | null = null;
  let minDist = maxDistance;

  for (const el of elements) {
    if (el.isDeleted || el.id === excludeId) continue;
    const points = getConnectionPoints(el);
    for (const pt of points) {
      const dist = Math.hypot(canvasX - pt.x, canvasY - pt.y);
      if (dist < minDist) {
        minDist = dist;
        closest = {
          elementId: el.id,
          pointId: pt.id,
          x: pt.x,
          y: pt.y,
        };
      }
    }
  }

  return closest;
}

/** Calculate absolute point for a bound element */
export function getBoundPointPosition(binding: PointBinding, elements: CanvasElement[]): Point | null {
  const target = elements.find((e) => e.id === binding.elementId && !e.isDeleted);
  if (!target) return null;

  const points = getConnectionPoints(target);
  const found = points.find((p) => p.id === binding.pointId);
  return found ? { x: found.x, y: found.y } : { x: target.x + target.width / 2, y: target.y + target.height / 2 };
}

/** Update attached connectors when shapes move */
export function updateConnectedConnectors(
  movedElementIds: string[],
  elements: CanvasElement[],
): CanvasElement[] {
  const movedSet = new Set(movedElementIds);
  let hasChanges = false;

  const nextElements = elements.map((el) => {
    if ((el.type !== 'line' && el.type !== 'arrow') || (!el.startBinding && !el.endBinding)) {
      return el;
    }

    const startAffects = el.startBinding && movedSet.has(el.startBinding.elementId);
    const endAffects = el.endBinding && movedSet.has(el.endBinding.elementId);

    if (!startAffects && !endAffects) return el;

    hasChanges = true;
    let startPos = { x: el.x, y: el.y };
    if (el.startBinding) {
      const p = getBoundPointPosition(el.startBinding, elements);
      if (p) startPos = p;
    }

    let endPos = {
      x: el.x + (el.points && el.points.length > 1 ? el.points[el.points.length - 1].x : el.width),
      y: el.y + (el.points && el.points.length > 1 ? el.points[el.points.length - 1].y : el.height),
    };
    if (el.endBinding) {
      const p = getBoundPointPosition(el.endBinding, elements);
      if (p) endPos = p;
    }

    const updatedPoints: Point[] = [
      { x: 0, y: 0 },
      { x: endPos.x - startPos.x, y: endPos.y - startPos.y },
    ];

    return {
      ...el,
      x: startPos.x,
      y: startPos.y,
      width: Math.abs(endPos.x - startPos.x),
      height: Math.abs(endPos.y - startPos.y),
      points: updatedPoints,
      version: el.version + 1,
      versionNonce: Math.floor(Math.random() * 2147483647),
    };
  });

  return hasChanges ? nextElements : elements;
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
      const rx = el.width / 2 + margin;
      const ry = el.height / 2 + margin;
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      if (rx <= 0 || ry <= 0) return false;
      return ((canvasX - cx) ** 2) / (rx ** 2) + ((canvasY - cy) ** 2) / (ry ** 2) <= 1;
    }
    case 'line':
    case 'arrow': {
      if (!el.points || el.points.length < 2) return false;
      for (let i = 0; i < el.points.length - 1; i++) {
        const p1 = { x: el.x + el.points[i].x, y: el.y + el.points[i].y };
        const p2 = { x: el.x + el.points[i + 1].x, y: el.y + el.points[i + 1].y };
        if (distanceToSegment({ x: canvasX, y: canvasY }, p1, p2) <= margin + 4) {
          return true;
        }
      }
      return false;
    }
    case 'freedraw': {
      if (!el.points || el.points.length === 0) return false;
      for (const p of el.points) {
        if (Math.hypot(canvasX - (el.x + p.x), canvasY - (el.y + p.y)) <= margin + 6) {
          return true;
        }
      }
      return false;
    }
  }
  return false;
}

/** Distance from point to line segment */
function distanceToSegment(p: Point, v: Point, w: Point): number {
  const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}

/** Hit test against all elements (top-most first) */
export function hitTestElements(canvasX: number, canvasY: number, elements: CanvasElement[]): CanvasElement | null {
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (hitTestElement(canvasX, canvasY, el)) {
      return el;
    }
  }
  return null;
}

/** Helper to convert element style to roughjs options */
function toRoughOptions(el: CanvasElement): RoughOptions {
  return {
    stroke: el.strokeColor,
    strokeWidth: el.strokeWidth,
    fill: el.backgroundColor !== 'transparent' ? el.backgroundColor : undefined,
    fillStyle: el.fillStyle,
    roughness: el.roughness,
    seed: el.seed,
  };
}

/** Draw a single element */
export function drawElement(
  ctx: CanvasRenderingContext2D,
  rc: RoughCanvas,
  el: CanvasElement,
) {
  if (el.isDeleted) return;

  ctx.save();
  ctx.globalAlpha = el.opacity / 100;

  const opt = toRoughOptions(el);

  switch (el.type) {
    case 'rectangle':
      rc.rectangle(el.x, el.y, el.width, el.height, opt);
      break;

    case 'ellipse':
      rc.ellipse(
        el.x + el.width / 2,
        el.y + el.height / 2,
        el.width,
        el.height,
        opt,
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
        opt,
      );
      break;
    }

    case 'line': {
      if (el.points && el.points.length >= 2) {
        const start = el.points[0];
        const end = el.points[el.points.length - 1];
        rc.line(el.x + start.x, el.y + start.y, el.x + end.x, el.y + end.y, opt);
      }
      break;
    }

    case 'arrow': {
      if (el.points && el.points.length >= 2) {
        const start = el.points[0];
        const end = el.points[el.points.length - 1];
        const x1 = el.x + start.x;
        const y1 = el.y + start.y;
        const x2 = el.x + end.x;
        const y2 = el.y + end.y;

        rc.line(x1, y1, x2, y2, opt);

        // Arrow head
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLength = Math.max(14, el.strokeWidth * 4);
        const a1 = angle - Math.PI / 6;
        const a2 = angle + Math.PI / 6;

        rc.line(x2, y2, x2 - headLength * Math.cos(a1), y2 - headLength * Math.sin(a1), opt);
        rc.line(x2, y2, x2 - headLength * Math.cos(a2), y2 - headLength * Math.sin(a2), opt);
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

/** Draw magnetic snap point indicator */
export function drawConnectionSnapIndicator(
  ctx: CanvasRenderingContext2D,
  snap: { x: number; y: number },
  zoom: number,
) {
  ctx.save();
  const radius = 6 / zoom;
  const pulseRadius = 11 / zoom;

  // Outer glow pulse
  ctx.fillStyle = 'rgba(88, 166, 255, 0.25)';
  ctx.beginPath();
  ctx.arc(snap.x, snap.y, pulseRadius, 0, Math.PI * 2);
  ctx.fill();

  // Outer ring
  ctx.strokeStyle = '#58a6ff';
  ctx.lineWidth = 2 / zoom;
  ctx.beginPath();
  ctx.arc(snap.x, snap.y, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Center dot
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(snap.x, snap.y, 3 / zoom, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** Draw grid */
function drawGrid(ctx: CanvasRenderingContext2D, viewport: Viewport, canvasWidth: number, canvasHeight: number) {
  const gridSize = 20;
  const effectiveGridSize = gridSize * viewport.zoom;
  if (effectiveGridSize < 8) return;

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
  activeSnapPoint: Point | null = null,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
    canvas.width = width * dpr;
    canvas.height = height * dpr;
  }

  ctx.save();
  ctx.scale(dpr, dpr);

  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, width, height);

  drawGrid(ctx, viewport, width, height);

  ctx.save();
  ctx.scale(viewport.zoom, viewport.zoom);
  ctx.translate(viewport.scrollX, viewport.scrollY);

  const rc = rough.canvas(canvas);
  const nonDeleted = elements.filter((el) => !el.isDeleted);
  for (const el of nonDeleted) {
    drawElement(ctx, rc, el);
  }

  const selectedSet = new Set(selectedIds);
  for (const el of nonDeleted) {
    if (selectedSet.has(el.id)) {
      drawSelectionOutline(ctx, el, viewport.zoom);
    }
  }

  if (activeSnapPoint) {
    drawConnectionSnapIndicator(ctx, activeSnapPoint, viewport.zoom);
  }

  ctx.restore();

  drawCollaborators(ctx, collaborators, viewport);

  ctx.restore();
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
