// Script para crear las tablas de la base de datos
import { pool } from './src/config/database.js';

const createTables = async () => {
  try {
    console.log('🔄 Creando tablas de la base de datos...');

    // Crear tabla de usuarios
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        salt VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        email_verified BOOLEAN DEFAULT FALSE,
        storage_used BIGINT DEFAULT 0,
        storage_limit BIGINT DEFAULT 5368709120,
        last_login TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla usuarios creada');

    // Crear tabla de imágenes
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS imagenes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255),
        original_filename VARCHAR(255) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        image_path VARCHAR(500) NOT NULL,
        file_size BIGINT NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        width INT,
        height INT,
        is_favorite BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at),
        INDEX idx_is_favorite (is_favorite)
      )
    `);
    console.log('✅ Tabla imagenes creada');

    // Verificar que las tablas existen
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


