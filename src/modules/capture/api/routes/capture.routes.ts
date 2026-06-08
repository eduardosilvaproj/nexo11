import {
  ImportJSONRequest,
} from '@/modules/capture/types/capture.types';
import { captureService } from '@/modules/capture/services/capture.service';

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
