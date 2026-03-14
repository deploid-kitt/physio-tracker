#!/bin/bash
# PhysioTracker Management Script

set -e

PROJECT_DIR="/root/.openclaw/workspace/projects/development/physio-tracker"
COMPOSE_FILE="docker-compose.yml"

cd "$PROJECT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

case "$1" in
    start)
        log_info "🚀 Starting PhysioTracker..."
        docker compose -f "$COMPOSE_FILE" up -d
        log_info "PhysioTracker is starting. Check status with: $0 status"
        ;;
    stop)
        log_info "⏹️  Stopping PhysioTracker..."
        docker compose -f "$COMPOSE_FILE" down
        ;;
    restart)
        log_info "🔄 Restarting PhysioTracker..."
        docker compose -f "$COMPOSE_FILE" restart
        ;;
    status)
        log_info "📊 PhysioTracker Status:"
        docker compose -f "$COMPOSE_FILE" ps
        echo ""
        log_info "Health checks:"
        curl -s http://localhost:3001/api/health 2>/dev/null && echo "" || echo "Backend: Not responding"
        ;;
    logs)
        log_info "📋 PhysioTracker Logs:"
        docker compose -f "$COMPOSE_FILE" logs -f "${@:2}"
        ;;
    build)
        log_info "🔨 Building PhysioTracker containers..."
        docker compose -f "$COMPOSE_FILE" build --no-cache
        ;;
    update)
        log_info "🔄 Updating PhysioTracker..."
        docker compose -f "$COMPOSE_FILE" down
        docker compose -f "$COMPOSE_FILE" build --no-cache
        docker compose -f "$COMPOSE_FILE" up -d
        log_info "Waiting for services to be healthy..."
        sleep 10
        $0 status
        ;;
    deploy)
        log_info "🚀 Deploying PhysioTracker to production..."
        
        # Build containers
        log_info "Building containers..."
        docker compose -f "$COMPOSE_FILE" build
        
        # Start services
        log_info "Starting services..."
        docker compose -f "$COMPOSE_FILE" up -d
        
        # Wait for health checks
        log_info "Waiting for services to be healthy..."
        sleep 30
        
        # Run database migrations
        log_info "Running database migrations..."
        docker compose -f "$COMPOSE_FILE" exec -T backend npx prisma migrate deploy || true
        
        # Seed database (only on first deploy)
        log_info "Seeding database..."
        docker compose -f "$COMPOSE_FILE" exec -T backend npm run db:seed || true
        
        log_info "✅ Deployment complete!"
        $0 status
        ;;
    seed)
        log_info "🌱 Seeding database..."
        docker compose -f "$COMPOSE_FILE" exec backend npm run db:seed
        ;;
    migrate)
        log_info "📦 Running database migrations..."
        docker compose -f "$COMPOSE_FILE" exec backend npx prisma migrate deploy
        ;;
    shell)
        log_info "🐚 Opening shell in ${2:-backend} container..."
        docker compose -f "$COMPOSE_FILE" exec "${2:-backend}" sh
        ;;
    backup)
        BACKUP_FILE="physio_backup_$(date +%Y%m%d_%H%M%S).sql"
        log_info "💾 Backing up database to $BACKUP_FILE..."
        docker compose -f "$COMPOSE_FILE" exec -T postgres pg_dump -U physio physiotracker > "$BACKUP_FILE"
        log_info "Backup saved to $BACKUP_FILE"
        ;;
    restore)
        if [ -z "$2" ]; then
            log_error "Usage: $0 restore <backup_file>"
            exit 1
        fi
        log_warn "⚠️  This will overwrite the current database!"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "📥 Restoring database from $2..."
            docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U physio physiotracker < "$2"
            log_info "Database restored"
        fi
        ;;
    clean)
        log_info "🧹 Cleaning up unused Docker resources..."
        docker system prune -f
        ;;
    reset)
        log_warn "⚠️  This will delete ALL data and rebuild!"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker compose -f "$COMPOSE_FILE" down -v
            docker compose -f "$COMPOSE_FILE" build --no-cache
            docker compose -f "$COMPOSE_FILE" up -d
            sleep 15
            docker compose -f "$COMPOSE_FILE" exec backend npm run db:seed
            log_info "Reset complete"
        fi
        ;;
    *)
        echo "PhysioTracker Management"
        echo ""
        echo "Usage: $0 {command}"
        echo ""
        echo "Commands:"
        echo "  start     - Start all services"
        echo "  stop      - Stop all services"
        echo "  restart   - Restart all services"
        echo "  status    - Show service status"
        echo "  logs      - Show and follow logs (optionally: logs backend)"
        echo "  build     - Build containers"
        echo "  update    - Rebuild and restart services"
        echo "  deploy    - Full production deployment"
        echo "  seed      - Seed the database with demo data"
        echo "  migrate   - Run database migrations"
        echo "  shell     - Open shell in container (default: backend)"
        echo "  backup    - Backup database"
        echo "  restore   - Restore database from backup"
        echo "  clean     - Clean unused Docker resources"
        echo "  reset     - Reset everything (destructive!)"
        echo ""
        echo "URL: https://physio.kitt.deploid.io"
        echo ""
        exit 1
        ;;
esac
