// src/services/UserService.ts
import { Request, Response } from "express";
import { pool } from "@src/config/database";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import bcrypt from "bcrypt";
import { generateToken, generateRefreshToken } from "@src/config/jwt";

const SALT_ROUNDS = 10;

// ✅ Registrar nuevo usuario
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;

    // Validaciones básicas
    if (!username || !email || !password) {
      res.status(400).json({
        success: false,
        error: "Username, email y password son requeridos"
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        success: false,
        error: "La contraseña debe tener al menos 6 caracteres"
      });
      return;
    }

    // Verificar si el usuario ya existe
    const [existingUsers] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM usuarios WHERE email = ? OR username = ?`,
      [email, username]
    );

    if (existingUsers.length > 0) {
      res.status(409).json({
        success: false,
        error: "El email o username ya está registrado"
      });
      return;
    }

    // Hash de la contraseña
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insertar usuario
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO usuarios (username, email, password_hash, salt, is_active, email_verified)
       VALUES (?, ?, ?, ?, TRUE, FALSE)`,
      [username, email, passwordHash, salt]
    );

    // Generar tokens
    const payload = {
      userId: result.insertId,
      email,
      username
    };

    const token = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.status(201).json({
      success: true,
      message: "Usuario registrado exitosamente",
      data: {
        user: {
          id: result.insertId,
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
      error: "Error al registrar usuario",
      details: (error as Error).message
    });
  }
};

// ✅ Login de usuario
export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: "Email y password son requeridos"
      });
      return;
    }

    // Buscar usuario
    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT id, username, email, password_hash, is_active 
       FROM usuarios WHERE email = ?`,
      [email]
    );

    if (users.length === 0) {
      res.status(401).json({
        success: false,
        error: "Credenciales inválidas"
      });
      return;
    }

    const user = users[0];

    // Verificar si está activo
    if (!user.is_active) {
      res.status(403).json({
        success: false,
        error: "Cuenta desactivada"
      });
      return;
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: "Credenciales inválidas"
      });
      return;
    }

    // Actualizar último login
    await pool.query(
      `UPDATE usuarios SET last_login = NOW() WHERE id = ?`,
      [user.id]
    );

    // Generar tokens
    const payload = {
      userId: user.id,
      email: user.email,
      username: user.username
    };

    const token = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.json({
      success: true,
      message: "Login exitoso",
      data: {
        user: {
          id: user.id,
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
      error: "Error al iniciar sesión",
      details: (error as Error).message
    });
  }
};

// ✅ Obtener perfil del usuario autenticado
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT id, username, email, storage_used, storage_limit, 
              is_active, email_verified, last_login, created_at 
       FROM usuarios WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      res.status(404).json({
        success: false,
        error: "Usuario no encontrado"
      });
      return;
    }

    // Obtener estadísticas de imágenes
    const [stats] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as totalImages FROM imagenes WHERE user_id = ?`,
      [userId]
    );

    const user = users[0];

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        storageUsed: user.storage_used,
        storageLimit: user.storage_limit,
        storagePercentage: ((user.storage_used / user.storage_limit) * 100).toFixed(2),
        isActive: user.is_active,
        emailVerified: user.email_verified,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        stats: {
          totalImages: stats[0].totalImages
        }
      }
    });
  } catch (error) {
    console.error("Error getting profile:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener perfil"
    });
  }
};

// ✅ Actualizar perfil
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { username, email } = req.body;

    if (!username && !email) {
      res.status(400).json({
        success: false,
        error: "Debe proporcionar al menos un campo para actualizar"
      });
      return;
    }

    // Verificar si el nuevo email/username ya existe
    if (email || username) {
      const [existing] = await pool.query<RowDataPacket[]>(
        `SELECT id FROM usuarios 
         WHERE (email = ? OR username = ?) AND id != ?`,
        [email || '', username || '', userId]
      );

      if (existing.length > 0) {
        res.status(409).json({
          success: false,
          error: "El email o username ya está en uso"
        });
        return;
      }
    }

    // Construir query dinámica
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
      `UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({
      success: true,
      message: "Perfil actualizado exitosamente"
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({
      success: false,
      error: "Error al actualizar perfil"
    });
  }
};

// ✅ Cambiar contraseña
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        error: "Contraseña actual y nueva son requeridas"
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        error: "La nueva contraseña debe tener al menos 6 caracteres"
      });
      return;
    }

    // Obtener contraseña actual
    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT password_hash FROM usuarios WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      res.status(404).json({
        success: false,
        error: "Usuario no encontrado"
      });
      return;
    }

    // Verificar contraseña actual
    const isValid = await bcrypt.compare(currentPassword, users[0].password_hash);

    if (!isValid) {
      res.status(401).json({
        success: false,
        error: "Contraseña actual incorrecta"
      });
      return;
    }

    // Hash de nueva contraseña
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Actualizar
    await pool.query(
      `UPDATE usuarios SET password_hash = ?, salt = ? WHERE id = ?`,
      [newPasswordHash, salt, userId]
    );

    res.json({
      success: true,
      message: "Contraseña cambiada exitosamente"
    });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({
      success: false,
      error: "Error al cambiar contraseña"
    });
  }
};

// ✅ Eliminar cuenta
export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { password } = req.body;

    if (!password) {
      res.status(400).json({
        success: false,
        error: "Contraseña requerida para eliminar cuenta"
      });
      return;
    }

    // Verificar contraseña
    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT password_hash FROM usuarios WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      res.status(404).json({
        success: false,
        error: "Usuario no encontrado"
      });
      return;
    }

    const isValid = await bcrypt.compare(password, users[0].password_hash);

    if (!isValid) {
      res.status(401).json({
        success: false,
        error: "Contraseña incorrecta"
      });
      return;
    }

    // Eliminar usuario (cascade eliminará imágenes automáticamente)
    await pool.query(`DELETE FROM usuarios WHERE id = ?`, [userId]);

    res.json({
      success: true,
      message: "Cuenta eliminada exitosamente"
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({
      success: false,
      error: "Error al eliminar cuenta"
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

