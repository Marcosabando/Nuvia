// src/services/admin.service.ts
import { Request, Response } from "express";
import prisma from "../lib/prisma";

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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const verifyAdmin = (req: Request): boolean => {
  const user = req.user as { role: string } | undefined;
  return !!(user && user.role === "admin");
};

const bytesToGB = (bytes: bigint | null | undefined): number => {
  if (bytes === null || bytes === undefined) return 0;
  return parseFloat((Number(bytes) / (1024 * 1024 * 1024)).toFixed(2));
};

const calculateSystemHealth = (stats: any): number => {
  const storageHealth =
    stats.totalStorageGB > 0 ? ((stats.totalStorageGB - stats.usedStorageGB) / stats.totalStorageGB) * 50 : 0;

  const userActivityHealth = stats.totalUsers > 0 ? (stats.activeUsers / stats.totalUsers) * 30 : 30;

  const activityHealth = stats.uploadsToday > 0 ? 20 : 10;

  return Math.min(100, Math.max(0, Math.round(storageHealth + userActivityHealth + activityHealth)));
};

// ============================================================================
// 📊 ESTADÍSTICAS GLOBALES
// ============================================================================

export const getAdminStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!verifyAdmin(req)) {
      res.status(403).json({
        success: false,
        error: "Acceso denegado - Se requiere rol de administrador",
      });
      return;
    }

    const totalUsers = await prisma.users.count({
      where: { deletedAt: null },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeUsers = await prisma.users.count({
      where: {
        deletedAt: null,
        status: "active",
        lastLogin: { gt: thirtyDaysAgo },
      },
    });

    const totalImages = await prisma.images.count({
      where: { deletedAt: null },
    });

    const totalVideos = await prisma.videos.count({
      where: { deletedAt: null },
    });

    const storageResult = await prisma.users.aggregate({
      where: { deletedAt: null },
      _sum: { storageUsed: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayImages = await prisma.images.count({
      where: {
        deletedAt: null,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    const todayVideos = await prisma.videos.count({
      where: {
        deletedAt: null,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    const usedStorageGB = bytesToGB(storageResult._sum.storageUsed);
    const totalStorageGB = 1000;
    const uploadsToday = todayImages + todayVideos;

    const statsData = {
      totalUsers,
      activeUsers,
      totalImages,
      totalVideos,
      uploadsToday,
      usedStorageGB,
      totalStorageGB,
    };

    const stats: AdminStats = {
      totalUsers,
      activeUsers,
      totalStorage: totalStorageGB,
      usedStorage: usedStorageGB,
      totalImages,
      totalVideos,
      uploadsToday,
      systemHealth: calculateSystemHealth(statsData),
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error al obtener estadísticas del sistema",
    });
  }
};

// ============================================================================
// 👥 GESTIÓN DE USUARIOS
// ============================================================================

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!verifyAdmin(req)) {
      res.status(403).json({
        success: false,
        error: "Acceso denegado - Se requiere rol de administrador",
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const searchTerm = (req.query.search as string) || "";

    const where: any = {
      deletedAt: null,
    };

    if (searchTerm) {
      where.OR = [{ username: { contains: searchTerm } }, { email: { contains: searchTerm } }];
    }

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
      orderBy: { createdAt: "desc" },
    });

    const usersWithCounts = await Promise.all(
      users.map(async (user) => {
        const [imageCount, videoCount] = await Promise.all([
          prisma.images.count({
            where: {
              userId: user.userId,
              deletedAt: null,
            },
          }),
          prisma.videos.count({
            where: {
              userId: user.userId,
              deletedAt: null,
            },
          }),
        ]);

        return {
          ...user,
          imageCount,
          videoCount,
        };
      })
    );

    const total = await prisma.users.count({ where });

    const formattedUsers = usersWithCounts.map((user) => ({
      id: user.userId.toString(),
      userId: user.userId,
      username: user.username,
      email: user.email,
      role: user.role || "user",
      status: user.status || "active",
      totalImages: user.imageCount || 0,
      totalVideos: user.videoCount || 0,
      storageUsed: bytesToGB(user.storageUsed),
      storageLimit: bytesToGB(user.storageLimit),
      lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
      createdAt: user.createdAt ? user.createdAt.toISOString() : "N/A",
    }));

    res.json({
      success: true,
      data: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error al obtener lista de usuarios",
    });
  }
};

export const getUserDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!verifyAdmin(req)) {
      res.status(403).json({
        success: false,
        error: "Acceso denegado - Se requiere rol de administrador",
      });
      return;
    }

    const userId = parseInt(req.params.id);

    const user = await prisma.users.findFirst({
      where: {
        userId: userId,
        deletedAt: null,
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: "Usuario no encontrado",
      });
      return;
    }

    const [imageCount, videoCount] = await Promise.all([
      prisma.images.count({
        where: {
          userId: user.userId,
          deletedAt: null,
        },
      }),
      prisma.videos.count({
        where: {
          userId: user.userId,
          deletedAt: null,
        },
      }),
    ]);

    const userDetail = {
      userId: user.userId,
      username: user.username,
      email: user.email,
      role: user.role || "user",
      status: user.status || "active",
      totalImages: imageCount,
      totalVideos: videoCount,
      storageUsed: bytesToGB(user.storageUsed),
      storageLimit: bytesToGB(user.storageLimit),
      lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
      createdAt: user.createdAt ? user.createdAt.toISOString() : "N/A",
    };

    res.json({
      success: true,
      data: userDetail,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error al obtener detalles del usuario",
    });
  }
};

export const toggleUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!verifyAdmin(req)) {
      res.status(403).json({
        success: false,
        error: "Acceso denegado - Se requiere rol de administrador",
      });
      return;
    }

    const userId = parseInt(req.params.id);
    const currentUserId = req.user?.userId;

    if (userId === currentUserId) {
      res.status(400).json({
        success: false,
        error: "No puedes suspender tu propia cuenta",
      });
      return;
    }

    const user = await prisma.users.findFirst({
      where: {
        userId: userId,
        deletedAt: null,
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: "Usuario no encontrado",
      });
      return;
    }

    const currentStatus = user.status || "active";
    const newStatus = currentStatus === "active" ? "suspended" : "active";

    await prisma.users.update({
      where: { userId: userId },
      data: { status: newStatus },
    });

    res.json({
      success: true,
      message: `Usuario ${newStatus === "suspended" ? "suspendido" : "activado"} exitosamente`,
      data: {
        userId,
        status: newStatus,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error al cambiar estado del usuario",
    });
  }
};

export const updateUserStorage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!verifyAdmin(req)) {
      res.status(403).json({
        success: false,
        error: "Acceso denegado - Se requiere rol de administrador",
      });
      return;
    }

    const userId = parseInt(req.params.id);
    const { storageLimit } = req.body;

    if (!storageLimit || storageLimit < 1) {
      res.status(400).json({
        success: false,
        error: "Límite de almacenamiento inválido",
      });
      return;
    }

    const storageLimitBytes = BigInt(storageLimit) * BigInt(1024 * 1024 * 1024);

    const result = await prisma.users.updateMany({
      where: {
        userId: userId,
        deletedAt: null,
      },
      data: { storageLimit: storageLimitBytes },
    });

    if (result.count === 0) {
      res.status(404).json({
        success: false,
        error: "Usuario no encontrado",
      });
      return;
    }

    res.json({
      success: true,
      message: "Límite de almacenamiento actualizado",
      data: {
        userId,
        storageLimit,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error al actualizar límite de almacenamiento",
    });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!verifyAdmin(req)) {
      res.status(403).json({
        success: false,
        error: "Acceso denegado - Se requiere rol de administrador",
      });
      return;
    }

    const userId = parseInt(req.params.id);
    const currentUserId = req.user?.userId;

    if (userId === currentUserId) {
      res.status(400).json({
        success: false,
        error: "No puedes eliminar tu propia cuenta",
      });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.images.updateMany({
        where: { userId: userId },
        data: { deletedAt: new Date() },
      });

      await tx.videos.updateMany({
        where: { userId: userId },
        data: { deletedAt: new Date() },
      });

      await tx.users.update({
        where: { userId: userId },
        data: {
          deletedAt: new Date(),
          status: "inactive",
        },
      });
    });

    res.json({
      success: true,
      message: "Usuario eliminado exitosamente",
      data: { userId },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error al eliminar usuario",
    });
  }
};

