# Domain Data Model & Canonical Entities

## 1. Domain Entities & Relationships

The platform organizes collaborative visual spaces into an enterprise domain hierarchy: Workspaces contain Boards, Boards contain Scenes and Snapshots, and Scenes contain Canvas Elements and Comments.

```
┌────────────────────────┐
│       Workspace        │
│  - id: UUID            │
│  - name: string        │
│  - slug: string        │
│  - tier: enum          │
└───────────┬────────────┘
            │ 1:N
            ▼
┌────────────────────────┐         ┌────────────────────────┐
│         Board          │◄────────┤      BoardMember       │
│  - id: UUID            │  N:M    │  - role: RoleEnum      │
│  - title: string       │         │  - userId: UUID        │
│  - isPublic: boolean   │         └────────────────────────┘
│  - isLocked: boolean   │
└───────────┬────────────┘
            │
            ├────────────────────────┬────────────────────────┐
            │ 1:N                    │ 1:N                    │ 1:N
            ▼                        ▼                        ▼
┌────────────────────────┐ ┌────────────────────────┐ ┌────────────────────────┐
│     BoardSnapshot      │ │      BoardComment      │ │     BoardAsset         │
│  - version: number     │ │  - id: UUID            │ │  - id: UUID            │
│  - crdtBinary: bytea   │ │  - x: number, y: number│ │  - mimeType: string    │
│  - elementCount: int   │ │  - text: string        │ │  - s3Key: string       │
│  - createdAt: timestamp│ │  - resolved: boolean   │ │  - sizeBytes: bigint   │
└────────────────────────┘ └────────────────────────┘ └────────────────────────┘
```

---

## 2. Canonical Canvas Element Types (TypeScript Domain Definitions)

Every visual item rendered on the whiteboard conforms to the `BoardElement` discriminated union.

```typescript
export type ElementType =
  | "rectangle"
  | "ellipse"
  | "diamond"
  | "line"
  | "arrow"
  | "freedraw"
  | "text"
  | "image"
  | "frame"
  | "sticky";

export type StrokeStyle = "solid" | "dashed" | "dotted";
export type FillStyle = "hachure" | "cross-hatch" | "solid" | "zigzag";
export type Arrowhead = "arrow" | "bar" | "dot" | "triangle" | null;

/**
 * Base properties shared across all visual elements
 */
export interface BaseElement {
  readonly id: string;
  readonly type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number; // In radians [0, 2π)
  strokeColor: string; // Hex color (#000000)
  backgroundColor: string; // Hex color (#ffffff) or transparent
  fillStyle: FillStyle;
  strokeWidth: number; // 0.5 to 16
  strokeStyle: StrokeStyle;
  roughness: number; // 0 (clean architectural) to 2.5 (hand-sketched)
  opacity: number; // 0 to 100
  groupIds: readonly string[];
  frameId: string | null;
  roundness: { type: "adaptive" | "proportional"; value?: number } | null;
  seed: number; // Deterministic pseudo-random seed for Rough.js paths
  version: number;
  versionNonce: number;
  isDeleted: boolean;
  link: string | null; // Validated external hyperlink
  locked: boolean;
  customData?: Record<string, unknown>;
  updatedAt: number;
  updatedBy: string; // User ID
}

/**
 * Freehand Drawing Element
 */
export interface FreedrawElement extends BaseElement {
  readonly type: "freedraw";
  points: ReadonlyArray<readonly [x: number, y: number, pressure?: number]>;
  simulatePressure: boolean;
}

/**
 * Linear Element (Lines & Connectors)
 */
export interface LinearElement extends BaseElement {
  readonly type: "line" | "arrow";
  points: ReadonlyArray<readonly [x: number, y: number]>;
  startBinding: PointBinding | null;
  endBinding: PointBinding | null;
  startArrowhead: Arrowhead;
  endArrowhead: Arrowhead;
  elbowed?: boolean; // Smart orthogonal routing
}

export interface PointBinding {
  elementId: string;
  focus: number; // Offset along boundary [-1, 1]
  gap: number;
}

/**
 * Text Element
 */
export interface TextElement extends BaseElement {
  readonly type: "text";
  text: string;
  fontSize: number;
  fontFamily: "hand-drawn" | "sans-serif" | "monospace" | "serif";
  textAlign: "left" | "center" | "right";
  verticalAlign: "top" | "middle" | "bottom";
  containerId: string | null; // Bound to parent shape (e.g. sticky note)
  originalText: string;
  lineHeight: number;
}

/**
 * Sticky Note Element
 */
export interface StickyElement extends BaseElement {
  readonly type: "sticky";
  text: string;
  colorPreset: "yellow" | "blue" | "green" | "pink" | "orange";
}

/**
 * Image Attachment Element
 */
export interface ImageElement extends BaseElement {
  readonly type: "image";
  fileId: string; // Foreign key to BoardAsset
  status: "pending" | "saved" | "error";
  scale: [number, number];
}

/**
 * Frame / Container Element
 */
export interface FrameElement extends BaseElement {
  readonly type: "frame";
  name: string;
}

export type BoardElement =
  | BaseElement
  | FreedrawElement
  | LinearElement
  | TextElement
  | StickyElement
  | ImageElement
  | FrameElement;
```

---

## 3. Ephemeral Presence & Awareness Model

State that lives purely in RAM and Redis Pub/Sub:

```typescript
export interface UserPresence {
  readonly clientId: number;
  readonly userId: string;
  readonly name: string;
  readonly avatarUrl?: string;
  readonly color: string;
  readonly cursor: {
    readonly x: number;
    readonly y: number;
  } | null;
  readonly selectedElementIds: readonly string[];
  readonly activeTool: ElementType | "selection" | "laser";
  readonly lastActiveAt: number;
}

export interface LaserPointerTrail {
  readonly userId: string;
  readonly color: string;
  readonly points: ReadonlyArray<{
    readonly x: number;
    readonly y: number;
    readonly timestamp: number;
  }>;
}
```
