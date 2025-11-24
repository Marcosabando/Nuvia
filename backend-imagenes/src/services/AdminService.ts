// src/services/AdminService.ts
import { Request, Response } from "express";
import { pool } from "@src/config/database";
import { RowDataPacket, ResultSetHeader } from "mysql2";

// ============================================================================
// INTERFACES
// ============================================================================

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalStorage: number;
  usedStorage: number;
  totalImages: number;
  totalVideos: number;
  uploadsToday: number;
  systemHealth: number;
}

interface UserDetail {
  userId: number;
  username: string;
  email: string;
  role: string;
  status: string;
  totalImages: number;
  totalVideos: number;
  storageUsed: number;
  storageLimit: number;
  lastLogin: string | null;
  createdAt: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Verificar si el usuario es administrador
 */
const verifyAdmin = (req: Request): boolean => {
  const user = (req as any).user;
  return user && user.role === 'admin';
};

/**
 * Convertir bytes a GB
 */
const bytesToGB = (bytes: number): number => {
  return parseFloat((bytes / (1024 * 1024 * 1024)).toFixed(2));
};

/**
 * Calcular salud del sistema basada en múltiples factores
 */
const calculateSystemHealth = (stats: any): number => {
  // Factor 1: Uso de almacenamiento (50% del score)
  const storageHealth = ((stats.totalStorageGB - stats.usedStorageGB) / stats.totalStorageGB) * 50;
  
  // Factor 2: Usuarios activos vs totales (30% del score)
  const userActivityHealth = stats.totalUsers > 0 
    ? (stats.activeUsers / stats.totalUsers) * 30 
    : 30;
  
  // Factor 3: Actividad reciente (20% del score)
  const activityHealth = stats.uploadsToday > 0 ? 20 : 10;
  
  return Math.min(100, Math.max(0, Math.round(storageHealth + userActivityHealth + activityHealth)));
};

// ============================================================================
// 📊 ESTADÍSTICAS GLOBALES
// ============================================================================

/**
 * Obtener estadísticas globales del sistema
 * GET /api/admin/stats
 */
export const getAdminStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // Verificar permisos de admin
    if (!verifyAdmin(req)) {
      res.status(403).json({
        success: false,
        error: 'Acceso denegado - Se requiere rol de administrador'
      });
      return;
    }

