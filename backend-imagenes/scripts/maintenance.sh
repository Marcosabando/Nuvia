#!/bin/bash

# ============================================
# MANTENIMIENTO AUTOMÁTICO - NUVIA
# ============================================

set -euo pipefail

echo "🔧 Iniciando mantenimiento automático..."

# 1. Limpiar archivos temporales (> 7 días)
echo "🗑️ Limpiando archivos temporales..."
node -e "
const fs = require('fs').promises;
const path = require('path');
const UPLOAD_PATH = process.env.UPLOAD_PATH || '/var/nuvia/uploads';
const tempDir = path.join(UPLOAD_PATH, 'temp');
const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);

async function cleanup() {
  try {
    const files = await fs.readdir(tempDir);
    let deleted = 0;
    
    for (const file of files) {
      try {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtimeMs < cutoff) {
          await fs.unlink(filePath);
          deleted++;
        }
      } catch (err) {
        console.warn('Error limpiando:', file, err.message);
      }
    }
    
    console.log(\`✅ Limpiados \${deleted} archivos temporales\`);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('Error en limpieza:', err.message);
    }
  }
}

cleanup();
"

# 2. Vaciar papelera (> 30 días)
echo "🗑️ Vaciar papelera antigua..."
node -e "
const fs = require('fs').promises;
const path = require('path');
const UPLOAD_PATH = process.env.UPLOAD_PATH || '/var/nuvia/uploads';
const trashDir = path.join(UPLOAD_PATH, 'trash');
const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);

async function emptyTrash() {
  try {
    const users = await fs.readdir(trashDir);
    let deleted = 0;
    
    for (const user of users) {
      const userDir = path.join(trashDir, user);
      const files = await fs.readdir(userDir);
      
      for (const file of files) {
        try {
          const filePath = path.join(userDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtimeMs < cutoff) {
            await fs.unlink(filePath);
            deleted++;
          }
        } catch (err) {
          console.warn('Error eliminando:', file, err.message);
        }
      }
      
      // Eliminar directorio de usuario si está vacío
      try {
        const remaining = await fs.readdir(userDir);
        if (remaining.length === 0) {
          await fs.rmdir(userDir);
        }
      } catch (err) {
        // Ignorar
      }
    }
    
    console.log(\`✅ Eliminados \${deleted} archivos de papelera\`);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('Error vaciando papelera:', err.message);
    }
  }
}

emptyTrash();
"

# 3. Optimizar base de datos (MySQL)
echo "🗄️ Optimizando base de datos..."
mysql -u nuvia_user -p"${DB_PASSWORD}" nuvia_production -e "
  OPTIMIZE TABLE users, images, videos, documents;
  ANALYZE TABLE users, images, videos, documents;
" 2>/dev/null || echo "⚠️ No se pudo optimizar BD"

# 4. Rotar logs
echo "📝 Rotando logs..."
logrotate -f /etc/logrotate.d/nuvia

# 5. Verificar espacio en disco
echo "💾 Verificando espacio en disco..."
df -h /var/nuvia

echo "✅ Mantenimiento completado"