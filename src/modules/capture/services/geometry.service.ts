// ============================================
// NEXO CAPTURE — Core Service
// ============================================

import {
  CaptureProject,
  Wall,
  Door,
  Window,
  Room,
  ProjectConfig,
  ProjectStatus,
  SourceType,
  CAPTURE_DEFAULTS,
  ValidationResult,
  BoundingBox,
} from '../types/capture.types';
import { v4 as uuidv4 } from 'uuid';
const uuid = uuidv4;

// ============================================
// Geometry Utils
// ============================================

export function calculateLength(
  start: { x: number; y: number },
  end: { x: number; y: number }
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function calculateAngle(
  start: { x: number; y: number },
  end: { x: number; y: number }
): number {
  return Math.atan2(end.y - start.y, end.x - start.x);
}

export function getWallMidpoint(
  start: { x: number; y: number },
  end: { x: number; y: number }
): { x: number; y: number } {
  return {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };
}

export function getBoundingBox(walls: Wall[]): BoundingBox {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const wall of walls) {
    minX = Math.min(minX, wall.startPoint.x, wall.endPoint.x);
    minY = Math.min(minY, wall.startPoint.y, wall.endPoint.y);
    maxX = Math.max(maxX, wall.startPoint.x, wall.endPoint.x);
    maxY = Math.max(maxY, wall.startPoint.y, wall.endPoint.y);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function calculatePolygonArea(
  points: { x: number; y: number }[]
): number {
  let area = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  return Math.abs(area) / 2;
}

export function calculatePolygonPerimeter(
  points: { x: number; y: number }[]
): number {
  let perimeter = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    perimeter += calculateLength(points[i], points[j]);
  }

  return perimeter;
}

// ============================================
// Wall Service
// ============================================

export function createWall(
  projectId: string,
  start: { x: number; y: number },
  end: { x: number; y: number },
  config: ProjectConfig,
  layer = 'PAREDES'
): Wall {
  return {
    id: uuid(),
    startPoint: { x: start.x, y: start.y, z: config.floorLevel },
    endPoint: { x: end.x, y: end.y, z: config.floorLevel },
    thickness: config.wallThickness,
    height: config.wallHeight,
    layer,
    isExterior: false,
    openings: [],
  };
}

export function addDoorToWall(
  wall: Wall,
  position: number,
  width: number,
  height = CAPTURE_DEFAULTS.DOOR_HEIGHT
): Wall {
  const opening = {
    id: uuid(),
    type: 'door' as const,
    position,
    width,
    height,
  };

  return {
    ...wall,
    openings: [...wall.openings, opening],
    hasDoor: true,
  };
}

export function addWindowToWall(
  wall: Wall,
  position: number,
  width: number,
  height: number,
  sillLevel = CAPTURE_DEFAULTS.WINDOW_SILL
): Wall {
  const opening = {
    id: uuid(),
    type: 'window' as const,
    position,
    width,
    height,
    sillLevel,
  };

  return {
    ...wall,
    openings: [...wall.openings, opening],
    hasWindow: true,
  };
}

// ============================================
// Validation Service
// ============================================

export function validateProject(
  walls: Wall[],
  config: ProjectConfig
): ValidationResult {
  const errors: ValidationResult['errors'] = [];
  const warnings: ValidationResult['warnings'] = [];

  // Check wall lengths
  for (const wall of walls) {
    const length = calculateLength(wall.startPoint, wall.endPoint);

    if (length < CAPTURE_DEFAULTS.MIN_WALL_LENGTH) {
      errors.push(`Parede muito curta: ${length.toFixed(0)}mm (mínimo: ${CAPTURE_DEFAULTS.MIN_WALL_LENGTH}mm)`);
    }

    if (length > CAPTURE_DEFAULTS.MAX_WALL_LENGTH) {
      errors.push(`Parede muito longa: ${length.toFixed(0)}mm (máximo: ${CAPTURE_DEFAULTS.MAX_WALL_LENGTH}mm)`);
    }
  }

  // Check doors fit in walls
  for (const wall of walls) {
    const wallLength = calculateLength(wall.startPoint, wall.endPoint);

    for (const opening of wall.openings) {
      if (opening.type === 'door') {
        if (opening.position + opening.width > wallLength) {
          errors.push(`Porta excede o comprimento da parede`);
        }
      }
    }
  }

  // Check windows fit in walls
  for (const wall of walls) {
    const wallLength = calculateLength(wall.startPoint, wall.endPoint);

    for (const opening of wall.openings) {
      if (opening.type === 'window') {
        if (opening.position + opening.width > wallLength) {
          errors.push(`Janela excede o comprimento da parede`);
        }
      }
    }
  }

  // Check for overlapping doors/windows
  for (const wall of walls) {
    const sortedOpenings = [...wall.openings].sort((a, b) => a.position - b.position);

    for (let i = 0; i < sortedOpenings.length - 1; i++) {
      const current = sortedOpenings[i];
      const next = sortedOpenings[i + 1];

      if (current.position + current.width > next.position) {
        warnings.push(`Aberturas sobrepostas na mesma parede`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================
// Room Detection Service
// ============================================

export function detectRooms(walls: Wall[]): Room[] {
  // Algoritmo simplificado para detectar ambientes fechados
  // Em produção, usar biblioteca de poligonização

  const rooms: Room[] = [];
  const processedWalls = new Set<string>();

  // Encontrar paredes que formam ciclos fechados
  for (const wall of walls) {
    if (processedWalls.has(wall.id)) continue;

    // Heurística: parede externa tem pelo menos 3m de comprimento
    const length = calculateLength(wall.startPoint, wall.endPoint);
    if (length < 3000) continue;

    // Detectar paredes conectadas
    const connectedWalls = findConnectedWalls(wall, walls);
    if (connectedWalls.length < 2) continue;

    // Criar ambiente
    const roomWalls = [wall, ...connectedWalls];
    const roomPoints = extractRoomPoints(roomWalls);

    if (roomPoints.length >= 3) {
      const area = calculatePolygonArea(roomPoints) / 1000000; // mm² → m²
      const perimeter = calculatePolygonPerimeter(roomPoints) / 1000; // mm → m

      rooms.push({
        id: uuid(),
        name: `Ambiente ${rooms.length + 1}`,
        wallIds: roomWalls.map((w) => w.id),
        area: Math.round(area * 100) / 100,
        perimeter: Math.round(perimeter * 100) / 100,
        ceilingHeight: CAPTURE_DEFAULTS.WALL_HEIGHT,
      });

      roomWalls.forEach((w) => processedWalls.add(w.id));
    }
  }

  return rooms;
}

function findConnectedWalls(wall: Wall, allWalls: Wall[]): Wall[] {
  const tolerance = 50; // mm
  const connected: Wall[] = [];

  for (const other of allWalls) {
    if (other.id === wall.id) continue;

    // Verificar se compartilham ponto
    if (
      isPointEqual(wall.startPoint, other.startPoint, tolerance) ||
      isPointEqual(wall.startPoint, other.endPoint, tolerance) ||
      isPointEqual(wall.endPoint, other.startPoint, tolerance) ||
      isPointEqual(wall.endPoint, other.endPoint, tolerance)
    ) {
      connected.push(other);
    }
  }

  return connected;
}

function isPointEqual(
  a: { x: number; y: number },
  b: { x: number; y: number },
  tolerance: number
): boolean {
  return Math.abs(a.x - b.x) < tolerance && Math.abs(a.y - b.y) < tolerance;
}

function extractRoomPoints(walls: Wall[]): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const processed = new Set<string>();

  // Ordenar paredes para formar polígono
  for (const wall of walls) {
    if (!processed.has(wall.id)) {
      points.push({ x: wall.startPoint.x, y: wall.startPoint.y });
      points.push({ x: wall.endPoint.x, y: wall.endPoint.y });
      processed.add(wall.id);
    }
  }

  return points;
}

// ============================================
// Project Factory
// ============================================

export function createCaptureProject(
  tenantId: string,
  name: string,
  sourceType: SourceType,
  config?: Partial<ProjectConfig>
): CaptureProject {
  const defaultConfig: ProjectConfig = {
    wallHeight: CAPTURE_DEFAULTS.WALL_HEIGHT,
    wallThickness: CAPTURE_DEFAULTS.WALL_THICKNESS,
    floorLevel: CAPTURE_DEFAULTS.FLOOR_LEVEL,
    units: CAPTURE_DEFAULTS.UNITS,
    originX: 0,
    originY: 0,
    scale: 1,
    ...config,
  };

  return {
    id: uuid(),
    tenantId,
    name,
    status: 'pending',
    sourceType,
    sourceFileUrl: '',
    wallCount: 0,
    doorCount: 0,
    windowCount: 0,
    totalArea: 0,
    config: defaultConfig,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ============================================
// Stats Calculator
// ============================================

export function calculateProjectStats(walls: Wall[], rooms: Room[]) {
  const wallCount = walls.length;
  const doorCount = walls.reduce(
    (acc, w) => acc + w.openings.filter((o) => o.type === 'door').length,
    0
  );
  const windowCount = walls.reduce(
    (acc, w) => acc + w.openings.filter((o) => o.type === 'window').length,
    0
  );
  const totalArea = rooms.reduce((acc, r) => acc + r.area, 0);

  return {
    wallCount,
    doorCount,
    windowCount,
    totalArea: Math.round(totalArea * 100) / 100,
  };
}