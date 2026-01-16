#!/bin/bash
# ============================================
# HEALTH CHECK AUTOMÁTICO - NUVIA
# ============================================

set -euo pipefail

# Configuración
HEALTH_URL="http://localhost:3000/health"
LOG_FILE="/var/log/nuvia/health-check.log"
MAX_ATTEMPTS=3
ATTEMPT=1

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Intentar hasta 3 veces
while [[ $ATTEMPT -le $MAX_ATTEMPTS ]]; do
    log "🔍 Intentando health check (intento $ATTEMPT/$MAX_ATTEMPTS)"
    
    # Hacer la petición con timeout
    if curl -f -s --max-time 10 "$HEALTH_URL" > /dev/null; then
        log "✅ API está saludable"
        exit 0
    fi
    
    log "❌ Health check falló en intento $ATTEMPT"
    ATTEMPT=$((ATTEMPT + 1))
    
    # Esperar 5 segundos antes de reintentar
    sleep 5
done

# Si llegamos aquí, todos los intentos fallaron
log "🚨 CRÍTICO: Todos los health checks fallaron - Reiniciando servicio"

# Reiniciar el servicio (ajusta según tu sistema)
if systemctl is-active --quiet nuvia-api; then
    systemctl restart nuvia-api
    log "🔄 Servicio nuvia-api reiniciado"
else
    log "⚠️  Servicio nuvia-api no está activo"
fi

exit 1