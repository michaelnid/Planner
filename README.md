# MIKE - Planner

Moderner Planner mit Produktverwaltung, Rezepten, Wochenplanung und Einkaufsliste.

## TechStack

| Komponente | Technologie |
|-----------|-------------|
| Backend | FastAPI (Python 3.11+) |
| Frontend | React 19 + Vite 6 |
| Datenbank | SQLite |
| Auth | JWT + HttpOnly Cookie + Bcrypt |
| Webserver | Nginx (Reverse Proxy) |
| Styles | Vanilla CSS + Self-hosted Inter Font |

## Mindestanforderungen Server

| Ressource | Minimum |
|-----------|---------|
| RAM | 1 GB |
| vCPU | 1 |
| Disk | 5 GB |
| OS | Debian 12 / Ubuntu 24.04 |
| Ports | 80, 443 |

Plesk Git kompatibel: Nein

## Installation (Produktion)

One-Line-Installer (als root auf Debian 12 / Ubuntu 24.04):

```bash
curl -sL https://raw.githubusercontent.com/michaelnid/Planner/main/install.sh | sudo bash
```

Fragt interaktiv nach Domain/IP und SSL-Konfiguration (Let's Encrypt).

## Entwicklung (lokal)

```bash
git clone https://github.com/michaelnid/Planner.git /opt/mike-planner

# Backend
cd /opt/mike-planner/backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload

# Frontend (neues Terminal)
cd /opt/mike-planner/frontend
npm install && npm run dev
```

## Update

```bash
curl -sL https://raw.githubusercontent.com/michaelnid/Planner/main/install.sh | sudo bash
```

Gleicher Befehl wie Installation. Aktualisiert Code, baut Frontend neu, behält .env und Datenbank.

## Deinstallation

```bash
systemctl stop mike-planner && systemctl disable mike-planner && rm -f /etc/systemd/system/mike-planner.service && systemctl daemon-reload && rm -f /etc/nginx/sites-enabled/mike-planner /etc/nginx/sites-available/mike-planner && nginx -t && systemctl reload nginx && rm -rf /opt/mike-planner && userdel planner 2>/dev/null; echo "Deinstallation abgeschlossen"
```
