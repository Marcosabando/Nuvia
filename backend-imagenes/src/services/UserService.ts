// src/services/UserService.ts - MIGRADO A PRISMA
import { Request, Response } from "express";
import { PrismaClient } from '@prisma/client';
import bcrypt from "bcrypt";
import { generateToken, generateRefreshToken } from "@src/config/jwt";

const SALT_ROUNDS = 10;

// Definir interfaces para los tipos de datos
interface ImageData {
  imageId: number;
  originalFilename: string;
  filename: string;
  fileSize: bigint;
  mimeType: string;
  width: number | null;
  height: number | null;
  uploadDate: Date | null;
  takenDate: Date | null;
  cameraInfo: any | null;
  location: string | null;
}

interface VideoData {
  videoId: number;
  originalFilename: string;
  filename: string;
  fileSize: bigint;
  mimeType: string;
  duration: number | null;
  width: number | null;
  height: number | null;
  uploadDate: Date | null;
  recordedDate: Date | null;
  cameraInfo: any | null;
  location: string | null;
}

// ✅ Register new user
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({
        success: false,
        error: "Username, email and password are required"
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters"
      });
      return;
    }

    const prisma = new PrismaClient();

    // Check if user already exists
    const existingUser = await prisma.users.findFirst({
      where: {
        OR: [
          { email: email },
          { username: username }
        ]
      }
    });

    if (existingUser) {
      await prisma.$disconnect();
      res.status(409).json({
        success: false,
        error: "Email or username already registered"
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create new user
    const newUser = await prisma.users.create({
      data: {
        username: username,
        email: email,
        password: passwordHash,
        role: 'user',
        isActive: true,
        emailVerified: false,
        storageUsed: 0,
        storageLimit: 5368709120,
        imageCount: 0,
        videoCount: 0,
        documentCount: 0,
        albumCount: 0,
        totalMediaCount: 0
      }
    });

    const payload = {
      userId: newUser.userId,
      email: newUser.email,
      username: newUser.username,
      role: newUser.role
    };

    const token = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await prisma.$disconnect();

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: {
          userId: newUser.userId,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          storageUsed: 0,
          storageLimit: 5368709120
        },
        token,
        refreshToken
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error registering user",
      details: (error as Error).message
    });
  }
};

// ✅ User login
export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier, password } = req.body;

    // Validar que vengan los campos necesarios
    if (!identifier || !password) {
      res.status(400).json({
        success: false,
        error: "Username/email and password are required"
      });
      return;
    }

    const prisma = new PrismaClient();

    // 🔥 BUSCAR por email O username
    const user = await prisma.users.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier }
        ]
      }
    });

    if (!user) {
      await prisma.$disconnect();
      res.status(401).json({
        success: false,
        error: "Invalid credentials"
      });
      return;
    }

    if (!user.isActive) {
      await prisma.$disconnect();
      res.status(403).json({
        success: false,
        error: "Account deactivated"
      });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      await prisma.$disconnect();
      res.status(401).json({
        success: false,
        error: "Invalid credentials"
      });
      return;
    }

    // Update last login
    await prisma.users.update({
      where: { userId: user.userId },
      data: { lastLogin: new Date() }
    });

    const payload = {
      userId: user.userId,
      email: user.email,
      username: user.username,
      role: user.role
    };

    const token = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await prisma.$disconnect();

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          userId: user.userId,
          username: user.username,
          email: user.email,
          role: user.role
        },
        token,
        refreshToken
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error logging in",
      details: (error as Error).message
    });
  }
};

