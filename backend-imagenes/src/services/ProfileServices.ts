// src/services/ProfileService.ts
import { Request, Response } from 'express';
import { pool } from '@src/config/database';
import logger from 'jet-logger';

// ============================================================================
// 👤 OBTENER PERFIL
// ============================================================================

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    
    const [rows] = await pool.execute(
      `SELECT 
        userId, username, email, profileImagePath, bio, location,
        role, status, emailVerified, storageUsed, storageLimit,
        imageCount, videoCount, albumCount, totalMediaCount,
        createdAt, lastLogin, updatedAt
       FROM users 
       WHERE userId = ? AND deletedAt IS NULL`,
      [userId]
    );

    const user = (rows as any[])[0];
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    logger.info(`✅ Perfil obtenido para usuario: ${user.username}`);
    
    res.json({
      success: true,
      data: user
    });
    
  } catch (error) {
    logger.err(`❌ Error obteniendo perfil: ${error}`);
    res.status(500).json({
      success: false,
      error: 'Error al obtener perfil del usuario'
    });
  }
};

// ============================================================================
// 📊 ESTADÍSTICAS DEL USUARIO
// ============================================================================

export const getUserStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    
    // Obtener perfil básico
    const [userRows] = await pool.execute(
      `SELECT 
        userId, username, email, profileImagePath, bio, location,
        role, status, emailVerified, storageUsed, storageLimit,
        imageCount, videoCount, albumCount, totalMediaCount,
        createdAt, lastLogin
       FROM users 
       WHERE userId = ? AND deletedAt IS NULL`,
      [userId]
    );

    const user = (userRows as any[])[0];
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Obtener estadísticas adicionales
    const [trashCountRows] = await pool.execute(
      'SELECT COUNT(*) as count FROM trash WHERE userId = ?',
      [userId]
    );

    const [favoriteImagesRows] = await pool.execute(
      'SELECT COUNT(*) as count FROM images WHERE userId = ? AND isFavorite = TRUE AND deletedAt IS NULL',
      [userId]
    );

    const [favoriteVideosRows] = await pool.execute(
      'SELECT COUNT(*) as count FROM videos WHERE userId = ? AND isFavorite = TRUE AND deletedAt IS NULL',
      [userId]
    );

    const stats = {
      ...user,
      storagePercentage: Math.round((user.storageUsed / user.storageLimit) * 100),
      trashCount: (trashCountRows as any[])[0].count,
      favoriteImageCount: (favoriteImagesRows as any[])[0].count,
      favoriteVideoCount: (favoriteVideosRows as any[])[0].count
    };

    logger.info(`✅ Estadísticas obtenidas para usuario: ${user.username}`);
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    logger.err(`❌ Error obteniendo estadísticas: ${error}`);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas del usuario'
    });
  }
};

// ============================================================================
// 🖼️ ACTUALIZAR IMAGEN DE PERFIL
// ============================================================================

export const updateProfileImage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó ninguna imagen'
      });
    }

    // ✅ Ruta correcta para la imagen de perfil
    const profileImagePath = `/uploads/${userId}/profile/${req.file.filename}`;
    
    // Obtener imagen anterior para eliminarla
    const [userRows] = await pool.execute(
      'SELECT profileImagePath FROM users WHERE userId = ?',
      [userId]
    );
    
    const oldImagePath = (userRows as any[])[0]?.profileImagePath;
    
    // Actualizar en la base de datos
    await pool.execute(
      'UPDATE users SET profileImagePath = ?, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?',
      [profileImagePath, userId]
    );

    // Eliminar imagen anterior si existe
    if (oldImagePath && !oldImagePath.includes('default-avatar')) {
      const fs = require('fs');
      const path = require('path');
      const fullOldPath = path.join(__dirname, '..', '..', 'public', oldImagePath);
      if (fs.existsSync(fullOldPath)) {
        fs.unlinkSync(fullOldPath);
        logger.info(`🗑️ Imagen anterior eliminada: ${oldImagePath}`);
      }
    }

    logger.info(`✅ Imagen de perfil actualizada para usuario: ${userId}`);
    
    res.json({
      success: true,
      message: 'Imagen de perfil actualizada correctamente',
      data: { profileImagePath }
    });
    
  } catch (error) {
    logger.err(`❌ Error actualizando imagen de perfil: ${error}`);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar imagen de perfil'
    });
  }
};

// ============================================================================
// ✏️ ACTUALIZAR PERFIL COMPLETO
// ============================================================================

