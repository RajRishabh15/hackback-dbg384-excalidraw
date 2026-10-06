# Performance Architecture & Optimization Strategies

## 1. Core Performance Philosophy

Visual whiteboard applications live or die on input latency and frame rates. The system guarantees instantaneous feedback ($< 16$ ms per frame) regardless of total board scale or concurrent collaborator activity.

---

## 2. Rendering Pipeline Optimizations

### 2.1 Viewport Culling with 2D Spatial Quadtree
- **Problem**: In an unbounded canvas with 10,000 shapes, testing every shape on each frame wastes CPU cycles iterating over thousands of off-screen elements.
- **Solution**: Elements are indexed into a hierarchical **Quadtree**:
  - Insertion / Movement: $O(\log N)$
  - Viewport Query: Computes current visible world rectangle and returns only intersecting nodes in $< 0.5$ ms.
  - Off-screen elements are never passed to the Canvas 2D context or Rough.js generator.

### 2.2 Double Buffering & Path Memoization
- Rough.js calculates stochastic bezier curves to achieve the hand-drawn look. Calculating random jitter on every frame causes "jitter vibration" and destroys CPU cache locality.
- **Optimization**:
  1. Rough.js `Drawable` objects are generated once upon creation and stored in an LRU path cache.
  2. Canvas rendering simply calls `context.draw(cachedDrawable)`.
  3. Re-generation occurs only when geometry or style properties mutate.

### 2.3 Offscreen Canvas & Web Worker Export
- Generating 4K or 8K PNG/PDF exports is offloaded to a dedicated Web Worker using `OffscreenCanvas`.
- The main UI thread remains completely unblocked at 60 FPS while background workers compress multi-megabyte image buffers.

---

## 3. Network & Payload Optimization

### 3.1 Binary Delta Encoding with Yjs & Zstd
- Unlike JSON diffs which bloat network transfers with repeated property keys, Yjs encodes updates into packed binary varints.
- Incremental operations average **60–120 bytes** per transaction.
- Large historical snapshots are compressed server-side using **Zstandard (zstd)**, achieving an average 75% reduction in transfer size compared to uncompressed JSON.

### 3.2 Adaptive Cursor Throttling
- Local pointer movement fires at hardware polling rates (125 Hz to 1,000 Hz for gaming mice/styluses).
- The awareness emitter samples local pointer positions and broadcasts at a maximum rate of **30 Hz**.
- When the cursor remains stationary for $> 500$ ms, awareness broadcasting halts completely.
