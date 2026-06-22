# Consultorio System — Backend (Microservicios)

Este repositorio contiene el backend del proyecto Consultorio System, organizado como un monorepo de microservicios. 

## Resumen ejecutivo (para portfolio)

- Arquitectura: monorepo con múltiples microservicios desacoplados y un `api-gateway` que unifica las APIs.
- Tecnologías principales: **NestJS** (API gateway y servicios en Node), **FastAPI** (servicio de profesionales en Python), **PostgreSQL** (base de datos principal).
- Objetivo: administrar autenticación, empleados, pacientes, profesionales y gestión de turnos en un consultorio.

## Servicios y puertos (desarrollo)

| Servicio | Puerto | Tecnología |
|---|---:|---|
| api-gateway | 3000 | NestJS
| auth-service | 3001 | NestJS
| employees-service | 3002 | NestJS
| patients-service | 3003 | NestJS
| appointments-service | 3004 | NestJS
| professionals-service | 8000 | FastAPI

## Requisitos

- Node.js 20+
- PostgreSQL 15+ 
- Python 3.11+ (solo para `professionals-service`)

## Por qué se eligieron estas herramientas 

- NestJS: estructura modular y patrón opinado que facilita microservicios, inyección de dependencias y pruebas; ideal para servicios REST escalables.
- FastAPI: rendimiento y desarrollo rápido para APIs en Python; útil para cargas CPU/IO específicas o integración con bibliotecas científicas/ML si fuese necesario.
- PostgreSQL / Supabase: robustez relacional, soporte para esquemas por servicio y conexión gestionada; Supabase facilita hosting y autenticación en proyectos prototipo.
- Monorepo + `shared`: compartir utilidades, DTOs y tipos entre servicios reduce duplicación y mantiene consistencia en contratos API.

## Inicialización de la base de datos

Hay un script de inicialización `scripts/init-db.sql` que crea schemas y tablas idempotentemente y puede sembrar datos de ejemplo (incluido un usuario admin en dev).

Variables relevantes:

- `DATABASE_URL` — URL de conexión a PostgreSQL (se usa la misma instancia, cada servicio usa su schema)
- `DB_AUTO_INIT` — si `true`, ejecuta `init-db.sql` al arrancar
- `SEED_ADMIN` — si `true`, crea el usuario admin en dev

## Quick start (desarrollo)

1. Instalar dependencias generales:

```bash
cd backend_microservicios
npm install
```

2. Copiar archivos de entorno (`.env.example` → `.env`) según cada servicio:

```bash
cp .env.example .env
# o copiar el .env.example dentro de cada subcarpeta de servicio
```

3. Ejecutar servicios Nest (ejemplo):

```bash
npm run start:all
```

4. Ejecutar `professionals-service` (Python):

```bash
cd professionals-service
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Nota: algunos scripts asumen variables de entorno y la base de datos disponible.

## Endpoints útiles

- `POST /api/v1/auth/login` — autenticación (usar credenciales seed en dev)
- `GET /api/v1/health` — health check del gateway

## Estructura del monorepo

```
backend_microservicios/
├── api-gateway/
├── auth-service/
├── employees-service/
├── patients-service/
├── appointments-service/
├── professionals-service/
├── shared/
└── scripts/init-db.sql
```

