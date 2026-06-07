// ============================================
// NEXO CAPTURE — Three.js 3D Viewer
// Visualizador 3D em tempo real das paredes
// ============================================

import { useRef, useEffect, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Eye, Move3D, Maximize2 } from 'lucide-react';

interface Wall {
  start: [number, number];
  end: [number, number];
  thickness?: number;
}

interface Door {
  wallIndex: number;
  position: number;
  width: number;
  height?: number;
}

interface Window {
  wallIndex: number;
  position: number;
  width: number;
  height: number;
  sill?: number;
}

interface Viewer3DProps {
  walls: Wall[];
  doors: Door[];
  windows: Window[];
}

export function Viewer3D({ walls, doors, windows }: Viewer3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'3d' | 'top' | 'front'>('3d');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear existing
    container.innerHTML = '';

    // Calculate bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const w of walls) {
      minX = Math.min(minX, w.start[0], w.end[0]);
      minY = Math.min(minY, w.start[1], w.end[1]);
      maxX = Math.max(maxX, w.start[0], w.end[0]);
      maxY = Math.max(maxY, w.start[1], w.end[1]);
    }

    if (!isFinite(minX) || !isFinite(maxX)) {
      container.innerHTML = '<div class="flex items-center justify-center h-full text-slate-400">Sem dados para visualizar</div>';
      return;
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const width = (maxX - minX) / 1000; // meters
    const height = (maxY - minY) / 1000;
    const scale = Math.max(width, height, 4);

    // Create SVG for visualization (lightweight, no external deps)
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', `${-scale} ${-scale} ${scale * 2} ${scale * 2}`);
    svg.style.background = 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)';
    svg.style.borderRadius = '12px';

    // Render based on view mode
    if (viewMode === 'top') {
      renderTopView(svg, walls, doors, windows, centerX, centerY, scale);
    } else if (viewMode === 'front') {
      renderFrontView(svg, walls, doors, windows, centerX, centerY, scale);
    } else {
      renderIsometricView(svg, walls, doors, windows, centerX, centerY, scale);
    }

    container.appendChild(svg);

    return () => {
      if (container) container.innerHTML = '';
    };
  }, [walls, doors, windows, viewMode]);

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="flex items-center gap-1">
          {(['3d', 'top', 'front'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === mode
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {mode.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 bg-slate-100 rounded-md hover:bg-slate-200"
            title="Tela cheia"
          >
            <Maximize2 className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Viewer */}
      <div
        ref={containerRef}
        className={`bg-slate-900 rounded-xl overflow-hidden ${
          isFullscreen ? 'h-[600px]' : 'h-[400px]'
        }`}
        style={{ minHeight: '300px' }}
      />

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-slate-300 rounded-sm" />
          <span>Paredes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-green-500 rounded-sm" />
          <span>Portas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-blue-500 rounded-sm" />
          <span>Janelas</span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Top View (planta)
// ============================================

function renderTopView(
  svg: SVGSVGElement,
  walls: Wall[],
  doors: Door[],
  windows: Window[],
  centerX: number,
  centerY: number,
  scale: number
) {
  // Grid
  for (let i = -10; i <= 10; i++) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(i));
    line.setAttribute('y1', String(-10));
    line.setAttribute('x2', String(i));
    line.setAttribute('y2', String(10));
    line.setAttribute('stroke', '#334155');
    line.setAttribute('stroke-width', '0.02');
    svg.appendChild(line);
  }
  for (let i = -10; i <= 10; i++) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(-10));
    line.setAttribute('y1', String(i));
    line.setAttribute('x2', String(10));
    line.setAttribute('y2', String(i));
    line.setAttribute('stroke', '#334155');
    line.setAttribute('stroke-width', '0.02');
    svg.appendChild(line);
  }

  // Convert to meters for display
  const toM = (mm: number) => (mm - centerX) / 1000;

  // Walls
  for (const wall of walls) {
    const x1 = toM(wall.start[0]);
    const y1 = toM(wall.start[1]);
    const x2 = toM(wall.end[0]);
    const y2 = toM(wall.end[1]);

    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const thickness = (wall.thickness || 150) / 1000;
    const nx = -dy / length * thickness;
    const ny = dx / length * thickness;

    // Wall as polygon
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', `
      ${x1 + nx},${y1 + ny}
      ${x2 + nx},${y2 + ny}
      ${x2 - nx},${y2 - ny}
      ${x1 - nx},${y1 - ny}
    `);
    polygon.setAttribute('fill', '#cbd5e1');
    polygon.setAttribute('stroke', '#94a3b8');
    polygon.setAttribute('stroke-width', '0.02');
    svg.appendChild(polygon);
  }

  // Doors
  for (const door of doors) {
    if (door.wallIndex >= walls.length) continue;
    const wall = walls[door.wallIndex];
    const dx = toM(wall.end[0]) - toM(wall.start[0]);
    const dy = toM(wall.end[1]) - toM(wall.start[1]);
    const length = Math.sqrt(dx * dx + dy * dy);
    const posRatio = (door.position + door.width / 2) / 1000 / length;
    const cx = toM(wall.start[0]) + dx * posRatio;
    const cy = toM(wall.start[1]) + dy * posRatio;
    const r = door.width / 2000;

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', String(cx));
    circle.setAttribute('cy', String(cy));
    circle.setAttribute('r', String(r));
    circle.setAttribute('fill', '#22c97a');
    circle.setAttribute('opacity', '0.7');
    svg.appendChild(circle);

    // Arc
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const x1 = cx + r * Math.cos((angle - 90) * Math.PI / 180);
    const y1 = cy + r * Math.sin((angle - 90) * Math.PI / 180);
    const x2 = cx + r * Math.cos((angle + 90) * Math.PI / 180);
    const y2 = cy + r * Math.sin((angle + 90) * Math.PI / 180);
    path.setAttribute('d', `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#22c97a');
    path.setAttribute('stroke-width', '0.03');
    svg.appendChild(path);
  }

  // Windows
  for (const win of windows) {
    if (win.wallIndex >= walls.length) continue;
    const wall = walls[win.wallIndex];
    const dx = toM(wall.end[0]) - toM(wall.start[0]);
    const dy = toM(wall.end[1]) - toM(wall.start[1]);
    const length = Math.sqrt(dx * dx + dy * dy);
    const posRatio = (win.position + win.width / 2) / 1000 / length;
    const cx = toM(wall.start[0]) + dx * posRatio;
    const cy = toM(wall.start[1]) + dy * posRatio;
    const r = win.width / 2000;

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', String(cx));
    circle.setAttribute('cy', String(cy));
    circle.setAttribute('r', String(r));
    circle.setAttribute('fill', '#1a9be8');
    circle.setAttribute('opacity', '0.7');
    svg.appendChild(circle);
  }
}

