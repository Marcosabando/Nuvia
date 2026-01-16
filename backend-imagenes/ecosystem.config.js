module.exports = {
  apps: [{
    name: 'nuvia-api',
    script: 'dist/server.js',  // O tu archivo de entrada
    instances: 'max',          // Usar todos los cores
    exec_mode: 'cluster',      // Modo cluster para mejor rendimiento
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',  // Reiniciar si usa más de 1GB
    env: {
      NODE_ENV: 'development',
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    error_file: '/var/log/nuvia/pm2-error.log',
    out_file: '/var/log/nuvia/pm2-out.log',
    log_file: '/var/log/nuvia/pm2-combined.log',
    time: true,
  }],

  // Configuración de despliegue (opcional)
  deploy: {
    production: {
      user: 'tu_usuario',
      host: 'tu_servidor.com',
      ref: 'origin/main',
      repo: 'https://github.com/marcosabando/nuvia.git',
      path: '/var/nuvia/app',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
    }
  }
};