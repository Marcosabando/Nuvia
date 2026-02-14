// src/services/profile.service.ts
import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import path from 'path';
import fs from 'fs';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const safeBigIntToNumber = (value: bigint | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  return Number(value);
};

// ============================================================================
// 👤 OBTENER PERFIL
// ============================================================================

export const getUserProfile = async (req: Request, res: Response) => {
  try {
     console.log('🔍 [ProfileService.getUserProfile] Iniciando');
    const userId = req.user?.userId;
    
    if (!userId) {
      console.log('❌ [ProfileService.getUserProfile] No hay userId en el request');
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    console.log(`🔍 [ProfileService.getUserProfile] Buscando usuario con ID: ${userId}`);

    const user = await prisma.users.findFirst({
      where: {
        userId: userId,
        deletedAt: null
      },
      select: {
        userId: true,
        username: true,
        email: true,
        profileImagePath: true,
        bio: true,
        location: true,
        role: true,
        status: true,
        emailVerified: true,
        storageUsed: true,
        storageLimit: true,
        createdAt: true,
        lastLogin: true,
        updatedAt: true
      }
    });

    if (!user) {
      console.log(`❌ [ProfileService.getUserProfile] Usuario con ID ${userId} no encontrado`);
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const [imageCount, videoCount, albumCount, documentCount] = await Promise.all([
      prisma.images.count({
        where: { 
          userId: userId,
          deletedAt: null 
        }
      }),
      prisma.videos.count({
        where: { 
          userId: userId,
          deletedAt: null 
        }
      }),
      prisma.albums.count({
        where: { 
          userId: userId,
          deletedAt: null 
        }
      }),
      prisma.documents.count({
        where: { 
          userId: userId,
          deletedAt: null 
        }
      })
    ]);

    const totalMediaCount = imageCount + videoCount + documentCount;
    
    const storageUsed = safeBigIntToNumber(user.storageUsed);
    const storageLimit = safeBigIntToNumber(user.storageLimit);
    
    const storagePercentage = storageLimit > 0 
      ? Math.round((storageUsed / storageLimit) * 100)
      : 0;

    const userProfile = {
      ...user,
      storageUsed: storageUsed,
      storageLimit: storageLimit,
      imageCount,
      videoCount,
      albumCount,
      documentCount,
      totalMediaCount,
      storagePercentage,
      storageUsedFormatted: `${(storageUsed / (1024 * 1024 * 1024)).toFixed(2)} GB`,
      storageLimitFormatted: `${(storageLimit / (1024 * 1024 * 1024)).toFixed(2)} GB`
    };
    
    res.json({
      success: true,
      data: userProfile
    });
    
  } catch (error) {
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
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    const user = await prisma.users.findFirst({
      where: {
        userId: userId,
        deletedAt: null
      },
      select: {
        userId: true,
        username: true,
        email: true,
        profileImagePath: true,
        bio: true,
        location: true,
        role: true,
        status: true,
        emailVerified: true,
        storageUsed: true,
        storageLimit: true,
        createdAt: true,
        lastLogin: true
      }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const [
      imageCount,
      videoCount,
      albumCount,
      documentCount,
      trashCount,
      favoriteImagesCount,
      favoriteVideosCount,
      favoriteDocumentsCount
    ] = await Promise.all([
      prisma.images.count({
        where: { 
          userId: userId,
          deletedAt: null 
        }
      }),
      prisma.videos.count({
        where: { 
          userId: userId,
          deletedAt: null 
        }
      }),
      prisma.albums.count({
        where: { 
          userId: userId,
          deletedAt: null 
        }
      }),
      prisma.documents.count({
        where: { 
          userId: userId,
          deletedAt: null 
        }
      }),
      prisma.trash.count({
        where: { userId: userId }
      }),
      prisma.images.count({
        where: { 
          userId: userId, 
          isFavorite: true, 
          deletedAt: null 
        }
      }),
      prisma.videos.count({
        where: { 
          userId: userId, 
          isFavorite: true, 
          deletedAt: null 
        }
      }),
      prisma.documents.count({
        where: { 
          userId: userId, 
          isFavorite: true, 
          deletedAt: null 
        }
      })
    ]);

    const totalMediaCount = imageCount + videoCount + documentCount;
    
    const storageUsed = safeBigIntToNumber(user.storageUsed);
    const storageLimit = safeBigIntToNumber(user.storageLimit);
    
    const storagePercentage = storageLimit > 0 
      ? Math.round((storageUsed / storageLimit) * 100)
      : 0;

    const stats = {
      ...user,
      storageUsed: storageUsed,
      storageLimit: storageLimit,
      imageCount,
      videoCount,
      albumCount,
      documentCount,
      totalMediaCount,
      storagePercentage,
      trashCount,
      favoriteImagesCount,
      favoriteVideosCount,
      favoriteDocumentsCount,
      totalFavorites: favoriteImagesCount + favoriteVideosCount + favoriteDocumentsCount
    };
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
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
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó ninguna imagen'
      });
    }

    const profileImagePath = `/uploads/${userId}/profile/${req.file.filename}`;
    
    const user = await prisma.users.findFirst({
      where: { userId: userId },
      select: { profileImagePath: true }
    });
    
    const oldImagePath = user?.profileImagePath;
    
    await prisma.users.update({
      where: { userId: userId },
      data: {
        profileImagePath: profileImagePath,
        updatedAt: new Date()
      }
    });

    if (oldImagePath && !oldImagePath.includes('default-avatar')) {
      const fullOldPath = path.join(process.cwd(), 'public', oldImagePath);
      if (fs.existsSync(fullOldPath)) {
        fs.unlinkSync(fullOldPath);
      }
    }
    
    res.json({
      success: true,
      message: 'Imagen de perfil actualizada correctamente',
      data: { profileImagePath }
    });
    
  } catch (error) {
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
    const userId = req.user?.userId;
    const { username, email, bio, location } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    if (username || email) {
      const whereConditions: any[] = [];
      if (username) whereConditions.push({ username: username });
      if (email) whereConditions.push({ email: email });
      
      const existingUsers = await prisma.users.findFirst({
        where: {
          OR: whereConditions.length > 0 ? whereConditions : undefined,
          NOT: { userId: userId },
          deletedAt: null
        }
      });

      if (existingUsers) {
        return res.status(400).json({
          success: false,
          error: 'El nombre de usuario o email ya está en uso'
        });
      }
    }

    const updateData: any = {
      updatedAt: new Date()
    };

    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (bio !== undefined) updateData.bio = bio;
    if (location !== undefined) updateData.location = location;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionaron datos para actualizar'
      });
    }

    const updatedUser = await prisma.users.update({
      where: { userId: userId },
      data: updateData,
      select: {
        userId: true,
        username: true,
        email: true,
        profileImagePath: true,
        bio: true,
        location: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    res.json({
      success: true,
      message: 'Perfil actualizado correctamente',
      data: updatedUser
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar perfil'
    });
  }
};

// ============================================================================
// 🗑️ MOVE PROFILE IMAGE TO TRASH (CORREGIDO)
// ============================================================================

export const moveProfileImageToTrash = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    const user = await prisma.users.findFirst({
      where: { 
        userId: userId,
        deletedAt: null 
      },
      select: {
        userId: true,
        profileImagePath: true,
        username: true
      }
    });

    if (!user || !user.profileImagePath) {
      return res.status(404).json({
        success: false,
        error: 'No hay imagen de perfil para eliminar'
      });
    }

    if (user.profileImagePath.includes('default-avatar')) {
      return res.status(400).json({
        success: false,
        error: 'No se puede eliminar la imagen de perfil por defecto'
      });
    }

    const fullPath = path.join(process.cwd(), 'public', user.profileImagePath);
    let fileSize = 0;
    
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      fileSize = stats.size;
    }

    const originalPath = user.profileImagePath || '';
    
    await prisma.$transaction(async (tx) => {
      await tx.trash.create({
        data: {
          userId: user.userId,
          itemType: 'image',
          itemId: user.userId,
          originalName: `${user.username}-profile-image`,
          originalPath: originalPath,
          fileSize: BigInt(fileSize),
          mimeType: 'image/jpeg',
          metadata: JSON.stringify({
            username: user.username,
            type: 'profile_image',
            deletedAt: new Date().toISOString()
          }),
          createdAt: new Date(),
        },
      });

      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }

      await tx.users.update({
        where: { userId: user.userId },
        data: { 
          profileImagePath: '/uploads/default-avatar.png',
          updatedAt: new Date()
        }
      });
    });
    
    res.json({
      success: true,
      message: 'Imagen de perfil eliminada y movida a la papelera',
      data: {
        newProfileImage: '/uploads/default-avatar.png'
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar imagen de perfil'
    });
  }
};