// ✅ Get authenticated user profile
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    // 🔍 LOG 1: Ver qué viene en req.user (del token JWT)
    console.log("🔍 [getProfile] Usuario del token (req.user):", req.user);

    const prisma = new PrismaClient();

    const user = await prisma.users.findUnique({
      where: { userId: userId },
      select: {
        userId: true,
        username: true,
        email: true,
        role: true,
        storageUsed: true,
        storageLimit: true,
        isActive: true,
        emailVerified: true,
        lastLogin: true,
        createdAt: true
      }
    });

    if (!user) {
      await prisma.$disconnect();
      res.status(404).json({
        success: false,
        error: "User not found"
      });
      return;
    }

    // 🔍 LOG 2: Ver qué viene de la base de datos
    console.log("🔍 [getProfile] Usuario de la BD:", {
      userId: user.userId,
      username: user.username,
      email: user.email,
      role: user.role,
      roleType: typeof user.role
    });

    // Get statistics
    const [totalImages, totalVideos, todayImages, todayVideos] = await Promise.all([
      // Total images
      prisma.images.count({
        where: {
          userId: userId,
          deletedAt: null
        }
      }),
      // Total videos
      prisma.videos.count({
        where: {
          userId: userId,
          deletedAt: null
        }
      }),
      // Images uploaded today
      prisma.images.count({
        where: {
          userId: userId,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      // Videos uploaded today
      prisma.videos.count({
        where: {
          userId: userId,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    ]);

    await prisma.$disconnect();

    const responseData = {
      userId: user.userId,
      username: user.username,
      email: user.email,
      role: user.role,
      storageUsed: Number(user.storageUsed),
      storageLimit: Number(user.storageLimit),
      storagePercentage: ((Number(user.storageUsed) / Number(user.storageLimit)) * 100).toFixed(2),
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      stats: {
        totalImages: totalImages,
        totalVideos: totalVideos,
        todayUploads: todayImages + todayVideos
      }
    };

    // 🔍 LOG 3: Ver qué se va a enviar en la respuesta
    console.log("🔍 [getProfile] Datos a enviar (responseData.role):", responseData.role);

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error("❌ [getProfile] Error:", error);
    res.status(500).json({
      success: false,
      error: "Error getting profile"
    });
  }
};

// ✅ Get all user data (complete information)
export const getAllUserData = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const prisma = new PrismaClient();

    // Get user basic info
    const user = await prisma.users.findUnique({
      where: { userId: userId },
      select: {
        userId: true,
        username: true,
        email: true,
        role: true,
        storageUsed: true,
        storageLimit: true,
        isActive: true,
        emailVerified: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      await prisma.$disconnect();
      res.status(404).json({
        success: false,
        error: "User not found"
      });
      return;
    }

    // Get all images
    const images = await prisma.images.findMany({
      where: {
        userId: userId,
        deletedAt: null
      },
      select: {
        imageId: true,
        originalFilename: true,
        filename: true,
        fileSize: true,
        mimeType: true,
        width: true,
        height: true,
        uploadDate: true,
        takenDate: true,
        cameraInfo: true,
        location: true
      },
      orderBy: {
        uploadDate: 'desc'
      }
    });

    // Get all videos
    const videos = await prisma.videos.findMany({
      where: {
        userId: userId,
        deletedAt: null
      },
      select: {
        videoId: true,
        originalFilename: true,
        filename: true,
        fileSize: true,
        mimeType: true,
        duration: true,
        width: true,
        height: true,
        uploadDate: true,
        recordedDate: true,
        cameraInfo: true,
        location: true
      },
      orderBy: {
        uploadDate: 'desc'
      }
    });

    // Get statistics using Prisma aggregations
    const [imagesStats, videosStats, todayImagesStats, todayVideosStats] = await Promise.all([
      // Images statistics
      prisma.images.aggregate({
        where: {
          userId: userId,
          deletedAt: null
        },
        _count: {
          imageId: true
        },
        _sum: {
          fileSize: true
        }
      }),
      // Videos statistics
      prisma.videos.aggregate({
        where: {
          userId: userId,
          deletedAt: null
        },
        _count: {
          videoId: true
        },
        _sum: {
          fileSize: true
        }
      }),
      // Images uploaded today
      prisma.images.count({
        where: {
          userId: userId,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      // Videos uploaded today
      prisma.videos.count({
        where: {
          userId: userId,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    ]);

    await prisma.$disconnect();

    const totalImages = imagesStats._count.imageId || 0;
    const totalVideos = videosStats._count.videoId || 0;
    const totalStorageUsed = (Number(imagesStats._sum.fileSize) || 0) + (Number(videosStats._sum.fileSize) || 0);

    res.json({
      success: true,
      data: {
        user: {
          userId: user.userId,
          username: user.username,
          email: user.email,
          role: user.role,
          storageUsed: Number(user.storageUsed),
          storageLimit: Number(user.storageLimit),
          storagePercentage: ((Number(user.storageUsed) / Number(user.storageLimit)) * 100).toFixed(2),
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        statistics: {
          totalImages: totalImages,
          totalVideos: totalVideos,
          totalFiles: totalImages + totalVideos,
          totalStorageUsed: totalStorageUsed,
          totalDownloads: 0, // Not available in current schema
          uploadsToday: {
            images: todayImagesStats,
            videos: todayVideosStats,
            total: todayImagesStats + todayVideosStats
          }
        },
        images: images.map((img: ImageData) => ({
          ...img,
          fileSize: Number(img.fileSize)
        })),
        videos: videos.map((vid: VideoData) => ({
          ...vid,
          fileSize: Number(vid.fileSize)
        }))
      }
    });
  } catch (error) {
    console.error("Error getting user data:", error);
    res.status(500).json({
      success: false,
      error: "Error getting user data"
    });
  }
};

// ✅ Update profile
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { username, email } = req.body;

    if (!username && !email) {
      res.status(400).json({
        success: false,
        error: "Must provide at least one field to update"
      });
      return;
    }

    const prisma = new PrismaClient();

    // Check if email or username already exists (excluding current user)
    if (email || username) {
      const existingUser = await prisma.users.findFirst({
        where: {
          OR: [
            { email: email || '' },
            { username: username || '' }
          ],
          NOT: {
            userId: userId
          }
        }
      });

      if (existingUser) {
        await prisma.$disconnect();
        res.status(409).json({
          success: false,
          error: "Email or username already in use"
        });
        return;
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;

    // Update user
    await prisma.users.update({
      where: { userId: userId },
      data: updateData
    });

    await prisma.$disconnect();

    res.json({
      success: true,
      message: "Profile updated successfully"
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({
      success: false,
      error: "Error updating profile"
    });
  }
};

// ✅ Change password
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        error: "Current and new password are required"
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        error: "New password must be at least 6 characters"
      });
      return;
    }

    const prisma = new PrismaClient();

    // Get user with password
    const user = await prisma.users.findUnique({
      where: { userId: userId },
      select: { password: true }
    });

    if (!user) {
      await prisma.$disconnect();
      res.status(404).json({
        success: false,
        error: "User not found"
      });
      return;
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);

    if (!isValid) {
      await prisma.$disconnect();
      res.status(401).json({
        success: false,
        error: "Current password is incorrect"
      });
      return;
    }

    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.users.update({
      where: { userId: userId },
      data: { password: newPasswordHash }
    });

    await prisma.$disconnect();

    res.json({
      success: true,
      message: "Password changed successfully"
    });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({
      success: false,
      error: "Error changing password"
    });
  }
};

// ✅ Delete account
export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { password } = req.body;

    if (!password) {
      res.status(400).json({
        success: false,
        error: "Password required to delete account"
      });
      return;
    }

    const prisma = new PrismaClient();

    // Get user with password
    const user = await prisma.users.findUnique({
      where: { userId: userId },
      select: { password: true }
    });

    if (!user) {
      await prisma.$disconnect();
      res.status(404).json({
        success: false,
        error: "User not found"
      });
      return;
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      await prisma.$disconnect();
      res.status(401).json({
        success: false,
        error: "Incorrect password"
      });
      return;
    }

    // Delete user (this will cascade delete related records due to Prisma relations)
    await prisma.users.delete({
      where: { userId: userId }
    });

    await prisma.$disconnect();

    res.json({
      success: true,
      message: "Account deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({
      success: false,
      error: "Error deleting account"
    });
  }
};

export default {
  registerUser,
  loginUser,
  getProfile,
  getAllUserData,
  updateProfile,
  changePassword,
  deleteAccount
};