// ============================================
// NEXO CAPTURE — Main Service
// ============================================

import {
  CaptureProject,
  Wall,
  Room,
  ProjectConfig,
  ImportWall,
  ImportDoor,
  ImportWindow,
  ProjectStatus,
  SourceType,
  ProcessingStep,
  SKPGenerationResult,
  CAPTURE_DEFAULTS,
} from '../types/capture.types';
import {
  createWall,
  addDoorToWall,
  addWindowToWall,
  validateProject,
  detectRooms,
  calculateProjectStats,
  createCaptureProject,
} from './geometry.service';
import { v4 as uuid } from 'uuid';

// ============================================
// Capture Service
// ============================================

export class CaptureService {
  /**
   * Cria projeto a partir de JSON estruturado
   */
  async importFromJSON(
    tenantId: string,
    data: {
      walls: ImportWall[];
      doors?: ImportDoor[];
      windows?: ImportWindow[];
      projectName: string;
      config?: Partial<ProjectConfig>;
    }
  ): Promise<CaptureProject> {
    // Criar projeto
    const project = createCaptureProject(
      tenantId,
      data.projectName,
      'json',
      data.config
    );

    // Converter paredes
    const walls: Wall[] = data.walls.map((w) =>
      createWall(
        project.id,
        { x: w.start[0], y: w.start[1] },
        { x: w.end[0], y: w.end[1] },
        project.config,
        w.layer
      )
    );

    // Adicionar portas
    if (data.doors) {
      for (const door of data.doors) {
        const wallIndex = door.wallIndex;
        if (wallIndex >= 0 && wallIndex < walls.length) {
          walls[wallIndex] = addDoorToWall(
            walls[wallIndex],
            door.position,
            door.width,
            door.height
          );
        }
      }
    }

    // Adicionar janelas
    if (data.windows) {
      for (const win of data.windows) {
        const wallIndex = win.wallIndex;
        if (wallIndex >= 0 && wallIndex < walls.length) {
          walls[wallIndex] = addWindowToWall(
            walls[wallIndex],
            win.position,
            win.width,
            win.height,
            win.sill
          );
        }
      }
    }

    // Detectar ambientes
    const rooms = detectRooms(walls);

    // Calcular estatísticas
    const stats = calculateProjectStats(walls, rooms);

    // Atualizar projeto
    project.walls = walls;
    project.rooms = rooms;
    project.wallCount = stats.wallCount;
    project.doorCount = stats.doorCount;
    project.windowCount = stats.windowCount;
    project.totalArea = stats.totalArea;
    project.status = 'validating';

    return project;
  }

  /**
   * Valida projeto
   */
  validate(project: CaptureProject): { valid: boolean; errors: string[] } {
    if (!project.walls || project.walls.length === 0) {
      return { valid: false, errors: ['Nenhuma parede definida'] };
    }

    const validation = validateProject(project.walls, project.config);

    return {
      valid: validation.valid,
      errors: validation.errors.map((e) => e.message),
    };
  }

  /**
   * Gera arquivo SKP
   * Em produção, isso enfileira um job para o worker
   */
  async generateSKP(project: CaptureProject): Promise<SKPGenerationResult> {
    project.status = 'generating';

    try {
      // Em produção, aqui seria:
      // 1. Enfileirar job no BullMQ
      // 2. Worker executa Ruby script
      // 3. Upload para S3

      // Por enquanto, retornamos mock
      const skpUrl = await this.generateSKPAsync(project);

      project.skpFileUrl = skpUrl;
      project.status = 'completed';
      project.completedAt = new Date();

      return {
        success: true,
        skpFileUrl: skpUrl,
        componentIds: {
          paredes: uuid(),
          portas: uuid(),
          janelas: uuid(),
        },
      };
    } catch (error) {
      project.status = 'failed';
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Geração assíncrona (mock)
   */
  private async generateSKPAsync(project: CaptureProject): Promise<string> {
    // Simular processamento
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Em produção, retornar URL S3
    return `https://s3.amazonaws.com/nexo-capture/${project.id}/output.skp`;
  }

  /**
   * Retorna etapas de processamento
   */
  getProcessingSteps(status: ProjectStatus): ProcessingStep[] {
    const steps: ProcessingStep[] = [
      { name: 'upload', status: 'pending' },
      { name: 'parse', status: 'pending' },
      { name: 'validate', status: 'pending' },
      { name: 'generate', status: 'pending' },
      { name: 'export', status: 'pending' },
    ];

    const statusMap: Record<ProjectStatus, number> = {
      pending: 0,
      parsing: 1,
      validating: 2,
      generating: 3,
      completed: 4,
      failed: -1,
    };

    const currentIndex = statusMap[status];

    if (currentIndex === -1) {
      // Failed
      return steps.map((s, i) => ({
        ...s,
        status: i < 2 ? 'completed' : 'failed',
      }));
    }

    return steps.map((s, i) => ({
      ...s,
      status:
        i < currentIndex
          ? 'completed'
          : i === currentIndex
          ? 'processing'
          : 'pending',
    }));
  }

  /**
   * Formata dados para exportação Promob
   */
  formatForPromob(project: CaptureProject): object {
    return {
      projectId: project.id,
      name: project.name,
      walls: project.walls?.map((w) => ({
        start: [w.startPoint.x, w.startPoint.y],
        end: [w.endPoint.x, w.endPoint.y],
        thickness: w.thickness,
        height: w.height,
        openings: w.openings.map((o) => ({
          type: o.type,
          position: o.position,
          width: o.width,
          height: o.height,
          ...(o.sillLevel && { sillLevel: o.sillLevel }),
        })),
      })),
      rooms: project.rooms?.map((r) => ({
        name: r.name,
        area: r.area,
        perimeter: r.perimeter,
      })),
      config: project.config,
    };
  }
}

// ============================================
// Singleton
// ============================================

export const captureService = new CaptureService();