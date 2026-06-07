// ============================================
// NEXO CAPTURE — Domain Types
// ============================================

export type ProjectStatus = 'pending' | 'parsing' | 'validating' | 'generating' | 'completed' | 'failed';
export type SourceType = 'json' | 'dwg' | 'pdf' | 'image';

export interface Point {
  x: number;
  y: number;
}

export interface Wall {
  id: string;
  start: Point;
  end: Point;
  thickness: number;
  height: number;
  hasDoor?: boolean;
  hasWindow?: boolean;
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

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface BoundingBox {
  min: Point;
  max: Point;
}

export const CAPTURE_DEFAULTS = {
  WALL_HEIGHT: 2700,
  WALL_THICKNESS: 150,
  DOOR_WIDTH: 800,
  DOOR_HEIGHT: 2100,
  WINDOW_WIDTH: 1200,
  WINDOW_HEIGHT: 1100,
  WINDOW_SILL: 1000,
};

export interface CaptureData {
  id: string;
  projectId: string;
  data: any;
  createdAt: string;
}