    // Total de usuarios (usando el nuevo campo deletedAt)
    const [totalUsersResult] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM users WHERE deletedAt IS NULL'
    );

    // Usuarios activos (usando status = 'active' y login en últimos 30 días)
    const [activeUsersResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM users 
       WHERE lastLogin > DATE_SUB(NOW(), INTERVAL 30 DAY) 
       AND status = 'active' 
       AND deletedAt IS NULL`
    );

    // Usar contadores de la tabla users (más eficiente)
    const [totalMediaResult] = await pool.query<RowDataPacket[]>(
      'SELECT SUM(imageCount) as totalImages, SUM(videoCount) as totalVideos FROM users WHERE deletedAt IS NULL'
    );

    // Almacenamiento usado (directo de la tabla users)
    const [storageResult] = await pool.query<RowDataPacket[]>(
      'SELECT SUM(storageUsed) as usedBytes FROM users WHERE deletedAt IS NULL'
    );

    // Subidas de hoy
    const [todayUploadsResult] = await pool.query<RowDataPacket[]>(
      `SELECT 
        (SELECT COUNT(*) FROM images WHERE DATE(createdAt) = CURDATE() AND deletedAt IS NULL) +
        (SELECT COUNT(*) FROM videos WHERE DATE(createdAt) = CURDATE() AND deletedAt IS NULL) as count`
    );

    const totalUsers = totalUsersResult[0].count;
    const activeUsers = activeUsersResult[0].count;
    const totalImages = totalMediaResult[0].totalImages || 0;
    const totalVideos = totalMediaResult[0].totalVideos || 0;
    const usedStorageGB = bytesToGB(storageResult[0].usedBytes || 0);
    const totalStorageGB = 1000; // 1TB por defecto
    const uploadsToday = todayUploadsResult[0].count;

    const statsData = {
      totalUsers,
      activeUsers,
      totalImages,
      totalVideos,
      uploadsToday,
      usedStorageGB,
      totalStorageGB
    };

    const stats: AdminStats = {
      totalUsers,
      activeUsers,
      totalStorage: totalStorageGB,
      usedStorage: usedStorageGB,
      totalImages,
      totalVideos,
      uploadsToday,
      systemHealth: calculateSystemHealth(statsData)
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas de admin:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas del sistema'
    });
  }
};

// ============================================================================
// 👥 GESTIÓN DE USUARIOS
// ============================================================================

/**
 * Obtener lista de todos los usuarios
 * GET /api/admin/users
 */
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!verifyAdmin(req)) {
      res.status(403).json({
        success: false,
        error: 'Acceso denegado - Se requiere rol de administrador'
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const searchTerm = req.query.search as string || '';

    let query = `
      SELECT 
        u.userId,
        u.username,
        u.email,
        u.role,
        u.status,
        u.storageLimit,
        u.storageUsed,
        u.imageCount as totalImages,
        u.videoCount as totalVideos,
        u.lastLogin,
        u.createdAt
      FROM users u
      WHERE u.deletedAt IS NULL
    `;

    const params: any[] = [];

    if (searchTerm) {
      query += ` AND (u.username LIKE ? OR u.email LIKE ?)`;
      params.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }

    query += ` ORDER BY u.createdAt DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [users] = await pool.query<RowDataPacket[]>(query, params);

    // Contar total de usuarios
    let countQuery = `SELECT COUNT(*) as total FROM users WHERE deletedAt IS NULL`;
    const countParams: any[] = [];

    if (searchTerm) {
      countQuery += ` AND (username LIKE ? OR email LIKE ?)`;
      countParams.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }

    const [countResult] = await pool.query<RowDataPacket[]>(countQuery, countParams);
    const total = countResult[0].total;

    const formattedUsers = users.map(user => ({
      id: user.userId.toString(),
      userId: user.userId,
      username: user.username,
      email: user.email,
      role: user.role || 'user',
      status: user.status || 'active',
      totalImages: user.totalImages || 0,
      totalVideos: user.totalVideos || 0,
      storageUsed: bytesToGB(user.storageUsed || 0),
      storageLimit: bytesToGB(user.storageLimit || 5368709120), // 5GB default
      lastLogin: user.lastLogin,
      createdAt: user.createdAt
    }));

    res.json({
      success: true,
      data: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener lista de usuarios'
    });
  }
};

/**
 * Obtener detalles de un usuario específico
 * GET /api/admin/users/:id
 */
