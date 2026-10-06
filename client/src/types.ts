/* ─── Type definitions for InkBoard ─── */

export type ToolType =
  | 'select'
  | 'pan'
  | 'rectangle'
  | 'ellipse'
  | 'diamond'
  | 'line'
  | 'arrow'
  | 'freedraw'
  | 'text'
  | 'eraser';

export type FillStyle = 'hachure' | 'cross-hatch' | 'solid' | 'zigzag';

export type ElementType = 'rectangle' | 'ellipse' | 'diamond' | 'line' | 'arrow' | 'freedraw' | 'text';

export interface Point {
  x: number;
  y: number;
}

export type ConnectionPointId = 'top' | 'right' | 'bottom' | 'left' | 'center';

export interface PointBinding {
  elementId: string;
  pointId: ConnectionPointId;
}

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  roughness: number;
  opacity: number;
  seed: number;
  points?: Point[];
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  isDeleted: boolean;
  locked: boolean;
  groupIds: string[];
  version: number;
  versionNonce: number;
  startBinding?: PointBinding | null;
  endBinding?: PointBinding | null;
}

export interface Viewport {
  scrollX: number;
  scrollY: number;
  zoom: number;
}

export interface Collaborator {
  clientId: number;
  name: string;
  color: string;
  cursor: Point | null;
  selectedElementIds: string[];
}

export interface Board {
  id: string;
  name: string;
  owner_id: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface StyleOptions {
  strokeColor: string;
  backgroundColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  roughness: number;
  opacity: number;
  fontSize: number;
  fontFamily: string;
}

export type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export interface TransformHandle {
  position: HandlePosition;
  x: number;
  y: number;
}
