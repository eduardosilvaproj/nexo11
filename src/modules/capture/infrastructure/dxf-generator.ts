// ============================================
// NEXO CAPTURE — DXF Generator
// ============================================

interface DXFProject {
  id: string;
  name: string;
  walls: Array<{
    start: [number, number];
    end: [number, number];
    thickness?: number;
  }>;
  doors: Array<{
    wallIndex: number;
    position: number;
    width: number;
    height?: number;
  }>;
  windows: Array<{
    wallIndex: number;
    position: number;
    width: number;
    height: number;
    sill?: number;
  }>;
}

// ============================================
// DXF Constants
// ============================================

const DXF_HEADER = `0
SECTION
2
HEADER
0
ENDSEC
`;

const DXF_TABLES = `0
SECTION
2
TABLES
0
TABLE
2
LAYER
70
4
0
LAYER
2
PAREDES
70
0
62
7
6
CONTINUOUS
0
LAYER
2
PORTAS
70
0
62
3
6
CONTINUOUS
0
LAYER
2
JANELAS
70
0
62
5
6
CONTINUOUS
0
LAYER
2
DIMENSION
70
0
62
1
6
CONTINUOUS
0
ENDTAB
0
ENDSEC
`;

// ============================================
// DXF Generator Class
// ============================================

export class DXFGenerator {
  private entities: string[] = [];
  private scale: number; // mm to DXF units (1 unit = 1mm)

  constructor(scale: number = 1) {
    this.scale = scale;
  }

  /**
   * Gera arquivo DXF completo
   */
  generate(project: DXFProject): string {
    this.entities = [];

    // Adicionar paredes
    for (const wall of project.walls) {
      this.addWall(wall);
    }

    // Adicionar portas (como círculos na parede)
    for (const door of project.doors) {
      if (door.wallIndex < project.walls.length) {
        this.addDoor(project.walls[door.wallIndex], door);
      }
    }

    // Adicionar janelas (como círculos na parede)
    for (const win of project.windows) {
      if (win.wallIndex < project.walls.length) {
        this.addWindow(project.walls[win.wallIndex], win);
      }
    }

    // Montar arquivo completo
    return this.buildDXF();
  }

  /**
   * Adiciona parede como linha
   */
  private addWall(wall: { start: [number, number]; end: [number, number]; thickness?: number }) {
    const thickness = wall.thickness || 150;
    const halfThickness = thickness / 2;

    // Calcular vetor perpendicular para criar thickness
    const dx = wall.end[0] - wall.start[0];
    const dy = wall.end[1] - wall.start[1];
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) return;

    // Normal perpendicular
    const nx = -dy / length * halfThickness;
    const ny = dx / length * halfThickness;

    // Criar polígono da parede com thickness
    const points = [
      { x: wall.start[0] + nx, y: wall.start[1] + ny },
      { x: wall.end[0] + nx, y: wall.end[1] + ny },
      { x: wall.end[0] - nx, y: wall.end[1] - ny },
      { x: wall.start[0] - nx, y: wall.start[1] - ny },
    ];

