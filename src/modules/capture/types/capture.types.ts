export type CaptureFormat = "dwg" | "pdf" | "json";
export interface CaptureData {
  id: string;
  projectId: string;
  data: any;
  createdAt: string;
}
