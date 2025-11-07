// src/jobs/trashCleanup.ts
import cron from 'node-cron';
import logger from 'jet-logger';
import { cleanExpiredTrash } from '@src/services/TrashServices';

/**
 * Cron job para limpiar elementos expirados de la papelera
 * Se ejecuta todos los días a las 3:00 AM
 */
export const startTrashCleanupJob = () => {
  // Ejecutar todos los días a las 3:00 AM
  cron.schedule('0 3 * * *', async () => {
    logger.info('🧹 Starting trash cleanup job...');
    
    try {
      const deletedCount = await cleanExpiredTrash();
      logger.info(`✅ Trash cleanup completed. Deleted ${deletedCount} expired items.`);
    } catch (error) {
      logger.err('❌ Error during trash cleanup:', error);
    }
  });

  logger.info('✅ Trash cleanup cron job scheduled (daily at 3:00 AM)');
};

/**
 * Ejecutar limpieza manual
 */
export const runTrashCleanupNow = async () => {
  logger.info('🧹 Running manual trash cleanup...');
  
  try {
    const deletedCount = await cleanExpiredTrash();
    logger.info(`✅ Manual cleanup completed. Deleted ${deletedCount} expired items.`);
    return deletedCount;
  } catch (error) {
    logger.err('❌ Error during manual cleanup:', error);
    throw error;
  }
};