export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { username, email, bio, location } = req.body;
    
    // Verificar si el username o email ya existen (excluyendo al usuario actual)
    if (username || email) {
      const [existingUsers] = await pool.execute(
        `SELECT userId FROM users 
         WHERE (username = ? OR email = ?) 
         AND userId != ? AND deletedAt IS NULL`,
        [username || '', email || '', userId]
      );

      if ((existingUsers as any[]).length > 0) {
        return res.status(400).json({
          success: false,
          error: 'El nombre de usuario o email ya está en uso'
        });
      }
    }

    // Construir query dinámica
    const updates: string[] = [];
    const params: any[] = [];

    if (username) {
      updates.push('username = ?');
      params.push(username);
    }
    if (email) {
      updates.push('email = ?');
      params.push(email);
    }
    if (bio !== undefined) {
      updates.push('bio = ?');
      params.push(bio);
    }
    if (location !== undefined) {
      updates.push('location = ?');
      params.push(location);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionaron datos para actualizar'
      });
    }

    updates.push('updatedAt = CURRENT_TIMESTAMP');
    params.push(userId);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE userId = ?`;
    
    await pool.execute(query, params);

    logger.info(`✅ Perfil actualizado para usuario: ${userId}`);
    
    // Obtener usuario actualizado
    const [updatedRows] = await pool.execute(
      `SELECT userId, username, email, profileImagePath, bio, location,
              role, status, emailVerified, createdAt, updatedAt
       FROM users WHERE userId = ?`,
      [userId]
    );

    const updatedUser = (updatedRows as any[])[0];
    
    res.json({
      success: true,
      message: 'Perfil actualizado correctamente',
      data: updatedUser
    });
    
  } catch (error) {
    logger.err(`❌ Error actualizando perfil: ${error}`);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar perfil'
    });
  }
};

// ============================================================================
// 🔐 ACTUALIZAR CONTRASEÑA (VERSIÓN SIMPLIFICADA)
// ============================================================================

export const updatePassword = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren la contraseña actual y la nueva contraseña'
      });
    }

    // En una implementación real, aquí verificarías la contraseña actual
    // y hashearías la nueva contraseña con bcrypt
    
    logger.info(`✅ Solicitud de cambio de contraseña para usuario: ${userId}`);
    
    // Por ahora, solo registramos la solicitud
    res.json({
      success: true,
      message: 'Funcionalidad de cambio de contraseña en desarrollo'
    });
    
  } catch (error) {
    logger.err(`❌ Error en cambio de contraseña: ${error}`);
    res.status(500).json({
      success: false,
      error: 'Error al procesar cambio de contraseña'
    });
  }
};

// ============================================================================
// ❌ ELIMINAR CUENTA (SOFT DELETE)
// ============================================================================

export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    // Soft delete de la cuenta
    await pool.execute(
      'UPDATE users SET deletedAt = CURRENT_TIMESTAMP, status = "inactive" WHERE userId = ?',
      [userId]
    );

    logger.warn(`🗑️ Cuenta eliminada (soft delete) para usuario: ${userId}`);
    
    res.json({
      success: true,
      message: 'Cuenta eliminada correctamente'
    });
    
  } catch (error) {
    logger.err(`❌ Error eliminando cuenta: ${error}`);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar cuenta'
    });
  }
};

// ============================================================================
// 🎨 ACTUALIZACIONES INDIVIDUALES
// ============================================================================

export const updateUsername = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el nombre de usuario'
      });
    }

    // Verificar si el username ya existe
    const [existingUsers] = await pool.execute(
      'SELECT userId FROM users WHERE username = ? AND userId != ? AND deletedAt IS NULL',
      [username, userId]
    );

    if ((existingUsers as any[]).length > 0) {
      return res.status(400).json({
        success: false,
        error: 'El nombre de usuario ya está en uso'
      });
    }

    await pool.execute(
      'UPDATE users SET username = ?, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?',
      [username, userId]
    );

    logger.info(`✅ Username actualizado para usuario: ${userId}`);
    
    res.json({
      success: true,
      message: 'Nombre de usuario actualizado correctamente',
      data: { username }
    });
    
  } catch (error) {
    logger.err(`❌ Error actualizando username: ${error}`);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar nombre de usuario'
    });
  }
};

export const updateBio = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { bio } = req.body;

    await pool.execute(
      'UPDATE users SET bio = ?, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?',
      [bio || null, userId]
    );

    logger.info(`✅ Bio actualizada para usuario: ${userId}`);
    
    res.json({
      success: true,
      message: 'Biografía actualizada correctamente',
      data: { bio }
    });
    
  } catch (error) {
    logger.err(`❌ Error actualizando bio: ${error}`);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar biografía'
    });
  }
};

export const updateEmail = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el email'
      });
    }

    // Verificar si el email ya existe
    const [existingUsers] = await pool.execute(
      'SELECT userId FROM users WHERE email = ? AND userId != ? AND deletedAt IS NULL',
      [email, userId]
    );

    if ((existingUsers as any[]).length > 0) {
      return res.status(400).json({
        success: false,
        error: 'El email ya está en uso'
      });
    }

    await pool.execute(
      'UPDATE users SET email = ?, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?',
      [email, userId]
    );

    logger.info(`✅ Email actualizado para usuario: ${userId}`);
    
    res.json({
      success: true,
      message: 'Email actualizado correctamente',
      data: { email }
    });
    
  } catch (error) {
    logger.err(`❌ Error actualizando email: ${error}`);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar email'
    });
  }
};

export const updateLocation = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { location } = req.body;

    await pool.execute(
      'UPDATE users SET location = ?, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?',
      [location || null, userId]
    );

    logger.info(`✅ Location actualizada para usuario: ${userId}`);
    
    res.json({
      success: true,
      message: 'Ubicación actualizada correctamente',
      data: { location }
    });
    
  } catch (error) {
    logger.err(`❌ Error actualizando location: ${error}`);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar ubicación'
    });
  }
};



// Funciones opcionales para el futuro
export const updateTheme = async (req: Request, res: Response) => {
  // Para preferencias de tema (cuando las añadas a la base de datos)
  res.json({
    success: true,
    message: 'Funcionalidad de tema en desarrollo'
  });
};

export const updateLanguage = async (req: Request, res: Response) => {
  // Para preferencias de idioma (cuando las añadas a la base de datos)
  res.json({
    success: true,
    message: 'Funcionalidad de idioma en desarrollo'
  });
};