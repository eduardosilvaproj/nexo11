// ============================================
// NEXO CAPTURE — Domain Types
// ============================================

export type ProjectStatus = 'pending' | 'parsing' | 'validating' | 'generating' | 'completed' | 'failed';
export type SourceType = 'json' | 'dwg' | 'pdf' | 'image';

export interface Point {
  x: number;
  y: number;
  z?: number;
}

export interface Opening {
  id: string;
  type: 'door' | 'window';
  position: number;
  width: number;
  height: number;
  sillLevel?: number;
}

export interface Wall {
  id: string;
  projectId?: string;
  startPoint: Point;
  endPoint: Point;
  thickness: number;
  height: number;
  hasDoor?: boolean;
  hasWindow?: boolean;
  layer?: string;
  isExterior?: boolean;
  openings: Opening[];
}

export interface Door {
  id: string;
  wallId: string;
  position: number; // 0 to 1 along wall
  width: number;
  height: number;
}

export interface Window {
  id: string;
  wallId: string;
  position: number; // 0 to 1 along wall
  width: number;
  height: number;
  sillHeight: number;
}

export interface Room {
  id: string;
  name: string;
  wallIds: string[];
  area: number;
  projectId?: string;
}

export interface ProjectConfig {
  wallHeight: number;
  wallThickness: number;
  floorLevel: number;
  units: 'mm' | 'cm' | 'm';
  originX: number;
  originY: number;
  scale: number;
}

export interface CaptureProject {
  id: string;
  tenantId: string;
  name: string;
  status: ProjectStatus;
  sourceType: SourceType;
  sourceFileUrl?: string;
  config: ProjectConfig;
  wallCount: number;
  doorCount: number;
  windowCount: number;
  totalArea: number;
  rooms?: Room[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessingStep {
  name: 'upload' | 'parse' | 'validate' | 'generate' | 'export';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface ImportJSONRequest {
  projectName: string;
  walls: Array<{
    start: [number, number];
    end: [number, number];
    thickness?: number;
  }>;
  doors?: Array<{
    wallIndex: number;
    position: number;
    width: number;
    height?: number;
  }>;
  windows?: Array<{
    wallIndex: number;
    position: number;
    width: number;
    height: number;
    sill?: number;
  }>;
  config?: Partial<ProjectConfig>;
}

export interface ValidationError {
  type: string;
  message: string;
  entityId: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: (string | ValidationError)[];
  warnings: (string | ValidationError)[];
}

export interface BoundingBox {
  min: Point;
  max: Point;
  minX?: number; // Added for legacy code support if needed
}

export type CaptureProjectLegacy = any;

export const CAPTURE_DEFAULTS = {
  WALL_HEIGHT: 2700,
  WALL_THICKNESS: 150,
  DOOR_WIDTH: 800,
  DOOR_HEIGHT: 2100,
  WINDOW_WIDTH: 1200,
  WINDOW_HEIGHT: 1100,
  WINDOW_SILL: 1000,
  MIN_WALL_LENGTH: 100,
  MAX_WALL_LENGTH: 50000,
  FLOOR_LEVEL: 0,
  UNITS: 'mm' as const,
};

export interface CaptureData {
  id: string;
  projectId: string;
  data: any;
  createdAt: string;
}

export type CaptureProjectStatus = ProjectStatus;
export { type CaptureProject as CaptureProjectInterface };
