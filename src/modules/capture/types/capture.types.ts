// ============================================
// NEXO CAPTURE — Tipos e Interfaces
// ============================================

// --- Geometria ---
export interface Coordinates {
  x: number;
  y: number;
  z?: number;
}

export interface WallGeometry {
  start: Coordinates;
  end: Coordinates;
  thickness: number;
  height: number;
}

// --- Entidades ---
export interface Wall {
  id: string;
  projectId: string;
  startPoint: Coordinates;
  endPoint: Coordinates;
  thickness: number;
  height: number;
  layer: string;
  isExterior: boolean;
  componentId?: string;
  openings: WallOpening[];
}

export interface WallOpening {
  id: string;
  type: 'door' | 'window';
  position: number;
  width: number;
  height: number;
  sillLevel?: number;
  openingType?: string;
}

export interface Door {
  id: string;
  wallId: string;
  position: number;
  width: number;
  height: number;
  type: DoorType;
  side: 'left' | 'right';
  threshold: number;
}

export type DoorType = 'pivot' | 'pivot_duplo' | 'corredeira' | 'basculante';

export interface Window {
  id: string;
  wallId: string;
  position: number;
  width: number;
  height: number;
  sillLevel: number;
  type: WindowType;
  hasSill: boolean;
}

export type WindowType = 'fixa' | 'bascu' | 'correr' | 'maximizador';

export interface Room {
  id: string;
  projectId: string;
  name: string;
  wallIds: string[];
  area: number;
  perimeter: number;
  floorMaterial?: string;
  ceilingHeight: number;
}

// --- Projeto ---
export interface CaptureProject {
  id: string;
  tenantId: string;
  name: string;
  status: ProjectStatus;
  sourceType: SourceType;
  sourceFileUrl: string;
  skpFileUrl?: string;
  wallCount: number;
  doorCount: number;
  windowCount: number;
  totalArea: number;
  config: ProjectConfig;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  rooms?: Room[];
  walls?: Wall[];
}

export type ProjectStatus =
  | 'pending'
  | 'parsing'
  | 'validating'
  | 'generating'
  | 'completed'
  | 'failed';

export type SourceType = 'dwg' | 'json' | 'pdf' | 'image';

export interface ProjectConfig {
  wallHeight: number;
  wallThickness: number;
  floorLevel: number;
  units: 'mm' | 'cm' | 'm';
  originX: number;
  originY: number;
  scale: number;
}

// --- API Requests/Responses ---
export interface ImportRequest {
  file?: File;
  projectName: string;
  config?: Partial<ProjectConfig>;
}

export interface ImportJSONRequest {
  walls: ImportWall[];
  doors?: ImportDoor[];
  windows?: ImportWindow[];
  projectName: string;
  config?: Partial<ProjectConfig>;
}

export interface ImportWall {
  start: [number, number];
  end: [number, number];
  thickness?: number;
  height?: number;
  layer?: string;
}

export interface ImportDoor {
  wallIndex: number;
  position: number;
  width: number;
  height?: number;
  type?: DoorType;
}

export interface ImportWindow {
  wallIndex: number;
  position: number;
  width: number;
  height: number;
  sill?: number;
  type?: WindowType;
}

export interface ProjectStatusResponse {
  status: ProjectStatus;
  progress: number;
  currentStep: string;
  steps: ProcessingStep[];
  error?: string;
}

export interface ProcessingStep {
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message?: string;
}

// --- Queue Jobs ---
export interface CaptureJob {
  projectId: string;
  sourceFileUrl: string;
  sourceType: SourceType;
  config: ProjectConfig;
}

export interface SKPGenerationResult {
  success: boolean;
  skpFileUrl?: string;
  componentIds?: {
    paredes: string;
    portas: string;
    janelas: string;
  };
  error?: string;
}

// --- Validation ---
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'wall_too_short' | 'wall_too_long' | 'door_exceeds_wall' | 'window_exceeds_wall' | 'invalid_coordinates' | 'intersection';
  message: string;
  entityId?: string;
}

export interface ValidationWarning {
  type: 'overlapping_doors' | 'unusual_dimensions' | 'missing_sill';
  message: string;
  entityId?: string;
}

// --- Geometry Helpers ---
export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

// --- Export ---
export interface PromobExportRequest {
  promobVersion: string;
  templateId?: string;
  includeMaterials?: boolean;
}

export interface PromobExportResponse {
  success: boolean;
  projectUrl?: string;
  message?: string;
}

// ============================================
// Constants
// ============================================

export const CAPTURE_DEFAULTS = {
  WALL_HEIGHT: 2700, // mm
  WALL_THICKNESS: 150, // mm
  DOOR_WIDTH: 800, // mm
  DOOR_HEIGHT: 2100, // mm
  WINDOW_SILL: 1100, // mm
  FLOOR_LEVEL: 0,
  UNITS: 'mm' as const,
  MAX_WALL_LENGTH: 20000, // mm
  MIN_WALL_LENGTH: 500, // mm
  MAX_PROJECT_AREA: 1000, // m²
} as const;

export const SKP_COMPONENT_NAMES = {
  PAREDES: 'PAREDES',
  PORTAS: 'PORTAS',
  JANELAS: 'JANELAS',
  PISO: 'PISO',
  TETO: 'TETO',
} as const;

export const PROCESSING_STEPS = {
  UPLOAD: { name: 'upload', label: 'Enviando arquivo' },
  PARSE: { name: 'parse', label: 'Processando geometria' },
  VALIDATE: { name: 'validate', label: 'Validando dados' },
  GENERATE: { name: 'generate', label: 'Gerando arquivo SketchUp' },
  EXPORT: { name: 'export', label: 'Finalizando' },
} as const;