export const getUserDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!verifyAdmin(req)) {
      res.status(403).json({
        success: false,
        error: 'Acceso denegado - Se requiere rol de administrador'
      });
      return;
    }

    const userId = parseInt(req.params.id);

    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT 
        u.*,
        u.imageCount as totalImages,
        u.videoCount as totalVideos
       FROM users u
       WHERE u.userId = ? AND u.deletedAt IS NULL`,
      [userId]
    );

    if (users.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
      return;
    }

    const user = users[0];
    const userDetail: UserDetail = {
      userId: user.userId,
      username: user.username,
      email: user.email,
      role: user.role || 'user',
      status: user.status || 'active',
      totalImages: user.totalImages || 0,
      totalVideos: user.totalVideos || 0,
      storageUsed: bytesToGB(user.storageUsed || 0),
      storageLimit: bytesToGB(user.storageLimit || 5368709120),
      lastLogin: user.lastLogin,
      createdAt: user.createdAt
    };

    res.json({
      success: true,
      data: userDetail
    });
  } catch (error) {
    console.error('Error obteniendo detalles del usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener detalles del usuario'
    });
  }
};

/**
 * Suspender/Activar un usuario
 * POST /api/admin/users/:id/suspend
 */
export const toggleUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!verifyAdmin(req)) {
      res.status(403).json({
        success: false,
        error: 'Acceso denegado - Se requiere rol de administrador'
      });
      return;
    }

    const userId = parseInt(req.params.id);
    const currentUserId = (req as any).user.userId;

    // No permitir suspenderse a sí mismo
    if (userId === currentUserId) {
      res.status(400).json({
        success: false,
        error: 'No puedes suspender tu propia cuenta'
      });
      return;
    }

    // Obtener estado actual
    const [users] = await pool.query<RowDataPacket[]>(
      'SELECT status FROM users WHERE userId = ? AND deletedAt IS NULL',
      [userId]
    );

    if (users.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
      return;
    }

    const currentStatus = users[0].status || 'active';
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';

    await pool.query<ResultSetHeader>(
      'UPDATE users SET status = ? WHERE userId = ?',
      [newStatus, userId]
    );

    res.json({
      success: true,
      message: `Usuario ${newStatus === 'suspended' ? 'suspendido' : 'activado'} exitosamente`,
      data: {
        userId,
        status: newStatus
      }
    });
  } catch (error) {
    console.error('Error suspendiendo usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cambiar estado del usuario'
    });
  }
};

/**
 * Actualizar límite de almacenamiento de un usuario
 * PUT /api/admin/users/:id/storage
 */
export const updateUserStorage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!verifyAdmin(req)) {
      res.status(403).json({
        success: false,
        error: 'Acceso denegado - Se requiere rol de administrador'
      });
      return;
    }

    const userId = parseInt(req.params.id);
    const { storageLimit } = req.body;

    if (!storageLimit || storageLimit < 1) {
      res.status(400).json({
        success: false,
        error: 'Límite de almacenamiento inválido'
      });
      return;
    }

    // Convertir GB a bytes
    const storageLimitBytes = storageLimit * 1024 * 1024 * 1024;

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE users SET storageLimit = ? WHERE userId = ? AND deletedAt IS NULL',
      [storageLimitBytes, userId]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Límite de almacenamiento actualizado',
      data: {
        userId,
        storageLimit
      }
    });
  } catch (error) {
    console.error('Error actualizando almacenamiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar límite de almacenamiento'
    });
  }
};

/**
 * Eliminar un usuario (soft delete)
 * DELETE /api/admin/users/:id
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  const connection = await pool.getConnection();
  
  try {
    if (!verifyAdmin(req)) {
      res.status(403).json({
        success: false,
        error: 'Acceso denegado - Se requiere rol de administrador'
      });
      return;
    }

    const userId = parseInt(req.params.id);
    const currentUserId = (req as any).user.userId;

    // No permitir eliminarse a sí mismo
    if (userId === currentUserId) {
      res.status(400).json({
        success: false,
        error: 'No puedes eliminar tu propia cuenta'
      });
      return;
    }

    await connection.beginTransaction();

    // Soft delete de imágenes del usuario
    await connection.query(
      'UPDATE images SET deletedAt = NOW() WHERE userId = ? AND deletedAt IS NULL',
      [userId]
    );

    // Soft delete de videos del usuario
    await connection.query(
      'UPDATE videos SET deletedAt = NOW() WHERE userId = ? AND deletedAt IS NULL',
      [userId]
    );

    // Soft delete del usuario
    const [result] = await connection.query<ResultSetHeader>(
      'UPDATE users SET deletedAt = NOW(), status = ? WHERE userId = ? AND deletedAt IS NULL',
      ['inactive', userId]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
      return;
    }

    await connection.commit();

    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente',
      data: { userId }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error eliminando usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar usuario'
    });
  } finally {
    connection.release();
  }
};

// ============================================================================
// 📤 EXPORTACIÓN DE DATOS
// ============================================================================

/**
 * Exportar datos del sistema a CSV
 * GET /api/admin/export
 */
export const exportData = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!verifyAdmin(req)) {
      res.status(403).json({
        success: false,
        error: 'Acceso denegado - Se requiere rol de administrador'
      });
      return;
    }

    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT 
        u.userId,
        u.username,
        u.email,
        u.role,
        u.status,
        u.createdAt,
        u.lastLogin,
        u.imageCount as totalImages,
        u.videoCount as totalVideos,
        u.storageUsed
       FROM users u
       WHERE u.deletedAt IS NULL
       ORDER BY u.createdAt DESC`
    );

    // Crear CSV
    let csv = 'ID,Usuario,Email,Rol,Estado,Fecha Registro,Último Acceso,Imágenes,Videos,Almacenamiento (GB)\n';
    
    users.forEach(row => {
      const storageGB = bytesToGB(row.storageUsed || 0);
      const lastLogin = row.lastLogin || 'Nunca';
      csv += `${row.userId},"${row.username}","${row.email}",${row.role || 'user'},${row.status || 'active'},${row.createdAt},${lastLogin},${row.totalImages || 0},${row.totalVideos || 0},${storageGB}\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=nuvia-users-export-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exportando datos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al exportar datos'
    });
  }
};

// ============================================================================
// 🔍 BÚSQUEDA Y ACTIVIDAD
// ============================================================================

/**
 * Buscar en el sistema (usuarios, imágenes, videos)
 * GET /api/admin/search?q=term&type=users|images|videos
 */
export const searchSystem = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!verifyAdmin(req)) {
      res.status(403).json({
        success: false,
        error: 'Acceso denegado - Se requiere rol de administrador'
      });
      return;
    }

    const searchTerm = req.query.q as string;
    const searchType = req.query.type as string;

    if (!searchTerm || searchTerm.length < 2) {
      res.status(400).json({
        success: false,
        error: 'La búsqueda debe tener al menos 2 caracteres'
      });
      return;
    }

    const results: any = {
      users: [],
      images: [],
      videos: []
    };

    const pattern = `%${searchTerm}%`;

    // Buscar usuarios
    if (!searchType || searchType === 'users') {
      const [users] = await pool.query<RowDataPacket[]>(
        `SELECT userId, username, email, role, status 
         FROM users 
         WHERE (username LIKE ? OR email LIKE ?) AND deletedAt IS NULL
         LIMIT 20`,
        [pattern, pattern]
      );
      results.users = users;
    }

    // Buscar imágenes
    if (!searchType || searchType === 'images') {
      const [images] = await pool.query<RowDataPacket[]>(
        `SELECT i.imageId, i.title, i.filename, i.createdAt, u.username 
         FROM images i
         JOIN users u ON i.userId = u.userId
         WHERE (i.title LIKE ? OR i.filename LIKE ? OR i.originalFilename LIKE ?) 
         AND i.deletedAt IS NULL
         LIMIT 20`,
        [pattern, pattern, pattern]
      );
      results.images = images;
    }

    // Buscar videos
    if (!searchType || searchType === 'videos') {
      const [videos] = await pool.query<RowDataPacket[]>(
        `SELECT v.videoId, v.title, v.filename, v.createdAt, u.username 
         FROM videos v
         JOIN users u ON v.userId = u.userId
         WHERE (v.title LIKE ? OR v.filename LIKE ? OR v.originalFilename LIKE ?) 
         AND v.deletedAt IS NULL
         LIMIT 20`,
        [pattern, pattern, pattern]
      );
      results.videos = videos;
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error en búsqueda:', error);
    res.status(500).json({
      success: false,
      error: 'Error al realizar la búsqueda'
    });
  }
};

/**
 * Obtener actividad reciente del sistema
 * GET /api/admin/activity
 */
export const getSystemActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!verifyAdmin(req)) {
      res.status(403).json({
        success: false,
        error: 'Acceso denegado - Se requiere rol de administrador'
      });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 50;

    const [activity] = await pool.query<RowDataPacket[]>(
      `(SELECT 
        'image' as type,
        i.imageId as id,
        i.filename,
        u.username,
        i.createdAt
       FROM images i
       JOIN users u ON i.userId = u.userId
       WHERE i.deletedAt IS NULL)
       UNION ALL
       (SELECT 
        'video' as type,
        v.videoId as id,
        v.filename,
        u.username,
        v.createdAt
       FROM videos v
       JOIN users u ON v.userId = u.userId
       WHERE v.deletedAt IS NULL)
       ORDER BY createdAt DESC
       LIMIT ?`,
      [limit]
    );

    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Error obteniendo actividad:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener actividad del sistema'
    });
  }
};