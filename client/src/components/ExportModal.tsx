/* ─── InkBoard Export Modal ─── */
import { useState } from 'react';
import { useCanvasStore } from '../store';

interface ExportModalProps {
  onClose: () => void;
}

export default function ExportModal({ onClose }: ExportModalProps) {
  const [exporting, setExporting] = useState(false);

  const exportPNG = async () => {
    setExporting(true);
    try {
      const canvas = document.querySelector('.main-canvas') as HTMLCanvasElement;
      if (!canvas) return;

      // Create a temporary canvas with white background
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#0d1117';
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      ctx.drawImage(canvas, 0, 0);

      const blob = await new Promise<Blob | null>((resolve) =>
        tempCanvas.toBlob(resolve, 'image/png')
      );
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${useCanvasStore.getState().boardName}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setExporting(false);
    }
  };

  const exportSVG = () => {
    const state = useCanvasStore.getState();
    const elements = state.elements.filter((el) => !el.isDeleted);
    if (elements.length === 0) return;

    // Calculate bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of elements) {
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + el.width);
      maxY = Math.max(maxY, el.y + el.height);
    }
    const padding = 20;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX - padding} ${minY - padding} ${width} ${height}">`;
    svgContent += `<rect x="${minX - padding}" y="${minY - padding}" width="${width}" height="${height}" fill="#0d1117"/>`;

    for (const el of elements) {
      const style = `stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}" fill="${el.backgroundColor === 'transparent' ? 'none' : el.backgroundColor}" opacity="${el.opacity / 100}"`;
      switch (el.type) {
        case 'rectangle':
          svgContent += `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" ${style}/>`;
          break;
        case 'ellipse':
          svgContent += `<ellipse cx="${el.x + el.width / 2}" cy="${el.y + el.height / 2}" rx="${el.width / 2}" ry="${el.height / 2}" ${style}/>`;
          break;
        case 'text':
          svgContent += `<text x="${el.x}" y="${el.y + (el.fontSize || 20)}" fill="${el.strokeColor}" font-size="${el.fontSize || 20}" font-family="${el.fontFamily || 'sans-serif'}">${escapeXml(el.text || '')}</text>`;
          break;
        case 'line':
        case 'arrow':
          if (el.points && el.points.length >= 2) {
            const start = el.points[0];
            const end = el.points[el.points.length - 1];
            svgContent += `<line x1="${el.x + start.x}" y1="${el.y + start.y}" x2="${el.x + end.x}" y2="${el.y + end.y}" ${style}/>`;
          }
          break;
        case 'freedraw':
          if (el.points && el.points.length > 1) {
            const d = el.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${el.x + p.x},${el.y + p.y}`).join(' ');
            svgContent += `<path d="${d}" ${style} fill="none"/>`;
          }
          break;
        case 'diamond': {
          const cx = el.x + el.width / 2;
          const cy = el.y + el.height / 2;
          const points = `${cx},${el.y} ${el.x + el.width},${cy} ${cx},${el.y + el.height} ${el.x},${cy}`;
          svgContent += `<polygon points="${points}" ${style}/>`;
          break;
        }
      }
    }
    svgContent += '</svg>';

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${useCanvasStore.getState().boardName}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const state = useCanvasStore.getState();
    const data = {
      type: 'inkboard',
      version: 1,
      boardName: state.boardName,
      elements: state.elements.filter((el) => !el.isDeleted),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.boardName}.inkboard.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.inkboard.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.elements && Array.isArray(data.elements)) {
          useCanvasStore.getState().pushHistory();
          useCanvasStore.getState().setElements([
            ...useCanvasStore.getState().elements,
            ...data.elements,
          ]);
        }
      } catch {
        alert('Invalid file format');
      }
    };
    input.click();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="modal-header">
          <h2>Export / Import</h2>
        </div>
        <div className="export-options">
          <button className="export-btn" onClick={exportPNG} disabled={exporting} id="btn-export-png">
            <span className="export-icon">🖼️</span>
            <span>Export PNG</span>
          </button>
          <button className="export-btn" onClick={exportSVG} id="btn-export-svg">
            <span className="export-icon">📐</span>
            <span>Export SVG</span>
          </button>
          <button className="export-btn" onClick={exportJSON} id="btn-export-json">
            <span className="export-icon">📄</span>
            <span>Export JSON</span>
          </button>
          <div className="export-divider" />
          <button className="export-btn" onClick={importJSON} id="btn-import-json">
            <span className="export-icon">📥</span>
            <span>Import JSON</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
