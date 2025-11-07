import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(process.cwd());
const candidateFiles = [
  resolve(projectRoot, '.env'),
  resolve(projectRoot, '.env.local'),
  resolve(projectRoot, '.env.development'),
  resolve(projectRoot, '.env.development.local')
];

const existing = candidateFiles.find((file) => existsSync(file));

if (existing) {
  console.log(`ℹ️ Archivo de entorno encontrado (${existing}). No se modifica.`);
} else {
  const defaultEnv = `VITE_API_BASE_URL=http://localhost:3000/api\nVITE_UPLOADS_URL=http://localhost:3000/uploads\n`;
  const output = candidateFiles[1]; // .env.local
  writeFileSync(output, defaultEnv, { encoding: 'utf8' });
  console.log(`✅ Archivo ${output} creado con la configuración por defecto (puerto 3000).`);
}

