/* ─── InkBoard Toolbar ─── */
import { useCanvasStore } from '../store';
import type { ToolType } from '../types';

interface ToolDef {
  id: ToolType;
  label: string;
  icon: string;
  shortcut: string;
}

const tools: ToolDef[] = [
  { id: 'select', label: 'Select', icon: '⇲', shortcut: 'V' },
  { id: 'pan', label: 'Pan', icon: '✋', shortcut: 'H' },
  { id: 'rectangle', label: 'Rectangle', icon: '▭', shortcut: 'R' },
  { id: 'ellipse', label: 'Ellipse', icon: '⬭', shortcut: 'O' },
  { id: 'diamond', label: 'Diamond', icon: '◇', shortcut: 'D' },
  { id: 'line', label: 'Line', icon: '╱', shortcut: 'L' },
  { id: 'arrow', label: 'Arrow', icon: '→', shortcut: 'A' },
  { id: 'freedraw', label: 'Draw', icon: '✏', shortcut: 'P' },
  { id: 'text', label: 'Text', icon: 'T', shortcut: 'T' },
  { id: 'eraser', label: 'Eraser', icon: '⌫', shortcut: 'E' },
];

export default function Toolbar() {
  const activeTool = useCanvasStore((s) => s.activeTool);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);

  return (
    <div className="toolbar" role="toolbar" aria-label="Drawing tools">
      {tools.map((tool) => (
        <button
          key={tool.id}
          id={`tool-${tool.id}`}
          className={`toolbar-btn ${activeTool === tool.id ? 'active' : ''}`}
          onClick={() => setActiveTool(tool.id)}
          title={`${tool.label} (${tool.shortcut})`}
          aria-pressed={activeTool === tool.id}
        >
          <span className="toolbar-icon">{tool.icon}</span>
        </button>
      ))}

      <div className="toolbar-divider" />

      <button
        className="toolbar-btn"
        onClick={() => useCanvasStore.getState().undo()}
        title="Undo (Ctrl+Z)"
        id="btn-undo"
      >
        <span className="toolbar-icon">↶</span>
      </button>
      <button
        className="toolbar-btn"
        onClick={() => useCanvasStore.getState().redo()}
        title="Redo (Ctrl+Y)"
        id="btn-redo"
      >
        <span className="toolbar-icon">↷</span>
      </button>
    </div>
  );
}
