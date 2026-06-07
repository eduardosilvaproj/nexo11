// ============================================
// NEXO CAPTURE — Core Service
// ============================================

import { 
  CaptureProject, 
  ProcessingStep, 
  ProjectStatus, 
  CAPTURE_DEFAULTS 
} from '../types/capture.types';

export class CaptureService {
  /**
   * Importa projeto a partir de dados JSON estruturados
   */
  async importFromJSON(tenantId: string, data: any): Promise<CaptureProject> {
    // Mock implementation for build fix
    return {
      id: Math.random().toString(36).substr(2, 9),
      tenantId,
      name: data.projectName || 'Novo Projeto',
      status: 'completed',
      sourceType: 'json',
      wallCount: data.walls?.length || 0,
      doorCount: data.doors?.length || 0,
      windowCount: data.windows?.length || 0,
      totalArea: 0,
      config: {
        wallHeight: CAPTURE_DEFAULTS.WALL_HEIGHT,
        wallThickness: CAPTURE_DEFAULTS.WALL_THICKNESS,
        floorLevel: 0,
        units: 'mm',
        originX: 0,
        originY: 0,
        scale: 1,
        ...data.config
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Retorna os passos de processamento baseados no status
   */
  getProcessingSteps(status: ProjectStatus): ProcessingStep[] {
    const steps: ProcessingStep['name'][] = ['upload', 'parse', 'validate', 'generate', 'export'];
    
    return steps.map((name, index) => {
      let stepStatus: ProcessingStep['status'] = 'pending';
      
      // Lógica simplificada de progresso
      const statusOrder: ProjectStatus[] = ['pending', 'parsing', 'validating', 'generating', 'completed'];
      const currentIndex = statusOrder.indexOf(status);
      
      if (index < currentIndex) stepStatus = 'completed';
      else if (index === currentIndex) stepStatus = 'processing';
      
      if (status === 'completed') stepStatus = 'completed';
      if (status === 'failed' && index === currentIndex) stepStatus = 'failed';

      return { name, status: stepStatus };
    });
  }
}

export const captureService = new CaptureService();
