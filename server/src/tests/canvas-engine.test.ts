/* ─── Canvas Engine & Sticky Connector Unit Tests ─── */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

interface Point {
  x: number;
  y: number;
}

type ConnectionPointId = 'top' | 'right' | 'bottom' | 'left' | 'center';

interface PointBinding {
  elementId: string;
  pointId: ConnectionPointId;
}

interface CanvasElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  points?: Point[];
  isDeleted: boolean;
  startBinding?: PointBinding | null;
  endBinding?: PointBinding | null;
  version: number;
}

function getElementBounds(el: CanvasElement) {
  if (el.points && el.points.length >= 2) {
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

function getConnectionPoints(el: CanvasElement): Array<{ id: ConnectionPointId; x: number; y: number }> {
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

function findNearestConnectionPoint(
  canvasX: number,
  canvasY: number,
  elements: CanvasElement[],
  excludeId?: string,
  maxDistance = 25,
) {
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

function updateConnectedConnectors(movedElementIds: string[], elements: CanvasElement[]): CanvasElement[] {
  const movedSet = new Set(movedElementIds);

  return elements.map((el) => {
    if ((el.type !== 'line' && el.type !== 'arrow') || (!el.startBinding && !el.endBinding)) {
      return el;
    }

    const startAffects = el.startBinding && movedSet.has(el.startBinding.elementId);
    const endAffects = el.endBinding && movedSet.has(el.endBinding.elementId);

    if (!startAffects && !endAffects) return el;

    let startPos = { x: el.x, y: el.y };
    if (el.startBinding) {
      const target = elements.find((e) => e.id === el.startBinding!.elementId);
      if (target) {
        const pts = getConnectionPoints(target);
        const p = pts.find((pt) => pt.id === el.startBinding!.pointId);
        if (p) startPos = { x: p.x, y: p.y };
      }
    }

    let endPos = {
      x: el.x + (el.points && el.points.length > 1 ? el.points[el.points.length - 1].x : el.width),
      y: el.y + (el.points && el.points.length > 1 ? el.points[el.points.length - 1].y : el.height),
    };
    if (el.endBinding) {
      const target = elements.find((e) => e.id === el.endBinding!.elementId);
      if (target) {
        const pts = getConnectionPoints(target);
        const p = pts.find((pt) => pt.id === el.endBinding!.pointId);
        if (p) endPos = { x: p.x, y: p.y };
      }
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
    };
  });
}

describe('Canvas Engine & Smart Connectors', () => {
  test('Calculates bounding box correctly for rectangle and arrow', () => {
    const rect: CanvasElement = {
      id: 'r1',
      type: 'rectangle',
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      isDeleted: false,
      version: 1,
    };
    const bounds = getElementBounds(rect);
    assert.equal(bounds.x, 100);
    assert.equal(bounds.y, 100);
    assert.equal(bounds.width, 200);
    assert.equal(bounds.height, 150);
  });

  test('Calculates perimeter connection points for shapes', () => {
    const rect: CanvasElement = {
      id: 'box-1',
      type: 'rectangle',
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      isDeleted: false,
      version: 1,
    };
    const points = getConnectionPoints(rect);
    assert.equal(points.length, 5);

    const top = points.find((p) => p.id === 'top');
    const right = points.find((p) => p.id === 'right');
    const bottom = points.find((p) => p.id === 'bottom');
    const left = points.find((p) => p.id === 'left');

    assert.deepEqual(top, { id: 'top', x: 200, y: 100 });
    assert.deepEqual(right, { id: 'right', x: 300, y: 150 });
    assert.deepEqual(bottom, { id: 'bottom', x: 200, y: 200 });
    assert.deepEqual(left, { id: 'left', x: 100, y: 150 });
  });

  test('Finds nearest magnetic connection point within threshold', () => {
    const rect: CanvasElement = {
      id: 'box-1',
      type: 'rectangle',
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      isDeleted: false,
      version: 1,
    };

    // Close to right connection point (300, 150)
    const snap = findNearestConnectionPoint(295, 152, [rect]);
    assert.ok(snap);
    assert.equal(snap.elementId, 'box-1');
    assert.equal(snap.pointId, 'right');
    assert.equal(snap.x, 300);
    assert.equal(snap.y, 150);

    // Far from shape -> no snap
    const noSnap = findNearestConnectionPoint(500, 500, [rect], undefined, 20);
    assert.equal(noSnap, null);
  });

  test('Dynamically updates connector endpoint when attached shape moves', () => {
    const shapeA: CanvasElement = {
      id: 'shape-a',
      type: 'rectangle',
      x: 100,
      y: 100,
      width: 100,
      height: 100,
      isDeleted: false,
      version: 1,
    };

    const shapeB: CanvasElement = {
      id: 'shape-b',
      type: 'rectangle',
      x: 400,
      y: 100,
      width: 100,
      height: 100,
      isDeleted: false,
      version: 1,
    };

    const connector: CanvasElement = {
      id: 'arrow-1',
      type: 'arrow',
      x: 200, // right of A (200, 150)
      y: 150,
      width: 200,
      height: 0,
      points: [{ x: 0, y: 0 }, { x: 200, y: 0 }], // connects to left of B (400, 150)
      startBinding: { elementId: 'shape-a', pointId: 'right' },
      endBinding: { elementId: 'shape-b', pointId: 'left' },
      isDeleted: false,
      version: 1,
    };

    const elements = [shapeA, shapeB, connector];

    // Move shapeB to x: 500, y: 250
    shapeB.x = 500;
    shapeB.y = 250;

    const updated = updateConnectedConnectors(['shape-b'], elements);
    const updatedArrow = updated.find((e) => e.id === 'arrow-1');

    assert.ok(updatedArrow);
    assert.equal(updatedArrow.x, 200); // shape-a right is at 200, 150
    assert.equal(updatedArrow.y, 150);
    // shape-b left is now at 500, 300 (250 + 100/2)
    assert.deepEqual(updatedArrow.points, [{ x: 0, y: 0 }, { x: 300, y: 150 }]);
    assert.equal(updatedArrow.version, 2);
  });
});
