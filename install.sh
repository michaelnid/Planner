#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# MIKE - Planner - Idempotenter Installer für Debian 12
# ═══════════════════════════════════════════════════════════════
set -e

REPO="https://github.com/michaelnid/Planner.git"
APP_NAME="mike-planner"
APP_DIR="/opt/${APP_NAME}"
APP_USER="planner"

# ─── Update-Erkennung ────────────────────────────────────────
IS_UPDATE=false
if [ -f "$APP_DIR/backend/.env" ] && [ -f "/etc/nginx/sites-available/${APP_NAME}" ]; then
    IS_UPDATE=true
fi

echo ""
echo "================================================"
if [ "$IS_UPDATE" = true ]; then
    echo "  MIKE - Planner Update"
else
    echo "  MIKE - Planner Installer"
fi
echo "================================================"
echo ""

# ─── Interaktive Abfrage (nur bei Neuinstallation) ───────────
SETUP_SSL=false

if [ "$IS_UPDATE" = false ]; then
    echo "  Zugriff über:"
    echo "  1) IP-Adresse (wird automatisch erkannt)"
    echo "  2) Domain"
    echo ""
    read -rp "Auswahl [1/2]: " CHOICE < /dev/tty

    if [ "$CHOICE" = "2" ]; then
        read -rp "Domain eingeben: " HOST < /dev/tty
        if [ -z "$HOST" ]; then
            echo "Fehler: Keine Domain eingegeben."
            exit 1
        fi
        read -rp "SSL mit Let's Encrypt einrichten? (j/n): " SSL_ANSWER < /dev/tty
        if [[ "$SSL_ANSWER" =~ ^[jJyY]$ ]]; then
            SETUP_SSL=true
        fi
    else
        HOST=$(curl -s4 ifconfig.me || hostname -I | awk '{print $1}')
        echo "  -> Erkannte IP: $HOST"
    fi

    echo ""
    echo "  Host: $HOST"
    if [ "$SETUP_SSL" = true ]; then
        echo "  SSL:  Ja (Let's Encrypt)"
    else
        echo "  SSL:  Nein"
    fi
    echo ""
else
    echo "  Bestehende Konfiguration wird beibehalten."
    echo ""
fi

# ─── 1. System-Pakete ─────────────────────────────────────────
echo "[1/9] Systempakete installieren..."
apt-get update -qq
apt-get install -y -qq python3 python3-venv python3-pip nginx curl git > /dev/null

if [ "$SETUP_SSL" = true ]; then
    apt-get install -y -qq certbot python3-certbot-nginx > /dev/null
fi

# ─── 2. Node.js installieren ─────────────────────────────────
echo "[2/9] Node.js installieren..."
if ! command -v node &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt-get install -y -qq nodejs > /dev/null
fi

# ─── 3. Repository klonen / aktualisieren ────────────────────
echo "[3/9] Repository aktualisieren..."
if [ -d "$APP_DIR/.git" ]; then
    git -C "$APP_DIR" fetch --all -q
    git -C "$APP_DIR" reset --hard origin/main -q
else
    git clone "$REPO" "$APP_DIR"
fi

# ─── 4. Benutzer erstellen ────────────────────────────────────
echo "[4/9] Systembenutzer erstellen..."
if ! id "$APP_USER" &>/dev/null; then
    useradd -r -s /bin/false "$APP_USER"
fi

# ─── 5. Backend einrichten ────────────────────────────────────
echo "[5/9] Backend einrichten..."
if [ ! -d "$APP_DIR/backend/venv" ]; then
    python3 -m venv "$APP_DIR/backend/venv"
fi
"$APP_DIR/backend/venv/bin/pip" install --upgrade pip -q
"$APP_DIR/backend/venv/bin/pip" install -r "$APP_DIR/backend/requirements.txt" -q

# .env erstellen falls nicht vorhanden
if [ ! -f "$APP_DIR/backend/.env" ]; then
    SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
    if [ "$SETUP_SSL" = true ]; then
        CORS_ORIGIN="https://${HOST}"
    else
        CORS_ORIGIN="http://${HOST}"
    fi
    cat > "$APP_DIR/backend/.env" <<EOF
SECRET_KEY=${SECRET}
DATABASE_URL=sqlite:///${APP_DIR}/backend/planner.db
CORS_ORIGINS=["${CORS_ORIGIN}"]
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
UPLOAD_DIR=${APP_DIR}/backend/uploads
EOF
    echo "  -> .env mit neuem SECRET_KEY erstellt"
fi

mkdir -p "$APP_DIR/backend/uploads"

# ─── 6. Frontend bauen ───────────────────────────────────────
echo "[6/9] Frontend bauen..."
cd "$APP_DIR/frontend"
npm ci --silent
npm run build --silent

# ─── 7. Berechtigungen ───────────────────────────────────────
echo "[7/9] Berechtigungen setzen..."
chown -R "$APP_USER:$APP_USER" "$APP_DIR/backend"
chown -R "$APP_USER:www-data" "$APP_DIR/frontend"
chmod -R 755 "$APP_DIR"

# ─── 8. Systemd Service ──────────────────────────────────────
echo "[8/9] Systemd-Service konfigurieren..."
cat > /etc/systemd/system/${APP_NAME}.service <<EOF
[Unit]
Description=MIKE - Planner Backend
After=network.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}/backend
Environment=PATH=${APP_DIR}/backend/venv/bin:/usr/bin
ExecStart=${APP_DIR}/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ${APP_NAME}
systemctl restart ${APP_NAME}

# ─── 9. Nginx konfigurieren (nur bei Neuinstallation) ────────
if [ "$IS_UPDATE" = false ]; then
    echo "[9/9] Nginx konfigurieren..."
    cat > /etc/nginx/sites-available/${APP_NAME} <<EOF
server {
    listen 80;
    server_name ${HOST};

    # Frontend (SPA)
    root ${APP_DIR}/frontend/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Uploads
    location /uploads/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
    }

    # Cache static assets
    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
EOF

    ln -sf /etc/nginx/sites-available/${APP_NAME} /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl reload nginx

    # SSL einrichten
    if [ "$SETUP_SSL" = true ]; then
        echo ""
        echo "SSL-Zertifikat wird eingerichtet..."
        certbot --nginx -d "$HOST" --non-interactive --agree-tos --register-unsafely-without-email --redirect
        echo "  -> SSL aktiv"
    fi
else
    echo "[9/9] Nginx-Konfiguration beibehalten."
    systemctl reload nginx
fi

# ─── Fertig ──────────────────────────────────────────────────
echo ""
echo "================================================"
if [ "$IS_UPDATE" = true ]; then
    echo "  Update abgeschlossen!"
else
    echo "  Installation abgeschlossen!"
fi
echo "================================================"
echo ""

if [ "$IS_UPDATE" = false ]; then
    PROTOCOL="http"
    if [ "$SETUP_SSL" = true ]; then
        PROTOCOL="https"
    fi
    echo "  URL: ${PROTOCOL}://${HOST}"
    echo "  Login: admin / admin123!"
    echo ""
    echo "  Standard-Passwort unbedingt ändern!"
else
    echo "  Code aktualisiert, Frontend neu gebaut, Service neu gestartet."
    echo "  .env, Datenbank und Nginx-Konfiguration wurden beibehalten."
fi

echo ""
echo "  Befehle:"
echo "  - Status:  systemctl status ${APP_NAME}"
echo "  - Logs:    journalctl -u ${APP_NAME} -f"
echo "  - Neustart: systemctl restart ${APP_NAME}"
echo ""
