# Backend — Consultorio System

Microservicios según SDD en `../docs/backend/`.

## Servicios

| Servicio | Puerto | Stack |
|----------|--------|-------|
| api-gateway | 3000 | NestJS |
| auth-service | 3001 | NestJS |
| employees-service | 3002 | NestJS |
| patients-service | 3003 | NestJS |
| appointments-service | 3004 | NestJS |
| professionals-service | 8000 | FastAPI |

## Requisitos

- Node.js 20+
- PostgreSQL 15+
- Python 3.11+ (professionals-service)

## Base de datos (Supabase)

La conexión usa **PostgreSQL en Supabase** vía Session pooler (puerto **5432**) con `sslmode=require`.

Variable unificada en cada servicio:

```env
DATABASE_URL=postgres://postgres.[PROJECT_REF]:[PASSWORD]@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
```

Credenciales centralizadas en `backend/.env` (copiadas también en cada microservicio).

### Inicialización automática

Al arrancar **auth-service** (o `npm run start:all`), se ejecuta `scripts/init-db.sql`:

- Schemas: `app_auth` (usuarios app; `auth` está reservado por Supabase), `employees`, `patients`, `appointments`, `professionals`
- Tablas e índices (`IF NOT EXISTS`, idempotente)
- Seed de especialidades médicas
- Usuario admin: `admin@consultorio.com` / `Admin123!` (`SEED_ADMIN=true`)

Variables:

| Variable | Default | Descripción |
|----------|---------|-------------|
| `DB_AUTO_INIT` | `true` | Ejecutar `init-db.sql` al inicio |
| `SEED_ADMIN` | `true` | Crear admin si no existe |

Manual (opcional): `npm run db:init` desde `backend/`.

`professionals-service` también llama al init si el schema `auth` no existe (por si arranca solo).

> Para migraciones pesadas preferí la conexión **Session** (:5432), no Transaction pooler (:6543).

## Instalación

```bash
cd backend
npm install
npm run build:shared
```

Copiar `.env.example` a `.env` en cada servicio (o usar variables unificadas).

### Auth service

```bash
cp auth-service/.env.example auth-service/.env
```

### Professionals (Python)

```bash
cd professionals-service
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

## Ejecutar (desarrollo)

Terminal 1–5 (Nest):

```bash
npm run start:auth
npm run start:employees
npm run start:patients
npm run start:appointments
npm run start:gateway
```

O con concurrently (sin professionals):

```bash
npm run start:all
```

Terminal 6: `uvicorn app.main:app --reload --port 8000` en `professionals-service`.

## API pública

- Base: `http://localhost:3000/api/v1`
- Login: `POST /auth/login`  
  Body: `{ "email": "admin@consultorio.com", "password": "Admin123!" }`  
  (requiere `SEED_ADMIN=true` en auth-service)
- Health: `GET /api/v1/health`

## Variables compartidas

- `JWT_SECRET` — gateway + auth
- `INTERNAL_API_KEY` — comunicación entre microservicios
- `DATABASE_URL` — misma instancia PostgreSQL, schemas por servicio

## Estructura

```
backend/
├── api-gateway/
├── auth-service/
├── employees-service/
├── patients-service/
├── appointments-service/
├── professionals-service/
├── shared/
└── scripts/init-db.sql
```
