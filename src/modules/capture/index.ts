// ============================================
// NEXO CAPTURE — Module Index
// ============================================

// Types
export * from './types/capture.types';

// Services
export { captureService } from './services/capture.service';
export * from './services/geometry.service';

// Routes
export { default as captureRoutes } from './api/routes/capture.routes';

// Components (Frontend)
export {
  CaptureImport,
  CapturePreview3D,
  generateExampleJSON,
} from './components/CaptureComponents';

// ============================================
// Module Registration
// ============================================

/**
 * Para registrar no App principal do NEXO:
 *
 * import { captureRoutes } from '@/modules/capture';
 *
 * // No router
 * <Route path="/capture" element={<CapturePage />} />
 *
 * // API Routes
 * app.use('/api/capture', captureRoutes);
 */