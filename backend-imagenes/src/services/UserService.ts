// src/services/UserService.ts - CORREGIDO CON LOGS
import { Request, Response } from "express";
import { pool } from "@src/config/database";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import bcrypt from "bcrypt";
import { generateToken, generateRefreshToken } from "@src/config/jwt";

const SALT_ROUNDS = 10;

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

    const [existingUsers] = await pool.query<RowDataPacket[]>(
      `SELECT userId FROM users WHERE email = ? OR username = ?`,
      [email, username]
    );

    if (existingUsers.length > 0) {
      res.status(409).json({
        success: false,
        error: "Email or username already registered"
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (username, email, password, role, isActive, emailVerified)
       VALUES (?, ?, ?, 'user', TRUE, FALSE)`,
      [username, email, passwordHash]
    );

    const payload = {
      userId: result.insertId,
      email,
      username,
      role: 'user'
    };

    const token = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: {
          userId: result.insertId,
          username,
          email,
          role: 'user',
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
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: "Email and password are required"
      });
      return;
    }

    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT userId, username, email, password, role, isActive 
       FROM users WHERE email = ?`,
      [email]
    );

    if (users.length === 0) {
      res.status(401).json({
        success: false,
        error: "Invalid credentials"
      });
      return;
    }

    const user = users[0];

    if (!user.isActive) {
      res.status(403).json({
        success: false,
        error: "Account deactivated"
      });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: "Invalid credentials"
      });
      return;
    }

    await pool.query(
      `UPDATE users SET lastLogin = NOW() WHERE userId = ?`,
      [user.userId]
    );

    const payload = {
      userId: user.userId,
      email: user.email,
      username: user.username,
      role: user.role
    };

    const token = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

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

