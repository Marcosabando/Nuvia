// src/services/LocalStorageService.ts
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface StorageResult {
  success: boolean;
  filePath?: string;
  fileUrl?: string;
  fileSize: number;
  error?: string;
}

interface DiskInfo {
  path: string;
  total: number;
  free: number;
  used: number;
  percentUsed: number;
}

class LocalStorageService {
  private basePath: string;
  private disks: string[] = [];

  constructor() {
    this.basePath = process.env.UPLOAD_PATH || '/var/nuvia/uploads';
    this.detectAdditionalDisks();
  }

  /**
   * Detectar discos adicionales montados
   */
  private detectAdditionalDisks() {
    const possibleDisks = [
      '/mnt/disk1/nuvia',
      '/mnt/disk2/nuvia',
      '/mnt/disk3/nuvia',
      '/mnt/disk4/nuvia',
    ];

    for (const disk of possibleDisks) {
      try {
        if (fsSync.existsSync(disk)) {
          this.disks.push(disk);
        }
      } catch (error) {}
    }
  }

  /**
   * Obtener el mejor disco para almacenar (balanceo de carga)
   */
  private getBestDisk(): string {
    if (this.disks.length === 0) {
      return this.basePath;
    }

    const diskIndex = Math.floor(Math.random() * this.disks.length);
    return this.disks[diskIndex];
  }

  /**
   * Crear estructura de directorios para un usuario
   */
  async setupUserDirectory(userId: number): Promise<void> {
    const userPath = path.join(this.basePath, 'users', userId.toString());
    const dirs = ['images', 'videos', 'documents', 'thumbnails'];

    await fs.mkdir(userPath, { recursive: true });
    
    for (const dir of dirs) {
      await fs.mkdir(path.join(userPath, dir), { recursive: true });
    }
  }

  /**
   * Subir archivo al almacenamiento local
   */
  async uploadFile(
    fileBuffer: Buffer,
    options: {
      userId: number;
      folder: 'images' | 'videos' | 'documents';
      originalName: string;
      mimeType: string;
    }
  ): Promise<StorageResult> {
    try {
      const userDir = path.join(this.basePath, 'users', options.userId.toString(), options.folder);
      await fs.mkdir(userDir, { recursive: true });

      const fileExt = path.extname(options.originalName) || this.getExtensionFromMime(options.mimeType);
      const fileName = `${uuidv4()}${fileExt}`;
      const filePath = path.join(userDir, fileName);

      await fs.writeFile(filePath, fileBuffer);
      const stats = await fs.stat(filePath);

      if (options.folder === 'images' && options.mimeType.startsWith('image/')) {
        await this.createThumbnail(fileBuffer, options.userId, fileName);
      }

      return {
        success: true,
        filePath,
        fileUrl: `/uploads/users/${options.userId}/${options.folder}/${fileName}`,
        fileSize: stats.size,
      };
    } catch (error: any) {
      return {
        success: false,
        fileSize: 0,
        error: error.message,
      };
    }
  }

  /**
   * Crear thumbnail para imágenes
   */
  private async createThumbnail(
    imageBuffer: Buffer,
    userId: number,
    fileName: string
  ): Promise<void> {
    try {
      const sharp = await import('sharp');
      
      const thumbnailDir = path.join(this.basePath, 'users', userId.toString(), 'thumbnails');
      await fs.mkdir(thumbnailDir, { recursive: true });

      const thumbnailPath = path.join(thumbnailDir, `thumb_${fileName}`);
      
      await sharp.default(imageBuffer)
        .resize(300, 300, { fit: 'inside' })
        .toFile(thumbnailPath);
    } catch (error) {}
  }

  /**
   * Eliminar archivo
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      await fs.unlink(filePath);
      
      const thumbPath = this.getThumbnailPath(filePath);
      if (await this.fileExists(thumbPath)) {
        await fs.unlink(thumbPath);
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Mover a papelera (en lugar de eliminar inmediatamente)
   */
  async moveToTrash(filePath: string, userId: number): Promise<boolean> {
    try {
      const trashPath = path.join(
        this.basePath,
        'trash',
        userId.toString(),
        path.basename(filePath)
      );
      
      await fs.mkdir(path.dirname(trashPath), { recursive: true });
      await fs.rename(filePath, trashPath);
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtener información de espacio en disco
   */
  async getDiskInfo(): Promise<DiskInfo[]> {
    const disks = [this.basePath, ...this.disks];
    const info: DiskInfo[] = [];

    for (const disk of disks) {
      try {
        const stats = await fs.statfs(disk);
        const total = stats.blocks * stats.bsize;
        const free = stats.bfree * stats.bsize;
        const used = total - free;
        const percentUsed = (used / total) * 100;

        info.push({
          path: disk,
          total,
          free,
          used,
          percentUsed,
        });
      } catch (error) {}
    }

    return info;
  }

  /**
   * Limpiar archivos temporales antiguos
   */
  async cleanupOldFiles(maxAgeDays: number = 7): Promise<{ deleted: number; errors: number }> {
    const tempDir = path.join(this.basePath, 'temp');
    const cutoff = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
    
    let deleted = 0;
    let errors = 0;

    try {
      const files = await fs.readdir(tempDir);
      
      for (const file of files) {
        try {
          const filePath = path.join(tempDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtimeMs < cutoff) {
            await fs.unlink(filePath);
            deleted++;
          }
        } catch (error) {
          errors++;
        }
      }
    } catch (error) {}

    return { deleted, errors };
  }

  // Métodos auxiliares
  private getExtensionFromMime(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'application/pdf': '.pdf',
    };
    
    return mimeToExt[mimeType] || '.bin';
  }

  private getThumbnailPath(filePath: string): string {
    const dir = path.dirname(filePath);
    const base = path.basename(filePath);
    return path.join(dir, '..', 'thumbnails', `thumb_${base}`);
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

export default new LocalStorageService();