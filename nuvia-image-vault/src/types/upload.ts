export interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "completed" | "error";
  errorMessage?: string;
}

export interface UploadZoneProps {
  onUploadComplete?: () => void;
  type?: 'all' | 'images' | 'videos' | 'documents';
}

export type FileType = 'image' | 'video' | 'document';

export interface UploadConfig {
  allowedTypes: string[];
  maxSize: number;
  description: string;
  acceptString: string;
}

export interface ServerResponse {
  success?: boolean;
  status?: string;
  id?: string;
  documentId?: string;
  imageId?: string;
  videoId?: string;
  error?: string;
  message?: string;
}