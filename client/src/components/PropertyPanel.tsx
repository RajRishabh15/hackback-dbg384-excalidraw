/* ─── InkBoard Style / Property Panel ─── */
import { useCanvasStore } from '../store';

const COLORS = [
  '#e6edf3', '#f85149', '#ff922b', '#fcc419',
  '#3fb950', '#58a6ff', '#bc8cff', '#f778ba',
  '#8b949e', '#0d1117',
];

const STROKE_WIDTHS = [1, 2, 3, 5, 8];

export default function PropertyPanel() {
  const selectedIds = useCanvasStore((s) => s.selectedElementIds);
  const currentStyle = useCanvasStore((s) => s.currentStyle);
  const setCurrentStyle = useCanvasStore((s) => s.setCurrentStyle);
  const elements = useCanvasStore((s) => s.elements);
  const updateElement = useCanvasStore((s) => s.updateElement);
  const viewport = useCanvasStore((s) => s.viewport);
  const setViewport = useCanvasStore((s) => s.setViewport);

  const selectedElement = selectedIds.length === 1
    ? elements.find((el) => el.id === selectedIds[0])
    : null;

  const applyStyle = (key: string, value: string | number) => {
    setCurrentStyle({ [key]: value });
    // Apply to selected elements
    for (const id of selectedIds) {
      updateElement(id, { [key]: value });
    }
  };

  return (
    <div className="property-panel">
      {/* Stroke Color */}
      <div className="prop-section">
        <label className="prop-label">Stroke</label>
        <div className="color-grid">
          {COLORS.map((c) => (
            <button
              key={`stroke-${c}`}
              className={`color-swatch ${currentStyle.strokeColor === c ? 'active' : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => applyStyle('strokeColor', c)}
              title={c}
            />
          ))}
        </div>
      </div>

      {/* Background Color */}
      <div className="prop-section">
        <label className="prop-label">Fill</label>
        <div className="color-grid">
          <button
            className={`color-swatch ${currentStyle.backgroundColor === 'transparent' ? 'active' : ''}`}
            style={{ backgroundColor: 'transparent', border: '2px dashed #30363d' }}
            onClick={() => applyStyle('backgroundColor', 'transparent')}
            title="None"
          />
          {COLORS.map((c) => (
            <button
              key={`fill-${c}`}
              className={`color-swatch ${currentStyle.backgroundColor === c ? 'active' : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => applyStyle('backgroundColor', c)}
              title={c}
            />
          ))}
        </div>
      </div>

      {/* Stroke Width */}
      <div className="prop-section">
        <label className="prop-label">Stroke Width</label>
        <div className="stroke-widths">
          {STROKE_WIDTHS.map((w) => (
            <button
              key={w}
              className={`stroke-btn ${currentStyle.strokeWidth === w ? 'active' : ''}`}
              onClick={() => applyStyle('strokeWidth', w)}
              title={`${w}px`}
            >
              <div className="stroke-preview" style={{ height: w, backgroundColor: currentStyle.strokeColor }} />
            </button>
          ))}
        </div>
      </div>

      {/* Fill Style */}
      <div className="prop-section">
        <label className="prop-label">Fill Style</label>
        <select
          className="prop-select"
          value={currentStyle.fillStyle}
          onChange={(e) => applyStyle('fillStyle', e.target.value)}
        >
          <option value="hachure">Hachure</option>
          <option value="solid">Solid</option>
          <option value="cross-hatch">Cross Hatch</option>
          <option value="zigzag">Zigzag</option>
        </select>
      </div>

      {/* Roughness */}
      <div className="prop-section">
        <label className="prop-label">Roughness</label>
        <input
          type="range"
          className="prop-range"
          min="0"
          max="3"
          step="0.5"
          value={currentStyle.roughness}
          onChange={(e) => applyStyle('roughness', parseFloat(e.target.value))}
        />
      </div>

      {/* Opacity */}
      <div className="prop-section">
        <label className="prop-label">Opacity</label>
        <input
          type="range"
          className="prop-range"
          min="10"
          max="100"
          step="5"
          value={currentStyle.opacity}
          onChange={(e) => applyStyle('opacity', parseInt(e.target.value))}
        />
      </div>

      {/* Selected element info */}
      {selectedElement && (
        <div className="prop-section">
          <label className="prop-label">Position</label>
          <div className="prop-row">
            <span className="prop-dim">X: {Math.round(selectedElement.x)}</span>
            <span className="prop-dim">Y: {Math.round(selectedElement.y)}</span>
          </div>
          <div className="prop-row">
            <span className="prop-dim">W: {Math.round(selectedElement.width)}</span>
            <span className="prop-dim">H: {Math.round(selectedElement.height)}</span>
          </div>
        </div>
      )}

      {/* Zoom */}
      <div className="prop-section">
        <label className="prop-label">Zoom</label>
        <div className="zoom-controls">
          <button className="zoom-btn" onClick={() => setViewport({ zoom: Math.max(0.1, viewport.zoom - 0.1) })}>−</button>
          <span className="zoom-label">{Math.round(viewport.zoom * 100)}%</span>
          <button className="zoom-btn" onClick={() => setViewport({ zoom: Math.min(5, viewport.zoom + 0.1) })}>+</button>
          <button className="zoom-btn" onClick={() => setViewport({ zoom: 1, scrollX: 0, scrollY: 0 })}>⟲</button>
        </div>
      </div>
    </div>
  );
}
