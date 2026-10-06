# UX Architecture & Workspace Experience

## 1. Design System & Aesthetics Philosophy

The platform embraces a **refined, minimalist workspace aesthetic**:
- **Dual Visual Modes**:
  - *Sketch Mode*: Hand-drawn Rough.js aesthetic with variable roughness (0.5 to 2.0) for brainstorming, rapid wireframing, and casual ideation.
  - *Architect Mode*: Clean, pixel-crisp geometric precision with zero roughness, sharp orthogonal connectors, and smart snapping for production system architecture diagrams.
- **Dark & Light Theming**: Fully integrated semantic color palette supporting high-contrast dark mode for low-light developer workflows.
- **Canvas Ergonomics**: Infinite, unbounded 2D canvas with smooth GPU-accelerated sub-pixel panning, inertial scrolling, and fluid zoom (10% to 1000%).

---

## 2. Information Architecture & Navigation

```
┌────────────────────────────────────────────────────────────────────────┐
│ Top App Header                                                         │
│ [Logo] [Board Title (Editable)]  [Saved Status]  [Avatars] [Share] [Export]│
├────────┬───────────────────────────────────────────────────────────────┤
│ Canvas │ Main Floating Action Toolbar                                  │
│ Side   │ ┌───────────────────────────────────────────────────────────┐ │
│ Nav    │ │ [Select] [Hand] [Rect] [Diamond] [Ellipse] [Arrow] [Pen] │ │
│ [Home] │ │ [Text] [Sticky] [Image] [Eraser] [Laser] [Library]       │ │
│ [Undo] │ └───────────────────────────────────────────────────────────┘ │
│ [Redo] │                                                               │
│ [Zoom] │ Contextual Properties Panel (Floating Left)                  │
│        │ ┌───────────────────────────────────┐                         │
│        │ │ Stroke: [ #000 ] [ #f43f5e ] ...  │                         │
│        │ │ Fill:   [ None ] [ Solid ] ...    │                         │
│        │ │ Stroke Width: [ 1px ] [ 2px ] ... │                         │
│        │ │ Roughness:    [ Clean ] [ Sketch ]│                         │
│        │ └───────────────────────────────────┘                         │
│        │                                                               │
│        │                        INFINITE CANVAS AREA                   │
│        │                                                               │
└────────┴───────────────────────────────────────────────────────────────┘
```

---

## 3. Core UI Components

1. **Floating Action Toolbar (FAT)**:
   - Centered dynamically at the top of the viewport.
   - Quick hotkeys displayed on hover: `1` Selection, `2` Rectangle, `3` Diamond, `4` Ellipse, `5` Arrow, `6` Line, `7` Pen, `8` Text, `9` Sticky Note.
2. **Contextual Property Inspector**:
   - Only appears when an element or group is selected, keeping the canvas uncluttered during exploration.
   - Dynamically adapts based on element type (e.g., Font controls for Text, Arrowhead options for Connectors).
3. **Presence Dock & Follow Mode**:
   - Collaborator avatar stack in top-right header with distinct colored rings matching their live cursor.
   - Clicking any collaborator avatar activates **"Follow Mode"**: smoothly locks the user's viewport camera to that collaborator's view.
4. **Command Palette (`Cmd/Ctrl + K`)**:
   - Universal search and action trigger: search board elements by text, jump to frames, toggle grid, export, or adjust workspace settings via keyboard.