// ============================================================================
// ACTUALIZACIONES INDIVIDUALES (MANTENIDAS)
// ============================================================================

export const updateUsername = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { username } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el nombre de usuario'
      });
    }

    const existingUser = await prisma.users.findFirst({
      where: {
        username: username,
        NOT: { userId: userId },
        deletedAt: null
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'El nombre de usuario ya está en uso'
      });
    }

    const updatedUser = await prisma.users.update({
      where: { userId: userId },
      data: {
        username: username,
        updatedAt: new Date()
      },
      select: {
        username: true
      }
    });
    
    res.json({
      success: true,
      message: 'Nombre de usuario actualizado correctamente',
      data: updatedUser
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar nombre de usuario'
    });
  }
};

export const updateBio = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { bio } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    const updatedUser = await prisma.users.update({
      where: { userId: userId },
      data: {
        bio: bio || null,
        updatedAt: new Date()
      },
      select: {
        bio: true
      }
    });
    
    res.json({
      success: true,
      message: 'Biografía actualizada correctamente',
      data: updatedUser
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar biografía'
    });
  }
};

export const updateEmail = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { email } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el email'
      });
    }

    const existingUser = await prisma.users.findFirst({
      where: {
        email: email,
        NOT: { userId: userId },
        deletedAt: null
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'El email ya está en uso'
      });
    }

    const updatedUser = await prisma.users.update({
      where: { userId: userId },
      data: {
        email: email,
        updatedAt: new Date()
      },
      select: {
        email: true
      }
    });
    
    res.json({
      success: true,
      message: 'Email actualizado correctamente',
      data: updatedUser
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar email'
    });
  }
};

export const updateLocation = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { location } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    const updatedUser = await prisma.users.update({
      where: { userId: userId },
      data: {
        location: location || null,
        updatedAt: new Date()
      },
      select: {
        location: true
      }
    });
    
    res.json({
      success: true,
      message: 'Ubicación actualizada correctamente',
      data: updatedUser
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar ubicación'
    });
  }
};

// ============================================================================
// FUNCIONES SIMPLIFICADAS
// ============================================================================

export const updatePassword = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren la contraseña actual y la nueva contraseña'
      });
    }

    res.json({
      success: true,
      message: 'Funcionalidad de cambio de contraseña en desarrollo'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al procesar cambio de contraseña'
    });
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    await prisma.users.update({
      where: { userId: userId },
      data: {
        deletedAt: new Date(),
        status: 'inactive'
      }
    });
    
    res.json({
      success: true,
      message: 'Cuenta eliminada correctamente'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar cuenta'
    });
  }
};

export const updateTheme = async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Funcionalidad de tema en desarrollo'
  });
};

export const updateLanguage = async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Funcionalidad de idioma en desarrollo'
  });
};