// ============================================
// Front View (corte)
// ============================================

function renderFrontView(
  svg: SVGSVGElement,
  walls: Wall[],
  _doors: Door[],
  _windows: Window[],
  centerX: number,
  centerY: number,
  scale: number
) {
  // Ground
  const ground = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  ground.setAttribute('x', String(-scale));
  ground.setAttribute('y', '2.5');
  ground.setAttribute('width', String(scale * 2));
  ground.setAttribute('height', '0.3');
  ground.setAttribute('fill', '#475569');
  svg.appendChild(ground);

  // Wall section
  if (walls.length > 0) {
    const wall = walls[0];
    const length = Math.sqrt(
      Math.pow(wall.end[0] - wall.start[0], 2) +
      Math.pow(wall.end[1] - wall.start[1], 2)
    );
    const lengthM = length / 1000;

    // Main wall rectangle
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', String(-lengthM / 2));
    rect.setAttribute('y', String(-2.7));
    rect.setAttribute('width', String(lengthM));
    rect.setAttribute('height', '2.7');
    rect.setAttribute('fill', '#cbd5e1');
    rect.setAttribute('stroke', '#94a3b8');
    rect.setAttribute('stroke-width', '0.02');
    svg.appendChild(rect);

    // Door
    const doorWidth = 0.8;
    const doorHeight = 2.1;
    const doorX = -doorWidth / 2;

    const doorRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    doorRect.setAttribute('x', String(doorX));
    doorRect.setAttribute('y', '0');
    doorRect.setAttribute('width', String(doorWidth));
    doorRect.setAttribute('height', String(doorHeight));
    doorRect.setAttribute('fill', '#22c97a');
    doorRect.setAttribute('opacity', '0.6');
    svg.appendChild(doorRect);

    // Window
    const windowWidth = 1.2;
    const windowHeight = 1.0;
    const windowSill = 1.1;
    const windowX = 1.5;

    const windowRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    windowRect.setAttribute('x', String(windowX));
    windowRect.setAttribute('y', String(-windowSill));
    windowRect.setAttribute('width', String(windowWidth));
    windowRect.setAttribute('height', String(windowHeight));
    windowRect.setAttribute('fill', '#1a9be8');
    windowRect.setAttribute('opacity', '0.5');
    svg.appendChild(windowRect);
  }
}

// ============================================
// Isometric View (3D fake)
// ============================================