// ✅ Get authenticated user profile - CORREGIDO CON LOGS
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    // 🔍 LOG 1: Ver qué viene en req.user (del token JWT)
    console.log("🔍 [getProfile] Usuario del token (req.user):", req.user);

    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT userId, username, email, role, storageUsed, storageLimit, 
              isActive, emailVerified, lastLogin, createdAt 
       FROM users WHERE userId = ?`,
      [userId]
    );

    if (users.length === 0) {
      res.status(404).json({
        success: false,
        error: "User not found"
      });
      return;
    }

    const user = users[0];

    // 🔍 LOG 2: Ver qué viene de la base de datos
    console.log("🔍 [getProfile] Usuario de la BD:", {
      userId: user.userId,
      username: user.username,
      email: user.email,
      role: user.role,
      roleType: typeof user.role
    });

    const [stats] = await pool.query<RowDataPacket[]>(
      `SELECT 
        (SELECT COUNT(*) FROM images WHERE userId = ? AND deletedAt IS NULL) as totalImages,
        (SELECT COUNT(*) FROM videos WHERE userId = ? AND deletedAt IS NULL) as totalVideos,
        (
          (SELECT COUNT(*) FROM images WHERE userId = ? AND DATE(uploadDate) = CURDATE()) +
          (SELECT COUNT(*) FROM videos WHERE userId = ? AND DATE(uploadDate) = CURDATE())
        ) as todayUploads
      `,
      [userId, userId, userId, userId]
    );

    const statistics = stats[0];

    const responseData = {
      userId: user.userId,
      username: user.username,
      email: user.email,
      role: user.role, // ✅ Aseguramos que esté aquí
      storageUsed: user.storageUsed,
      storageLimit: user.storageLimit,
      storagePercentage: ((user.storageUsed / user.storageLimit) * 100).toFixed(2),
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      stats: {
        totalImages: statistics.totalImages || 0,
        totalVideos: statistics.totalVideos || 0,
        todayUploads: statistics.todayUploads || 0
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

    // Get user basic info
    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT userId, username, email, role, storageUsed, storageLimit, 
              isActive, emailVerified, lastLogin, createdAt, updatedAt
       FROM users WHERE userId = ?`,
      [userId]
    );

    if (users.length === 0) {
      res.status(404).json({
        success: false,
        error: "User not found"
      });
      return;
    }

    // Get all images
    const [images] = await pool.query<RowDataPacket[]>(
      `SELECT imageId, originalName, fileName, fileSize, mimeType, 
              width, height, uploadDate, expiresAt, downloadCount, lastDownload
       FROM images WHERE userId = ? AND deletedAt IS NULL
       ORDER BY uploadDate DESC`,
      [userId]
    );

    // Get all videos
    const [videos] = await pool.query<RowDataPacket[]>(
      `SELECT videoId, originalName, fileName, fileSize, mimeType,
              duration, width, height, uploadDate, expiresAt, downloadCount, lastDownload
       FROM videos WHERE userId = ? AND deletedAt IS NULL
       ORDER BY uploadDate DESC`,
      [userId]
    );

    // Get statistics
    const [stats] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(DISTINCT i.imageId) as totalImages,
        COUNT(DISTINCT v.videoId) as totalVideos,
        COALESCE(SUM(i.fileSize), 0) + COALESCE(SUM(v.fileSize), 0) as totalStorageUsed,
        COALESCE(SUM(i.downloadCount), 0) + COALESCE(SUM(v.downloadCount), 0) as totalDownloads,
        (
          SELECT COUNT(*) FROM images 
          WHERE userId = ? AND DATE(uploadDate) = CURDATE()
        ) as imagesUploadedToday,
        (
          SELECT COUNT(*) FROM videos 
          WHERE userId = ? AND DATE(uploadDate) = CURDATE()
        ) as videosUploadedToday
       FROM images i
       LEFT JOIN videos v ON v.userId = i.userId
       WHERE i.userId = ? AND i.deletedAt IS NULL AND v.deletedAt IS NULL`,
      [userId, userId, userId]
    );

    const user = users[0];
    const statistics = stats[0];

    res.json({
      success: true,
      data: {
        user: {
          userId: user.userId,
          username: user.username,
          email: user.email,
          role: user.role,
          storageUsed: user.storageUsed,
          storageLimit: user.storageLimit,
          storagePercentage: ((user.storageUsed / user.storageLimit) * 100).toFixed(2),
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        statistics: {
          totalImages: statistics.totalImages || 0,
          totalVideos: statistics.totalVideos || 0,
          totalFiles: (statistics.totalImages || 0) + (statistics.totalVideos || 0),
          totalStorageUsed: statistics.totalStorageUsed || 0,
          totalDownloads: statistics.totalDownloads || 0,
          uploadsToday: {
            images: statistics.imagesUploadedToday || 0,
            videos: statistics.videosUploadedToday || 0,
            total: (statistics.imagesUploadedToday || 0) + (statistics.videosUploadedToday || 0)
          }
        },
        images: images,
        videos: videos
      }
    });
  } catch (error) {
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

    if (email || username) {
      const [existing] = await pool.query<RowDataPacket[]>(
        `SELECT userId FROM users 
         WHERE (email = ? OR username = ?) AND userId != ?`,
        [email || '', username || '', userId]
      );

      if (existing.length > 0) {
        res.status(409).json({
          success: false,
          error: "Email or username already in use"
        });
        return;
      }
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (username) {
      updates.push('username = ?');
      values.push(username);
    }

    if (email) {
      updates.push('email = ?');
      values.push(email);
    }

    values.push(userId);

    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE userId = ?`,
      values
    );

    res.json({
      success: true,
      message: "Profile updated successfully"
    });
  } catch (error) {
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

    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT password FROM users WHERE userId = ?`,
      [userId]
    );

    if (users.length === 0) {
      res.status(404).json({
        success: false,
        error: "User not found"
      });
      return;
    }

    const isValid = await bcrypt.compare(currentPassword, users[0].password);

    if (!isValid) {
      res.status(401).json({
        success: false,
        error: "Current password is incorrect"
      });
      return;
    }

    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await pool.query(
      `UPDATE users SET password = ? WHERE userId = ?`,
      [newPasswordHash, userId]
    );

    res.json({
      success: true,
      message: "Password changed successfully"
    });
  } catch (error) {
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

    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT password FROM users WHERE userId = ?`,
      [userId]
    );

    if (users.length === 0) {
      res.status(404).json({
        success: false,
        error: "User not found"
      });
      return;
    }

    const isValid = await bcrypt.compare(password, users[0].password);

    if (!isValid) {
      res.status(401).json({
        success: false,
        error: "Incorrect password"
      });
      return;
    }

    await pool.query(`DELETE FROM users WHERE userId = ?`, [userId]);

    res.json({
      success: true,
      message: "Account deleted successfully"
    });
  } catch (error) {
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