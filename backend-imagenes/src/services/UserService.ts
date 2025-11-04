// src/services/UserService.ts
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

    // Basic validations
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

    // Check if user already exists
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

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert user
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (username, email, password, isActive, emailVerified)
       VALUES (?, ?, ?, TRUE, FALSE)`,
      [username, email, passwordHash]
    );

    // Generate tokens
    const payload = {
      userId: result.insertId,
      email,
      username
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
          storageUsed: 0,
          storageLimit: 5368709120 // 5GB
        },
        token,
        refreshToken
      }
    });
  } catch (error) {
    console.error("Error registering user:", error);
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

    // Find user
    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT userId, username, email, password, isActive 
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

    // Check if active
    if (!user.isActive) {
      res.status(403).json({
        success: false,
        error: "Account deactivated"
      });
      return;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: "Invalid credentials"
      });
      return;
    }

    // Update last login
    await pool.query(
      `UPDATE users SET lastLogin = NOW() WHERE userId = ?`,
      [user.userId]
    );

    // Generate tokens
    const payload = {
      userId: user.userId,
      email: user.email,
      username: user.username
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
          email: user.email
        },
        token,
        refreshToken
      }
    });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({
      success: false,
      error: "Error logging in",
      details: (error as Error).message
    });
  }
};

// ✅ Get authenticated user profile
// ✅ Get authenticated user profile
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT userId, username, email, storageUsed, storageLimit, 
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

    // Get comprehensive statistics
    const [stats] = await pool.query<RowDataPacket[]>(
      `SELECT 
        -- Total images
        (SELECT COUNT(*) FROM images WHERE userId = ? AND deletedAt IS NULL) as totalImages,
        
        -- Total videos  
        (SELECT COUNT(*) FROM videos WHERE userId = ? AND deletedAt IS NULL) as totalVideos,
        
        -- Today's uploads (both images and videos)
        (
          (SELECT COUNT(*) FROM images WHERE userId = ? AND DATE(uploadDate) = CURDATE()) +
          (SELECT COUNT(*) FROM videos WHERE userId = ? AND DATE(uploadDate) = CURDATE())
        ) as todayUploads
      `,
      [userId, userId, userId, userId]
    );

    const user = users[0];
    const statistics = stats[0];

    res.json({
      success: true,
      data: {
        userId: user.userId,
        username: user.username,
        email: user.email,
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
      }
    });
  } catch (error) {
    console.error("Error getting profile:", error);
    res.status(500).json({
      success: false,
      error: "Error getting profile"
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

    // Check if new email/username already exists
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

    // Build dynamic query
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

    // Get current password
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

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, users[0].password);

    if (!isValid) {
      res.status(401).json({
        success: false,
        error: "Current password is incorrect"
      });
      return;
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update
    await pool.query(
      `UPDATE users SET password = ? WHERE userId = ?`,
      [newPasswordHash, userId]
    );

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

    // Verify password
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

    // Delete user (cascade will delete images automatically)
    await pool.query(`DELETE FROM users WHERE userId = ?`, [userId]);

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
  updateProfile,
  changePassword,
  deleteAccount
};