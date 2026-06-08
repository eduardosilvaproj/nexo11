import {
  ImportJSONRequest,
} from '../types/capture.types.ts';
import { captureService } from '../services/capture.service.ts';

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
