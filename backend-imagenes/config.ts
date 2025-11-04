/* eslint-disable n/no-process-env */

import path from 'path';
import dotenv from 'dotenv';
import moduleAlias from 'module-alias';

/***********************************************
 * Tipado de process.env para TS
 ***********************************************/
interface EnvVars {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT?: string;
  DB_HOST: string;
  DB_USER: string;
  DB_PASS?: string;
  DB_NAME: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN?: string;
  JWT_REFRESH_SECRET?: string;
  JWT_REFRESH_EXPIRES_IN?: string;
  [key: string]: string | undefined;
}

const processEnv = process.env as EnvVars;

/***********************************************
 * Configuración del entorno
 ***********************************************/

const NODE_ENV = processEnv.NODE_ENV ?? 'development';

// ✅ Cargar primero el .env principal

const mainEnvResult = dotenv.config({
  path: path.join(__dirname, '.env'),
});

// ✅ Luego cargar el específico del entorno (sobrescribe valores si existen)

const envResult = dotenv.config({
  path: path.join(__dirname, `.env.${NODE_ENV}`),
});

// Solo lanzar advertencia si ninguno de los dos archivos existe

if (mainEnvResult.error && envResult.error) {
  console.warn('⚠️  Advertencia: No se encontró archivo .env');
  console.warn('Usando valores por defecto del sistema');
}

/***********************************************
 * Validación de variables críticas
 ***********************************************/

const requiredEnvVars: (keyof EnvVars)[] = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
const missingVars = requiredEnvVars.filter(key => !processEnv[key]);

if (missingVars.length > 0) {
  console.error('❌ Variables de entorno faltantes:', missingVars.join(', '));
  throw new Error('Faltan variables de entorno requeridas');
}

/***********************************************
 * Configuración de alias de módulos
 ***********************************************/

if (__filename.endsWith('js')) {
  moduleAlias.addAlias('@src', path.join(__dirname, 'dist'));
} else {
  moduleAlias.addAlias('@src', path.join(__dirname, 'src'));
}

/***********************************************
 * Logging seguro en desarrollo
 ***********************************************/

if (NODE_ENV === 'development') {
  console.log('✅ Configuración cargada:');
  console.log(`   NODE_ENV: ${NODE_ENV}`);
  console.log(`   PORT: ${processEnv.PORT ?? 'default 3000'}`);
  console.log(`   DB_HOST: ${processEnv.DB_HOST}`);
  console.log(`   DB_NAME: ${processEnv.DB_NAME}`);
  console.log(`   DB_USER: ${processEnv.DB_USER?.replace(/./g, '*')}`); // Protege la contraseña/usuario
  console.log('   JWT_SECRET: ****'); // Nunca mostrar el JWT real
}

/***********************************************
 * Export
 ***********************************************/
export default processEnv;