    // Adicionar como polilinha fechada
    this.addPolyline(points, 'PAREDES');
  }

  /**
   * Adiciona porta como círculo
   */
  private addDoor(
    wall: { start: [number, number]; end: [number, number] },
    door: { position: number; width: number; height?: number }
  ) {
    // Calcular posição do centro da porta
    const dx = wall.end[0] - wall.start[0];
    const dy = wall.end[1] - wall.start[1];
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) return;

    const posRatio = (door.position + door.width / 2) / length;
    const cx = wall.start[0] + dx * posRatio;
    const cy = wall.start[1] + dy * posRatio;

    // Adicionar círculo representando a porta
    this.addCircle(cx, cy, door.width / 2, 'PORTAS');

    // Adicionar arco indicando lado de abertura
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    this.addArc(cx, cy, door.width / 2, angle - 90, angle + 90, 'PORTAS');
  }

  /**
   * Adiciona janela como círculo com linha
   */
  private addWindow(
    wall: { start: [number, number]; end: [number, number] },
    win: { position: number; width: number; height: number; sill?: number }
  ) {
    const dx = wall.end[0] - wall.start[0];
    const dy = wall.end[1] - wall.start[1];
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) return;

    const posRatio = (win.position + win.width / 2) / length;
    const cx = wall.start[0] + dx * posRatio;
    const cy = wall.start[1] + dy * posRatio;

    // Círculo representando janela
    this.addCircle(cx, cy, win.width / 2, 'JANELAS');

    // Linhas indicando peitoril (sill)
    const sillLevel = win.sill || 1100;
    const angle = Math.atan2(dy, dx);
    const perpX = -Math.sin(angle);
    const perpY = Math.cos(angle);

    // Linha horizontal (peitoril)
    const halfWidth = win.width / 2;
    const startX = cx - perpX * halfWidth;
    const startY = cy - perpY * halfWidth;
    const endX = cx + perpX * halfWidth;
    const endY = cy + perpY * halfWidth;

    this.addLine(startX, startY, endX, endY, 'JANELAS');
  }

  /**
   * Adiciona linha
   */
  private addLine(x1: number, y1: number, x2: number, y2: number, layer: string) {
    const x1s = (x1 * this.scale).toFixed(4);
    const y1s = (y1 * this.scale).toFixed(4);
    const x2s = (x2 * this.scale).toFixed(4);
    const y2s = (y2 * this.scale).toFixed(4);

    this.entities.push(`0
LINE
8
${layer}
10
${x1s}
20
${y1s}
30
0.0
11
${x2s}
21
${y2s}
31
0.0`);
  }

  /**
   * Adiciona polilinha
   */
  private addPolyline(points: { x: number; y: number }[], layer: string) {
    if (points.length < 2) return;

    // Criar LWPOLYLINE
    this.entities.push(`0
LWPOLYLINE
8
${layer}
90
${points.length}
70
1`);

    // Adicionar vertices
    for (const pt of points) {
      this.entities.push(`0
VERTEX
8
${layer}
10
${(pt.x * this.scale).toFixed(4)}
20
${(pt.y * this.scale).toFixed(4)}`);
    }
  }

  /**
   * Adiciona círculo
   */
  private addCircle(cx: number, cy: number, radius: number, layer: string) {
    this.entities.push(`0
CIRCLE
8
${layer}
10
${(cx * this.scale).toFixed(4)}
20
${(cy * this.scale).toFixed(4)}
30
0.0
40
${(radius * this.scale).toFixed(4)}`);
  }

  /**
   * Adiciona arco
   */
  private addArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number, layer: string) {
    this.entities.push(`0
ARC
8
${layer}
10
${(cx * this.scale).toFixed(4)}
20
${(cy * this.scale).toFixed(4)}
30
0.0
40
${(radius * this.scale).toFixed(4)}
50
${startAngle.toFixed(4)}
51
${endAngle.toFixed(4)}`);
  }

  /**
   * Constrói arquivo DXF completo
   */
  private buildDXF(): string {
    const sections = [
      DXF_HEADER,
      DXF_TABLES,
      `0
SECTION
2
ENTITIES
`,
      ...this.entities,
      `0
ENDSEC
0
EOF
`,
    ];

    return sections.join('\n');
  }
}

// ============================================
// Export function
// ============================================

export function generateDXF(project: DXFProject): string {
  const generator = new DXFGenerator(1); // 1:1 scale (1 unit = 1mm)
  return generator.generate(project);
}

export function downloadDXF(project: DXFProject): void {
  const dxfContent = generateDXF(project);
  const blob = new Blob([dxfContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nexo-capture-${project.id.slice(0, 8)}.dxf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================
// Example DXF Content
// ============================================

export function getDXFExample(): string {
  const example: DXFProject = {
    id: 'example',
    name: 'Quarto Suite',
    walls: [
      { start: [0, 0], end: [3500, 0], thickness: 150 },
      { start: [3500, 0], end: [3500, 4000], thickness: 150 },
      { start: [3500, 4000], end: [0, 4000], thickness: 150 },
      { start: [0, 4000], end: [0, 0], thickness: 150 },
    ],
    doors: [
      { wallIndex: 0, position: 1200, width: 800, height: 2100 },
    ],
    windows: [
      { wallIndex: 1, position: 1800, width: 1200, height: 1000, sill: 1100 },
    ],
  };

  return generateDXF(example);
}