// ============================================================================
// 📤 EXPORTACIÓN DE DATOS
// ============================================================================

export const exportData = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!verifyAdmin(req)) {
      res.status(403).json({
        success: false,
        error: "Acceso denegado - Se requiere rol de administrador",
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
        storageUsed: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const usersWithCounts = await Promise.all(
      users.map(async (user) => {
        const [imageCount, videoCount] = await Promise.all([
          prisma.images.count({
            where: {
              userId: user.userId,
              deletedAt: null,
            },
          }),
          prisma.videos.count({
            where: {
              userId: user.userId,
              deletedAt: null,
            },
          }),
        ]);

        return {
          ...user,
          imageCount,
          videoCount,
        };
      })
    );

    let csv = "ID,Usuario,Email,Rol,Estado,Fecha Registro,Último Acceso,Imágenes,Videos,Almacenamiento (GB)\n";

    usersWithCounts.forEach((user) => {
      const storageGB = bytesToGB(user.storageUsed);
      const lastLogin = user.lastLogin ? user.lastLogin.toISOString() : "Nunca";
      const createdAt = user.createdAt ? user.createdAt.toISOString() : "N/A";
      csv += `${user.userId},"${user.username}","${user.email}",${user.role || "user"},${
        user.status || "active"
      },${createdAt},${lastLogin},${user.imageCount || 0},${user.videoCount || 0},${storageGB}\n`;
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=nuvia-users-export-${new Date().toISOString().split("T")[0]}.csv`
    );
    res.send(csv);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error al exportar datos",
    });
  }
};

// ============================================================================
// 🔍 BÚSQUEDA Y ACTIVIDAD
// ============================================================================

export const searchSystem = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!verifyAdmin(req)) {
      res.status(403).json({
        success: false,
        error: "Acceso denegado - Se requiere rol de administrador",
      });
      return;
    }

    const searchTerm = req.query.q as string;
    const searchType = req.query.type as string;

    if (!searchTerm || searchTerm.length < 2) {
      res.status(400).json({
        success: false,
        error: "La búsqueda debe tener al menos 2 caracteres",
      });
      return;
    }

    const results: any = {
      users: [],
      images: [],
      videos: [],
    };

    if (!searchType || searchType === "users") {
      const users = await prisma.users.findMany({
        where: {
          deletedAt: null,
          OR: [{ username: { contains: searchTerm } }, { email: { contains: searchTerm } }],
        },
        select: {
          userId: true,
          username: true,
          email: true,
          role: true,
          status: true,
        },
        take: 20,
      });
      results.users = users;
    }

    if (!searchType || searchType === "images") {
      const images = await prisma.images.findMany({
        where: {
          deletedAt: null,
          OR: [
            { title: { contains: searchTerm } },
            { filename: { contains: searchTerm } },
            { originalFilename: { contains: searchTerm } },
          ],
        },
        include: {
          users: {
            select: {
              username: true,
            },
          },
        },
        take: 20,
      });

      results.images = images.map((img) => ({
        imageId: img.imageId,
        title: img.title,
        filename: img.filename,
        createdAt: img.createdAt,
        username: img.users.username,
      }));
    }

    if (!searchType || searchType === "videos") {
      const videos = await prisma.videos.findMany({
        where: {
          deletedAt: null,
          OR: [
            { title: { contains: searchTerm } },
            { filename: { contains: searchTerm } },
            { originalFilename: { contains: searchTerm } },
          ],
        },
        include: {
          users: {
            select: {
              username: true,
            },
          },
        },
        take: 20,
      });

      results.videos = videos.map((vid) => ({
        videoId: vid.videoId,
        title: vid.title,
        filename: vid.filename,
        createdAt: vid.createdAt,
        username: vid.users.username,
      }));
    }

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error al realizar la búsqueda",
    });
  }
};

export const getSystemActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!verifyAdmin(req)) {
      res.status(403).json({
        success: false,
        error: "Acceso denegado - Se requiere rol de administrador",
      });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 50;

    const images = await prisma.images.findMany({
      where: { deletedAt: null },
      select: {
        imageId: true,
        filename: true,
        createdAt: true,
        users: {
          select: {
            username: true,
          },
        },
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const videos = await prisma.videos.findMany({
      where: { deletedAt: null },
      select: {
        videoId: true,
        filename: true,
        createdAt: true,
        users: {
          select: {
            username: true,
          },
        },
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const activity = [
      ...images.map((img) => ({
        type: "image",
        id: img.imageId,
        filename: img.filename,
        username: img.users.username,
        createdAt: img.createdAt,
      })),
      ...videos.map((vid) => ({
        type: "video",
        id: vid.videoId,
        filename: vid.filename,
        username: vid.users.username,
        createdAt: vid.createdAt,
      })),
    ]
      .sort((a, b) => {
        const timeA = a.createdAt?.getTime() || 0;
        const timeB = b.createdAt?.getTime() || 0;
        return timeB - timeA;
      })
      .slice(0, limit);

    res.json({
      success: true,
      data: activity,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error al obtener actividad del sistema",
    });
  }
};