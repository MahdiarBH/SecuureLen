# SecureLens — Vulnerability Findings Dashboard

SecureLens is a portfolio project for tracking and managing **manually entered** web-security findings. It includes a Django REST API, JWT authentication, a React dashboard, severity/status filters, metrics, and CSV export.

> Important scope note: SecureLens does **not** scan websites or discover vulnerabilities automatically. It is a findings-management dashboard. Only add assets you own or are authorized to assess.

## Features
- Account registration and JWT login/refresh
- Per-user private findings (users can only access their own records)
- Create, edit, delete, search, and filter findings
- Severity and status metrics
- CSV export of the signed-in user's findings
- Django admin interface
- SQLite for local development
- Django API tests and frontend build scripts

## Stack
- Python 3.11+
- Django 5.2, Django REST Framework, Simple JWT
- React + Vite
- SQLite (local development)

## Project structure
```text
securelens/
├── backend/
│   ├── config/
│   ├── findings/
│   ├── manage.py
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    ├── package.json
    └── .env.example
```

## Run locally

### 1. Backend
Use Python 3.11 or newer.

```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env   # Windows: copy .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

The API runs at `http://127.0.0.1:8000/`. Admin: `http://127.0.0.1:8000/admin/`.

### 2. Frontend
Open another terminal:

```bash
cd frontend
npm install
cp .env.example .env   # Windows: copy .env.example .env
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`).
Register a user from the app, then sign in.

## API endpoints
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register/` | Register an account |
| POST | `/api/auth/token/` | Obtain JWT access/refresh tokens |
| POST | `/api/auth/token/refresh/` | Refresh access token |
| GET/POST | `/api/findings/` | List/create findings |
| GET/PATCH/DELETE | `/api/findings/{id}/` | Read/update/delete one finding |
| GET | `/api/findings/stats/` | Summary metrics |
| GET | `/api/findings/export_csv/` | Export own findings as CSV |

List filters: `?severity=high`, `?status=open`, and search `?search=login`.

## Tests and build
Backend:
```bash
cd backend
python manage.py test
```

Frontend production build:
```bash
cd frontend
npm run build
```

## Before public deployment
This project is configured for local development, not a one-click production launch. Before publishing:
1. Set a long, unique `SECRET_KEY` via environment variable.
2. Set `DEBUG=False`.
3. Set `ALLOWED_HOSTS` to your actual hostnames.
4. Set `CORS_ALLOWED_ORIGINS` to your actual frontend origin(s).
5. Use HTTPS and secure cookie / proxy settings appropriate to your hosting provider.
6. Replace SQLite with PostgreSQL for a serious multi-user deployment.
7. Run `python manage.py check --deploy`.
8. Configure static files (`collectstatic`) and a production server such as Gunicorn behind a reverse proxy.
9. Add rate limiting, email verification/password reset, backups, monitoring, and dependency updates before accepting real users.
10. Do not expose the Django development server to the public internet.

## Portfolio description (edit to match what you personally tested)
**SecureLens — Vulnerability Findings Dashboard**  
Built a Django REST API and React dashboard for managing security findings, with JWT authentication, per-user data isolation, severity/status filtering, summary metrics, and CSV export. Includes automated API tests and setup/deployment documentation.

Only claim features you have run and verified yourself. This app records findings; it does not perform automated penetration testing.
