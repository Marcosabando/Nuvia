// src/services/admin.service.ts
import { Request, Response } from "express";
import prisma from '../lib/prisma'; // ✅ Instancia única

// ============================================================================
// INTERFACES ACTUALIZADAS
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

// Interfaces específicas para los tipos de Prisma
interface UserWithCounts {
  userId: number;
  username: string;
  email: string;
  role: string;
  status: string;
  createdAt: Date | null;
  lastLogin: Date | null;
  storageUsed: bigint | null;
  storageLimit: bigint | null;
  imageCount?: number | null;
  videoCount?: number | null;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Verificar si el usuario es administrador
 */
const verifyAdmin = (req: Request): boolean => {
  const user = req.user as { role: string } | undefined;
  return !!(user && user.role === 'admin');
};

/**
 * Convertir bytes a GB
 */
const bytesToGB = (bytes: bigint | null | undefined): number => {
  if (bytes === null || bytes === undefined) return 0;
  return parseFloat((Number(bytes) / (1024 * 1024 * 1024)).toFixed(2));
};

/**
 * Calcular salud del sistema basada en múltiples factores
 */
const calculateSystemHealth = (stats: any): number => {
  // Factor 1: Uso de almacenamiento (50% del score)
  const storageHealth = stats.totalStorageGB > 0 
    ? ((stats.totalStorageGB - stats.usedStorageGB) / stats.totalStorageGB) * 50 
    : 0;
  
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

    // Total de usuarios
    const totalUsers = await prisma.users.count({
      where: { deletedAt: null }
    });

    // Usuarios activos (login en últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeUsers = await prisma.users.count({
      where: {
        deletedAt: null,
        status: 'active',
        lastLogin: { gt: thirtyDaysAgo }
      }
    });

    // Total de imágenes y videos (contando directamente desde las tablas)
    const totalImages = await prisma.images.count({
      where: { deletedAt: null }
    });

    const totalVideos = await prisma.videos.count({
      where: { deletedAt: null }
    });

    // Almacenamiento usado
    const storageResult = await prisma.users.aggregate({
      where: { deletedAt: null },
      _sum: { storageUsed: true }
    });

    // Subidas de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayImages = await prisma.images.count({
      where: {
        deletedAt: null,
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    const todayVideos = await prisma.videos.count({
      where: {
        deletedAt: null,
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    const usedStorageGB = bytesToGB(storageResult._sum.storageUsed);
    const totalStorageGB = 1000; // 1TB por defecto
    const uploadsToday = todayImages + todayVideos;

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

    // Construir condiciones de búsqueda
    const where: any = {
      deletedAt: null,
    };

    if (searchTerm) {
      where.OR = [
        { username: { contains: searchTerm } },
        { email: { contains: searchTerm } }
      ];
    }

    // Obtener usuarios con conteos reales de imágenes y videos
    const users = await prisma.users.findMany({
      where,
      select: {
        userId: true,
        username: true,
        email: true,
        role: true,
        status: true,
        storageLimit: true,
        storageUsed: true,
        lastLogin: true,
        createdAt: true,
      },
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    // Obtener conteos reales para cada usuario
    const usersWithCounts = await Promise.all(
      users.map(async (user) => {
        const [imageCount, videoCount] = await Promise.all([
          prisma.images.count({
            where: { 
              userId: user.userId,
              deletedAt: null 
            }
          }),
          prisma.videos.count({
            where: { 
              userId: user.userId,
              deletedAt: null 
            }
          })
        ]);

        return {
          ...user,
          imageCount,
          videoCount
        };
      })
    );

    // Contar total de usuarios
    const total = await prisma.users.count({ where });

    const formattedUsers = usersWithCounts.map((user) => ({
      id: user.userId.toString(),
      userId: user.userId,
      username: user.username,
      email: user.email,
      role: user.role || 'user',
      status: user.status || 'active',
      totalImages: user.imageCount || 0,
      totalVideos: user.videoCount || 0,
      storageUsed: bytesToGB(user.storageUsed),
      storageLimit: bytesToGB(user.storageLimit),
      lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
      createdAt: user.createdAt ? user.createdAt.toISOString() : 'N/A'
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

    const user = await prisma.users.findFirst({
      where: {
        userId: userId,
        deletedAt: null
      }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
      return;
    }

    // Obtener conteos reales
    const [imageCount, videoCount] = await Promise.all([
      prisma.images.count({
        where: { 
          userId: user.userId,
          deletedAt: null 
        }
      }),
      prisma.videos.count({
        where: { 
          userId: user.userId,
          deletedAt: null 
        }
      })
    ]);

    const userDetail = {
      userId: user.userId,
      username: user.username,
      email: user.email,
      role: user.role || 'user',
      status: user.status || 'active',
      totalImages: imageCount,
      totalVideos: videoCount,
      storageUsed: bytesToGB(user.storageUsed),
      storageLimit: bytesToGB(user.storageLimit),
      lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
      createdAt: user.createdAt ? user.createdAt.toISOString() : 'N/A'
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
    const currentUserId = req.user?.userId;

    // No permitir suspenderse a sí mismo
    if (userId === currentUserId) {
      res.status(400).json({
        success: false,
        error: 'No puedes suspender tu propia cuenta'
      });
      return;
    }

    // Obtener estado actual
    const user = await prisma.users.findFirst({
      where: {
        userId: userId,
        deletedAt: null
      }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
      return;
    }

    const currentStatus = user.status || 'active';
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';

    await prisma.users.update({
      where: { userId: userId },
      data: { status: newStatus }
    });

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
    const storageLimitBytes = BigInt(storageLimit) * BigInt(1024 * 1024 * 1024);

    const result = await prisma.users.updateMany({
      where: {
        userId: userId,
        deletedAt: null
      },
      data: { storageLimit: storageLimitBytes }
    });

    if (result.count === 0) {
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
  try {
    if (!verifyAdmin(req)) {
      res.status(403).json({
        success: false,
        error: 'Acceso denegado - Se requiere rol de administrador'
      });
      return;
    }

    const userId = parseInt(req.params.id);
    const currentUserId = req.user?.userId;

    // No permitir eliminarse a sí mismo
    if (userId === currentUserId) {
      res.status(400).json({
        success: false,
        error: 'No puedes eliminar tu propia cuenta'
      });
      return;
    }

    // Soft delete de imágenes del usuario
    await prisma.images.updateMany({
      where: { 
        userId: userId,
        deletedAt: null 
      },
      data: { deletedAt: new Date() }
    });

    // Soft delete de videos del usuario
    await prisma.videos.updateMany({
      where: { 
        userId: userId,
        deletedAt: null 
      },
      data: { deletedAt: new Date() }
    });

    // Soft delete del usuario
    const result = await prisma.users.updateMany({
      where: { 
        userId: userId,
        deletedAt: null 
      },
      data: { 
        deletedAt: new Date(),
        status: 'inactive' 
      }
    });

    if (result.count === 0) {
      res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente',
      data: { userId }
    });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar usuario'
    });
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

    const users = await prisma.users.findMany({
      where: { deletedAt: null },
      select: {
        userId: true,
        username: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        lastLogin: true,
        storageUsed: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Obtener conteos reales para cada usuario
    const usersWithCounts = await Promise.all(
      users.map(async (user) => {
        const [imageCount, videoCount] = await Promise.all([
          prisma.images.count({
            where: { 
              userId: user.userId,
              deletedAt: null 
            }
          }),
          prisma.videos.count({
            where: { 
              userId: user.userId,
              deletedAt: null 
            }
          })
        ]);

        return {
          ...user,
          imageCount,
          videoCount
        };
      })
    );

    // Crear CSV
    let csv = 'ID,Usuario,Email,Rol,Estado,Fecha Registro,Último Acceso,Imágenes,Videos,Almacenamiento (GB)\n';
    
    usersWithCounts.forEach((user) => {
      const storageGB = bytesToGB(user.storageUsed);
      const lastLogin = user.lastLogin ? user.lastLogin.toISOString() : 'Nunca';
      const createdAt = user.createdAt ? user.createdAt.toISOString() : 'N/A';
      csv += `${user.userId},"${user.username}","${user.email}",${user.role || 'user'},${user.status || 'active'},${createdAt},${lastLogin},${user.imageCount || 0},${user.videoCount || 0},${storageGB}\n`;
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

    // Buscar usuarios
    if (!searchType || searchType === 'users') {
      const users = await prisma.users.findMany({
        where: {
          deletedAt: null,
          OR: [
            { username: { contains: searchTerm } },
            { email: { contains: searchTerm } }
          ]
        },
        select: {
          userId: true,
          username: true,
          email: true,
          role: true,
          status: true
        },
        take: 20
      });
      results.users = users;
    }

    // Buscar imágenes
    if (!searchType || searchType === 'images') {
      const images = await prisma.images.findMany({
        where: {
          deletedAt: null,
          OR: [
            { title: { contains: searchTerm } },
            { filename: { contains: searchTerm } },
            { originalFilename: { contains: searchTerm } }
          ]
        },
        include: {
          users: {
            select: {
              username: true
            }
          }
        },
        take: 20
      });
      
      results.images = images.map((img) => ({
        imageId: img.imageId,
        title: img.title,
        filename: img.filename,
        createdAt: img.createdAt,
        username: img.users.username
      }));
    }

    // Buscar videos
    if (!searchType || searchType === 'videos') {
      const videos = await prisma.videos.findMany({
        where: {
          deletedAt: null,
          OR: [
            { title: { contains: searchTerm } },
            { filename: { contains: searchTerm } },
            { originalFilename: { contains: searchTerm } }
          ]
        },
        include: {
          users: {
            select: {
              username: true
            }
          }
        },
        take: 20
      });
      
      results.videos = videos.map((vid) => ({
        videoId: vid.videoId,
        title: vid.title,
        filename: vid.filename,
        createdAt: vid.createdAt,
        username: vid.users.username
      }));
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

    // Obtener imágenes recientes
    const images = await prisma.images.findMany({
      where: { deletedAt: null },
      select: {
        imageId: true,
        filename: true,
        createdAt: true,
        users: {
          select: {
            username: true
          }
        }
      },
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    // Obtener videos recientes
    const videos = await prisma.videos.findMany({
      where: { deletedAt: null },
      select: {
        videoId: true,
        filename: true,
        createdAt: true,
        users: {
          select: {
            username: true
          }
        }
      },
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    // Combinar y ordenar
    const activity = [
      ...images.map((img) => ({
        type: 'image',
        id: img.imageId,
        filename: img.filename,
        username: img.users.username,
        createdAt: img.createdAt
      })),
      ...videos.map((vid) => ({
        type: 'video',
        id: vid.videoId,
        filename: vid.filename,
        username: vid.users.username,
        createdAt: vid.createdAt
      }))
    ]
    .sort((a, b) => {
      const timeA = a.createdAt?.getTime() || 0;
      const timeB = b.createdAt?.getTime() || 0;
      return timeB - timeA;
    })
    .slice(0, limit);

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