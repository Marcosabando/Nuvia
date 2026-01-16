#!/bin/bash

# ============================================
# SCRIPT DE CONFIGURACIÓN PARA SERVIDOR NUVIA
# ============================================

set -euo pipefail

echo "🔧 Configurando servidor Nuvia..."

# 1. Crear estructura de directorios
echo "📁 Creando estructura de directorios..."
sudo mkdir -p /var/nuvia/{uploads,backups,logs,temp}
sudo mkdir -p /var/nuvia/uploads/{users,temp,trash}

# 2. Establecer permisos (usuario: www-data o el que uses)
echo "🔐 Estableciendo permisos..."
sudo chown -R $USER:www-data /var/nuvia
sudo chmod -R 750 /var/nuvia
sudo chmod -R 770 /var/nuvia/uploads  # Escritura para uploads

# 3. Configurar logs
echo "📝 Configurando sistema de logs..."
sudo touch /var/log/nuvia/app.log
sudo touch /var/log/nuvia/error.log
sudo chown $USER:www-data /var/log/nuvia/*.log
sudo chmod 664 /var/log/nuvia/*.log

# 4. Configurar logrotate
echo "🔄 Configurando logrotate..."
sudo tee /etc/logrotate.d/nuvia > /dev/null <<EOF
/var/log/nuvia/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 664 $USER www-data
    sharedscripts
    postrotate
        systemctl reload nuvia.service > /dev/null 2>&1 || true
    endscript
}
EOF

# 5. Instalar MySQL si no está instalado
if ! command -v mysql &> /dev/null; then
    echo "🗄️ Instalando MySQL..."
    sudo apt-get update
    sudo apt-get install -y mysql-server
    
    echo "🔧 Configurando MySQL..."
    sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'temp_password';"
    sudo mysql -e "FLUSH PRIVILEGES;"
    
    # Crear base de datos y usuario
    sudo mysql -e "CREATE DATABASE IF NOT EXISTS nuvia_production;"
    sudo mysql -e "CREATE USER IF NOT EXISTS 'nuvia_user'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';"
    sudo mysql -e "GRANT ALL PRIVILEGES ON nuvia_production.* TO 'nuvia_user'@'localhost';"
    sudo mysql -e "FLUSH PRIVILEGES;"
fi

# 6. Instalar Node.js si no está instalado
if ! command -v node &> /dev/null; then
    echo "📦 Instalando Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 7. Instalar PM2 para gestión de procesos
if ! command -v pm2 &> /dev/null; then
    echo "⚡ Instalando PM2..."
    sudo npm install -g pm2
    sudo pm2 startup
fi

# 8. Configurar firewall
echo "🛡️ Configurando firewall..."
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 3000/tcp  # API
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw --force enable

# 9. Configurar Nginx como proxy inverso (opcional pero recomendado)
if ! command -v nginx &> /dev/null; then
    echo "🌐 Instalando Nginx..."
    sudo apt-get install -y nginx
    
    sudo tee /etc/nginx/sites-available/nuvia > /dev/null <<EOF
server {
    listen 80;
    server_name tudominio.com www.tudominio.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Para servir archivos estáticos directamente desde Nginx
    location /uploads/ {
        alias /var/nuvia/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        
        # Protección básica
        internal;
        
        # Solo permitir solicitudes con referer válido o token
        valid_referers server_names;
        if (\$invalid_referer) {
            return 403;
        }
    }
}
EOF

    sudo ln -sf /etc/nginx/sites-available/nuvia /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx
fi

# 10. Configurar SSL con Let's Encrypt (opcional)
read -p "¿Deseas configurar SSL con Let's Encrypt? (s/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    if ! command -v certbot &> /dev/null; then
        sudo apt-get install -y certbot python3-certbot-nginx
    fi
    sudo certbot --nginx -d tudominio.com -d www.tudominio.com
fi

echo "✅ Configuración del servidor completada!"
echo ""
echo "📋 Pasos siguientes:"
echo "1. Copia tu código a /var/nuvia/app"
echo "2. Configura el archivo .env.production"
echo "3. Instala dependencias: npm install"
echo "4. Ejecuta migraciones de base de datos"
echo "5. Inicia con PM2: pm2 start ecosystem.config.js"