function renderIsometricView(
  svg: SVGSVGElement,
  walls: Wall[],
  doors: Door[],
  windows: Window[],
  centerX: number,
  centerY: number,
  scale: number
) {
  // First, render the floor plan (base)
  // Then add "height" offset for top edges
  const wallHeight = 2.7; // meters

  // Convert to meters
  const toM = (mm: number) => (mm - centerX) / 1000;

  // Background grid
  for (let i = -10; i <= 10; i++) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(i * 0.5));
    line.setAttribute('y1', String(-scale));
    line.setAttribute('x2', String(i * 0.5));
    line.setAttribute('y2', String(scale));
    line.setAttribute('stroke', '#1e293b');
    line.setAttribute('stroke-width', '0.01');
    svg.appendChild(line);
  }

  // Draw walls as 3D blocks
  for (const wall of walls) {
    const x1 = toM(wall.start[0]);
    const y1 = toM(wall.start[1]);
    const x2 = toM(wall.end[0]);
    const y2 = toM(wall.end[1]);

    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const thickness = (wall.thickness || 150) / 1000;
    const nx = -dy / length * thickness;
    const ny = dx / length * thickness;

    // Bottom face
    const bottom = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    bottom.setAttribute('points', `
      ${x1 + nx},${y1 + ny}
      ${x2 + nx},${y2 + ny}
      ${x2 - nx},${y2 - ny}
      ${x1 - nx},${y1 - ny}
    `);
    bottom.setAttribute('fill', '#94a3b8');
    bottom.setAttribute('stroke', '#64748b');
    bottom.setAttribute('stroke-width', '0.02');
    svg.appendChild(bottom);

    // Top face (offset upward)
    const topOffset = 0.5; // visual offset for 3D effect
    const top = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    top.setAttribute('points', `
      ${x1 + nx},${y1 + ny - topOffset}
      ${x2 + nx},${y2 + ny - topOffset}
      ${x2 - nx},${y2 - ny - topOffset}
      ${x1 - nx},${y1 - ny - topOffset}
    `);
    top.setAttribute('fill', '#cbd5e1');
    top.setAttribute('stroke', '#64748b');
    top.setAttribute('stroke-width', '0.02');
    svg.appendChild(top);

    // Connect bottom and top (sides)
    const side1 = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    side1.setAttribute('points', `
      ${x1 + nx},${y1 + ny}
      ${x2 + nx},${y2 + ny}
      ${x2 + nx},${y2 + ny - topOffset}
      ${x1 + nx},${y1 + ny - topOffset}
    `);
    side1.setAttribute('fill', '#cbd5e1');
    side1.setAttribute('stroke', '#64748b');
    side1.setAttribute('stroke-width', '0.01');
    svg.appendChild(side1);

    const side2 = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    side2.setAttribute('points', `
      ${x2 - nx},${y2 - ny}
      ${x1 - nx},${y1 - ny}
      ${x1 - nx},${y1 - ny - topOffset}
      ${x2 - nx},${y2 - ny - topOffset}
    `);
    side2.setAttribute('fill', '#94a3b8');
    side2.setAttribute('stroke', '#64748b');
    side2.setAttribute('stroke-width', '0.01');
    svg.appendChild(side2);
  }

  // Doors (on top of walls)
  for (const door of doors) {
    if (door.wallIndex >= walls.length) continue;
    const wall = walls[door.wallIndex];
    const dx = toM(wall.end[0]) - toM(wall.start[0]);
    const dy = toM(wall.end[1]) - toM(wall.start[1]);
    const length = Math.sqrt(dx * dx + dy * dy);
    const posRatio = (door.position + door.width / 2) / 1000 / length;
    const cx = toM(wall.start[0]) + dx * posRatio;
    const cy = toM(wall.start[1]) + dy * posRatio;
    const r = door.width / 2000;

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', String(cx));
    circle.setAttribute('cy', String(cy));
    circle.setAttribute('r', String(r));
    circle.setAttribute('fill', '#22c97a');
    circle.setAttribute('opacity', '0.7');
    svg.appendChild(circle);
  }

  // Windows
  for (const win of windows) {
    if (win.wallIndex >= walls.length) continue;
    const wall = walls[win.wallIndex];
    const dx = toM(wall.end[0]) - toM(wall.start[0]);
    const dy = toM(wall.end[1]) - toM(wall.start[1]);
    const length = Math.sqrt(dx * dx + dy * dy);
    const posRatio = (win.position + win.width / 2) / 1000 / length;
    const cx = toM(wall.start[0]) + dx * posRatio;
    const cy = toM(wall.start[1]) + dy * posRatio;
    const r = win.width / 2000;

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', String(cx));
    circle.setAttribute('cy', String(cy));
    circle.setAttribute('r', String(r));
    circle.setAttribute('fill', '#1a9be8');
    circle.setAttribute('opacity', '0.7');
    svg.appendChild(circle);
  }

  // Height indicator
  const heightLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  heightLabel.setAttribute('x', '0');
  heightLabel.setAttribute('y', String(-scale + 0.5));
  heightLabel.setAttribute('text-anchor', 'middle');
  heightLabel.setAttribute('fill', '#64748b');
  heightLabel.setAttribute('font-size', '0.3');
  heightLabel.textContent = `H = ${wallHeight}m`;
  svg.appendChild(heightLabel);
}