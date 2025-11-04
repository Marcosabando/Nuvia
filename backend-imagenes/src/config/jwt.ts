import jwt, { SignOptions, Secret } from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export interface JWTPayload {
  userId: number;
  email: string;
  username: string;
}

export interface JWTConfig {
  secret: string;
  expiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
}

const jwtConfig: JWTConfig = {
  secret: process.env.JWT_SECRET || "your-super-secret-key-change-in-production",
  expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  refreshSecret: process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key",
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
};

// Helper para generar token, tipando opciones correctamente
const signToken = (payload: JWTPayload, secret: string, expiresIn: string): string => {
  const options: SignOptions = { expiresIn: expiresIn as any };
  return jwt.sign(payload, secret as Secret, options);
};

export const generateToken = (payload: JWTPayload): string => {
  return signToken(payload, jwtConfig.secret, jwtConfig.expiresIn);
};

export const generateRefreshToken = (payload: JWTPayload): string => {
  return signToken(payload, jwtConfig.refreshSecret, jwtConfig.refreshExpiresIn);
};

export const verifyToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, jwtConfig.secret as Secret) as JWTPayload;
  } catch (err) {
    if (process.env.NODE_ENV === 'development') 
      console.error('JWT verify error:', err);
    return null;
  }
};

export const verifyRefreshToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, jwtConfig.refreshSecret as Secret) as JWTPayload;
  } catch (err) {
    if (process.env.NODE_ENV === 'development') 
      console.error('JWT refresh verify error:', err);
    return null;
  }
};

export default jwtConfig;
