// Script para crear las tablas de la base de datos alineadas con los servicios
import { pool } from './src/config/database.js';

const createTables = async () => {
  try {
    console.log('🔄 Creando tablas de la base de datos...');

    // Tabla de usuarios
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        userId INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        isActive TINYINT(1) DEFAULT 1,
        emailVerified TINYINT(1) DEFAULT 0,
        storageUsed BIGINT DEFAULT 0,
        storageLimit BIGINT DEFAULT 5368709120,
        lastLogin DATETIME NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla users verificada/creada');

    // Tabla de imágenes
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS images (
        imageId INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        title VARCHAR(255),
        description TEXT,
        originalFilename VARCHAR(255) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        imagePath VARCHAR(500) NOT NULL,
        fileSize BIGINT NOT NULL,
        mimeType VARCHAR(100) NOT NULL,
        width INT,
        height INT,
        isFavorite TINYINT(1) DEFAULT 0,
        isPublic TINYINT(1) DEFAULT 0,
        location VARCHAR(255),
        takenDate DATETIME NULL,
        cameraInfo VARCHAR(255),
        uploadDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deletedAt DATETIME NULL,
        CONSTRAINT fk_images_users FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE,
        INDEX idx_images_user (userId),
        INDEX idx_images_createdAt (createdAt),
        INDEX idx_images_favorite (isFavorite)
      )
    `);
    console.log('✅ Tabla images verificada/creada');

    // Tabla de videos
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS videos (
        videoId INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        title VARCHAR(255),
        description TEXT,
        originalFilename VARCHAR(255) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        videoPath VARCHAR(500) NOT NULL,
        thumbnailPath VARCHAR(500),
        fileSize BIGINT NOT NULL,
        mimeType VARCHAR(100) NOT NULL,
        duration DECIMAL(10,2) NULL,
        width INT NULL,
        height INT NULL,
        fps DECIMAL(10,2) NULL,
        bitrate BIGINT NULL,
        codec VARCHAR(100),
        isFavorite TINYINT(1) DEFAULT 0,
        isPublic TINYINT(1) DEFAULT 0,
        uploadDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        recordedDate DATETIME NULL,
        location VARCHAR(255),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deletedAt DATETIME NULL,
        CONSTRAINT fk_videos_users FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE,
        INDEX idx_videos_user (userId),
        INDEX idx_videos_createdAt (createdAt),
        INDEX idx_videos_favorite (isFavorite)
      )
    `);
    console.log('✅ Tabla videos verificada/creada');

    const [tables] = await pool.execute('SHOW TABLES');
    console.log('📋 Tablas existentes:', tables);

    console.log('✅ Base de datos configurada correctamente');
  } catch (error) {
    console.error('❌ Error creando tablas:', error);
  } finally {
    await pool.end();
  }
};

createTables();


