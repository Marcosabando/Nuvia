import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
}

const config: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  // ⚠️ El nombre por defecto debe coincidir con la base instalada (nuvia)
  database: process.env.DB_NAME || 'nuvia',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
};

// Pool de conexiones
export const pool = mysql.createPool({
  ...config,
  waitForConnections: true,
  queueLimit: 0,
  connectTimeout: 60000, // reemplaza acquireTimeout
});

// Función para probar la conexión
export const testConnection = async (): Promise<void> => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conexión a MySQL establecida correctamente');
    connection.release();
  } catch (error) {
    console.error('❌ Error conectando a MySQL:', error);
    throw error;
  }
};

// Función helper para ejecutar queries
export const executeQuery = async <T = any>(
  query: string, 
  params?: any[]
): Promise<T> => {
  try {
    const [rows] = await pool.execute(query, params);
    return rows as T;
  } catch (error) {
    console.error('Error ejecutando query:', error);
    throw error;
  }
};

export default pool;
