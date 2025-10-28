-- Script SQL para crear las tablas necesarias para Nuvia

-- Crear base de datos si no existe
CREATE DATABASE IF NOT EXISTS nuvia CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nuvia;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    storage_used BIGINT DEFAULT 0,
    storage_limit BIGINT DEFAULT 5368709120, -- 5GB por defecto
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de imágenes
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
);

-- Tabla de álbumes (opcional para futuras funcionalidades)
CREATE TABLE IF NOT EXISTS albums (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (cover_image_id) REFERENCES imagenes(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id)
);

-- Tabla de relación imágenes-álbumes (opcional)
CREATE TABLE IF NOT EXISTS album_images (
    album_id INT NOT NULL,
    image_id INT NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (album_id, image_id),
    FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
    FOREIGN KEY (image_id) REFERENCES imagenes(id) ON DELETE CASCADE
);

-- Insertar usuario de prueba si no existe
INSERT IGNORE INTO usuarios (username, email, password_hash, salt, is_active, email_verified) 
VALUES ('usuario1', 'usuario1@test.com', '$2b$10$example_hash', 'example_salt', TRUE, TRUE);

-- Mostrar información de las tablas creadas
SHOW TABLES;
DESCRIBE usuarios;
DESCRIBE imagenes;


