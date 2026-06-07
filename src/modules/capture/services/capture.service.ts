import { CaptureData } from '../types/capture.types';

export class CaptureService {
  static async saveCapture(projectId: string, data: any): Promise<CaptureData> {
    return {
      id: Math.random().toString(36).substr(2, 9),
      projectId,
      data,
      createdAt: new Date().toISOString()
    };
  }
}
