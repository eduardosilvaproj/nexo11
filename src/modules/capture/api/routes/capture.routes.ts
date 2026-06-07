// ============================================
// NEXO CAPTURE — API Routes
// ============================================

import { Router, Request, Response } from 'express';
import {
  ImportJSONRequest,
  ProjectConfig,
  CaptureProject,
  ProjectStatus,
  ProcessingStep,
  CAPTURE_DEFAULTS,
} from '../types/capture.types';
import { captureService } from '../services/capture.service';

const router = Router();

// ============================================
// POST /import/json
// Importa projeto via JSON estruturado
// ============================================

router.post('/import/json', async (req: Request, res: Response) => {
  try {
    const body = req.body as ImportJSONRequest;

    // Validações básicas
    if (!body.walls || !Array.isArray(body.walls) || body.walls.length === 0) {
      res.status(400).json({
        error: 'walls é obrigatório e deve ser um array não vazio',
      });
      return;
    }

    if (!body.projectName) {
      res.status(400).json({
        error: 'projectName é obrigatório',
      });
      return;
    }

    // Obter tenantId (do auth middleware em produção)
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    // Importar projeto
    const project = await captureService.importFromJSON(tenantId, {
      walls: body.walls,
      doors: body.doors,
      windows: body.windows,
      projectName: body.projectName,
      config: body.config,
    });

    // Resposta
    res.status(201).json({
      projectId: project.id,
      name: project.name,
      status: project.status,
      stats: {
        wallCount: project.wallCount,
        doorCount: project.doorCount,
        windowCount: project.windowCount,
        totalArea: project.totalArea,
        roomCount: project.rooms?.length || 0,
      },
      config: project.config,
      createdAt: project.createdAt,
    });
  } catch (error) {
    console.error('[Capture] Import error:', error);
    res.status(500).json({
      error: 'Erro ao importar projeto',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
});

// ============================================
// GET /projects/:id
// Retorna dados do projeto
// ============================================

router.get('/projects/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Em produção, buscar do banco
    // Por ora, retorna mock
    const project: CaptureProject = {
      id,
      tenantId: 'default',
      name: 'Projeto Teste',
      status: 'completed',
      sourceType: 'json',
      sourceFileUrl: '',
      wallCount: 4,
      doorCount: 2,
      windowCount: 1,
      totalArea: 25.5,
      config: {
        wallHeight: CAPTURE_DEFAULTS.WALL_HEIGHT,
        wallThickness: CAPTURE_DEFAULTS.WALL_THICKNESS,
        floorLevel: 0,
        units: 'mm',
        originX: 0,
        originY: 0,
        scale: 1,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar projeto' });
  }
});

// ============================================
// GET /projects/:id/status
// Retorna status detalhado do processamento
// ============================================

router.get('/projects/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const status = req.query.status as ProjectStatus || 'completed';

    const steps = captureService.getProcessingSteps(status);

    const progressMap: Record<ProjectStatus, number> = {
      pending: 0,
      parsing: 20,
      validating: 40,
      generating: 70,
      completed: 100,
      failed: 0,
    };

    const stepLabels: Record<string, string> = {
      upload: 'Enviando arquivo',
      parse: 'Processando geometria',
      validate: 'Validando dados',
      generate: 'Gerando arquivo SketchUp',
      export: 'Finalizando',
    };

    const currentStep = steps.find((s) => s.status === 'processing');

    res.json({
      projectId: id,
      status,
      progress: progressMap[status],
      currentStep: currentStep ? stepLabels[currentStep.name] : 'Concluído',
      steps: steps.map((s) => ({
        name: s.name,
        label: stepLabels[s.name],
        status: s.status,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar status' });
  }
});

// ============================================
// GET /projects/:id/skp
// Download do arquivo SKP
// ============================================

router.get('/projects/:id/skp', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Em produção, verificar se SKP existe e retornar URL presigned
    // Por ora, retorna erro indicando que geração ainda não foi implementada

    res.status(200).json({
      message: 'SKP não disponível - use POST /projects/:id/generate primeiro',
      projectId: id,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao baixar SKP' });
  }
});

// ============================================
// POST /projects/:id/generate
// Inicia geração de SKP
// ============================================

router.post('/projects/:id/generate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Em produção, buscar projeto do banco
    // Por ora, retorna mock

    res.status(202).json({
      projectId: id,
      status: 'generating',
      message: 'Geração iniciada',
      estimatedTime: 30, // segundos
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao iniciar geração' });
  }
});

// ============================================
// GET /projects
// Lista projetos com paginação
// ============================================

router.get('/projects', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as ProjectStatus | undefined;

    // Em produção, buscar do banco com paginação
    // Por ora, retorna mock

    res.json({
      data: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar projetos' });
  }
});

// ============================================
// GET /projects/:id/geometry
// Retorna geometria para edição
// ============================================

router.get('/projects/:id/geometry', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    res.json({
      projectId: id,
      walls: [],
      doors: [],
      windows: [],
      rooms: [],
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar geometria' });
  }
});

// ============================================
// PATCH /projects/:id/geometry
// Atualiza geometria (edição manual)
// ============================================

router.patch('/projects/:id/geometry', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;

    // Validar geometria
    // Atualizar no banco

    res.json({
      projectId: id,
      message: 'Geometria atualizada',
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar geometria' });
  }
});

// ============================================
// GET /templates
// Lista templates de configuração
// ============================================

router.get('/templates', async (req: Request, res: Response) => {
  res.json({
    templates: [
      {
        id: 'padrao',
        name: 'Padrão Brasileiro',
        config: {
          wallHeight: 2700,
          wallThickness: 150,
          units: 'mm',
        },
      },
      {
        id: 'comercial',
        name: 'Ambiente Comercial',
        config: {
          wallHeight: 3000,
          wallThickness: 200,
          units: 'mm',
        },
      },
      {
        id: 'suite',
        name: 'Suíte Premium',
        config: {
          wallHeight: 2900,
          wallThickness: 120,
          units: 'mm',
        },
      },
    ],
  });
});

// ============================================
// Health Check
// ============================================

router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    module: 'capture',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

export default router;