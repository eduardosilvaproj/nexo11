// ============================================
// NEXO CAPTURE — API Routes
// ============================================

import {
  ImportJSONRequest,
  CaptureProject,
  ProjectStatus,
  CAPTURE_DEFAULTS,
} from '../types/capture.types';
import { captureService } from '../services/capture.service';

// Mocking Express-like interface since we are in a frontend-heavy environment
export default class CaptureRoutes {
  async handleImport(req: { body: ImportJSONRequest, headers: any }) {
    const body = req.body;
    const tenantId = req.headers['x-tenant-id'] || 'default';

    return await captureService.importFromJSON(tenantId, {
      walls: body.walls,
      doors: body.doors,
      windows: body.windows,
      projectName: body.projectName,
      config: body.config,
    });
  }
}
