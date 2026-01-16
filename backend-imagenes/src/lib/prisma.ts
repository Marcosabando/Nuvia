import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['info', 'warn', 'error'] 
    : ['error'],
})

// Manejar cierre de conexiones
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

export default prisma