# Accessibility & Inclusive Canvas Design (WCAG 2.2 AA)

## 1. Accessibility Challenges in 2D Canvas Applications

Traditional HTML5 `<canvas>` elements present significant accessibility barriers because canvas drawing pixels are completely opaque to screen readers, assistive technology, and keyboard navigation trees.

---

## 2. Accessible DOM Subtree & Screen Reader Bridge

To achieve full WCAG 2.2 AA compliance, the application maintains a dynamic, hidden **Accessible Virtual DOM Tree** positioned directly behind the visual canvas:

```html
<div class="canvas-viewport" role="region" aria-label="Collaborative Whiteboard Canvas">
  <!-- Interactive Visual Canvases -->
  <canvas id="static-canvas" aria-hidden="true"></canvas>
  <canvas id="interaction-canvas" aria-hidden="true"></canvas>

  <!-- Screen Reader Accessible Virtual Subtree -->
  <div class="sr-virtual-dom" aria-live="polite">
    <div 
      tabindex="0" 
      role="graphics-symbol" 
      aria-label="Rectangle: System Authentication Gateway, dimensions 200 by 100 pixels, blue background"
      aria-roledescription="canvas shape"
      id="sr-el-018f4a12"
      style="left: 100px; top: 150px; width: 200px; height: 100px;">
      <span class="sr-text">System Authentication Gateway</span>
    </div>
    
    <div 
      tabindex="0" 
      role="graphics-symbol" 
      aria-label="Connector Arrow from Authentication Gateway to PostgreSQL Database"
      id="sr-el-018f4a13">
    </div>
  </div>
</div>
```

When a user navigates using `Tab` or `Shift+Tab`:
1. Focus jumps between elements in logical spatial or creation order.
2. The canvas highlights the focused element with a high-contrast focus ring.
3. Screen readers announce the element type, custom label/text, dimensions, and connected relationships.

---

## 3. Keyboard-Only Navigation & Control Scheme

Every single tool and canvas action is fully controllable via keyboard:

| Action | Shortcut | Accessible Behavior |
|---|---|---|
| **Select Next/Prev Element** | `Tab` / `Shift + Tab` | Cycles focus ring through scene objects |
| **Move Focused Element** | `Arrow Keys` (1px) / `Shift + Arrow` (10px) | Repositions shape in world coordinates |
| **Resize Focused Element** | `Alt + Arrow Keys` | Expands or contracts shape bounds |
| **Rotate Focused Element** | `Alt + Shift + Arrow Keys` | Rotates element by 15-degree increments |
| **Pan Canvas Camera** | `Space + Drag` or `Ctrl + Arrow Keys` | Moves viewport camera |
| **Zoom In / Out** | `Cmd/Ctrl + +` / `Cmd/Ctrl + -` | Adjusts zoom level with screen reader status announcement |
| **Open Context Menu** | `Shift + F10` or Menu Key | Displays accessible dropdown menu at element location |
| **Command Palette** | `Cmd/Ctrl + K` | Search and execute any menu action via search input |

---

## 4. Visual Accessibility & Motion Preferences

1. **Color Contrast**: All UI buttons, toolbars, and default element text exceed the minimum 4.5:1 contrast ratio against canvas backgrounds.
2. **Color Blindness Simulation & Modes**: Built-in viewport filters for Protanopia, Deuteranopia, and Tritanopia accessible via board settings.
3. **`prefers-reduced-motion` Support**:
   - Disables smooth camera panning animations during "Follow Mode" (instant cut instead).
   - Eliminates laser pointer fade trails.
   - Disables pulsing cursor indicators.
