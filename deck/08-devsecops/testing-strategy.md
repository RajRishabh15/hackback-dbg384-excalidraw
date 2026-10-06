# Testing Strategy & Automated Quality Gates

## 1. Testing Pyramid Overview

The testing strategy spans unit logic, component rendering, API contracts, CRDT convergence, and end-to-end user workflows.

```
                  /\
                 /  \
                /E2E \  (10%) Playwright User Journeys & Multi-Browser
               /------\
              / Integr \  (25%) API endpoints, DB Transactions, WS Gateway
             /----------\
            / Component  \  (25%) React UI, Property Panels, Toolbar
           /--------------\
          /   Unit Tests   \ (40%) CRDT Math, Quadtree Culling, Geometries
         /------------------\
```

---

## 2. Realtime Convergence & Concurrency Tests

Collaborative whiteboards require specialized distributed testing to guarantee CRDT mathematical convergence under chaotic network conditions.

### 2.1 Deterministic Simulation Engine (`tests/crdt/convergence.test.ts`)
```typescript
import * as Y from "yjs";
import { applyUpdate, encodeStateAsUpdate } from "yjs";

describe("CRDT Convergence Engine", () => {
  it("converges three distributed peers to identical state despite out-of-order delivery", () => {
    const docA = new Y.Doc();
    const docB = new Y.Doc();
    const docC = new Y.Doc();

    const elementsA = docA.getMap<any>("elements");
    const elementsB = docB.getMap<any>("elements");
    const elementsC = docC.getMap<any>("elements");

    // Peer A creates element
    docA.transact(() => {
      elementsA.set("el-1", { type: "rectangle", x: 100, y: 100, color: "#ff0000" });
    });
    const updateA = encodeStateAsUpdate(docA);

    // Peer B concurrently edits same element
    docB.transact(() => {
      elementsB.set("el-1", { type: "rectangle", x: 250, y: 100, color: "#00ff00" });
    });
    const updateB = encodeStateAsUpdate(docB);

    // Peer C concurrently edits same element
    docC.transact(() => {
      elementsC.set("el-1", { type: "rectangle", x: 100, y: 400, color: "#0000ff" });
    });
    const updateC = encodeStateAsUpdate(docC);

    // Apply updates out-of-order across all peers
    applyUpdate(docA, updateB);
    applyUpdate(docA, updateC);

    applyUpdate(docB, updateC);
    applyUpdate(docB, updateA);

    applyUpdate(docC, updateA);
    applyUpdate(docC, updateB);

    // Assert exact state convergence
    const stateA = elementsA.get("el-1");
    const stateB = elementsB.get("el-1");
    const stateC = elementsC.get("el-1");

    expect(stateA).toEqual(stateB);
    expect(stateB).toEqual(stateC);
  });
});
```

---

## 3. End-to-End Canvas Interaction Testing (Playwright)

```typescript
import { test, expect } from "@playwright/test";

test.describe("Canvas Interaction & Drawing", () => {
  test("creates a rectangle and verifies rendering on canvas", async ({ page }) => {
    await page.goto("/boards/test-board-id");
    await page.waitForSelector("#static-canvas");

    // Press shortcut '2' for Rectangle tool
    await page.keyboard.press("2");

    // Click and drag to create rectangle
    const canvas = page.locator("#interaction-canvas");
    await canvas.hover({ position: { x: 200, y: 200 } });
    await page.mouse.down();
    await page.mouse.move(400, 350, { steps: 5 });
    await page.mouse.up();

    // Verify element count updated in UI status
    const statusText = page.locator("[data-testid='element-count']");
    await expect(statusText).toHaveText("1 object");
  });
});
```
