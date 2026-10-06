# ADR-001: Frontend Framework & Multi-Layer Canvas Engine

## Status
Accepted

## Context
The platform requires an interactive 2D canvas supporting freehand drawing, vector shapes, smooth 60–120 FPS panning and zooming, high-frequency remote cursor rendering, and accessible UI controls. We evaluated pure SVG, WebGL/WebGPU, single HTML5 Canvas, and a Multi-Layer Canvas architecture built with React 19 + TypeScript.

## Decision
We select **React 19 + TypeScript 5.9 + Vite 6** with a **Multi-Layer HTML5 Canvas 2D Engine** split into four distinct stacked layers:
1. UI DOM Overlay (React)
2. Presence / Cursor Layer (`<canvas>`)
3. Interaction / Marquee / Drag Layer (`<canvas>`)
4. Static Scene Elements Layer (`<canvas>`)

## Alternatives Considered
1. **Pure SVG Rendering**:
   - *Rejected*: In scenes with $> 2,000$ elements, the browser DOM experiences severe layout recalculation thrashing and garbage collection spikes, dropping frame rates below 30 FPS.
2. **WebGL / PixiJS / WebGPU**:
   - *Rejected*: Excessive shader complexity for 2D line/stroke styling; difficult font text rasterization; poor mobile battery efficiency; does not integrate natively with Rough.js hand-drawn styling.
3. **Single Monolithic Canvas (Excalidraw OSS baseline)**:
   - *Rejected*: Repainting every scene element on every mouse pointer move introduces unacceptable CPU waste.

## Consequences & Trade-offs
- **Pros**: Direct control over 2D pixels; isolates cursor rendering from static scene painting; sub-millisecond input response; compatible with Rough.js.
- **Cons**: Requires custom spatial indexing (Quadtree) and manual hit-testing algorithms.
