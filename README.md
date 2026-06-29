# SMART MTI

Aplicacion interna de control de negocio para MTI. Centraliza oportunidades, proyectos, clientes, empleados, costes, facturacion, pipeline, reporting e integraciones operativas.

## Stack

- Next.js 14 con App Router
- React 18
- TypeScript
- Prisma
- PostgreSQL
- Tailwind CSS
- Docker Compose para entorno local con base de datos

## Requisitos

- Node.js 20 o superior
- npm
- Docker y Docker Compose, si se usa el entorno local completo
- PostgreSQL, si se ejecuta la app fuera de Docker

## Configuracion local

Instala dependencias:

```bash
npm install
```

Crea tu fichero local de variables:

```bash
cp .env.example .env
```

Revisa especialmente:

- `DATABASE_URL`
- `DIRECT_URL`
- `AUTH_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `POSTGRES_PASSWORD`

El fichero `.env` esta ignorado por Git y no debe subirse al repositorio.

## Desarrollo

Genera el cliente Prisma:

```bash
npm run db:generate
```

Arranca la aplicacion:

```bash
npm run dev
```

La app queda disponible en:

```text
http://localhost:3000
```

## Docker

Para levantar la aplicacion y PostgreSQL juntos:

```bash
npm run docker:up
```

Comandos utiles:

```bash
npm run docker:ps
npm run docker:logs
npm run docker:down
```

La documentacion detallada de Docker, PostgreSQL, migraciones y criterios de despliegue esta en [DOCKER.md](./DOCKER.md).

## Base de datos

El esquema esta definido en:

```text
prisma/schema.prisma
```

Las migraciones versionadas estan en:

```text
prisma/migrations
```

Comandos habituales:

```bash
npm run db:generate
npm run db:migrate
npm run db:push
npm run db:seed
npm run db:studio
```

Para entornos controlados se recomienda usar migraciones versionadas con `prisma migrate deploy`.

## Scripts

```bash
npm run dev          # Desarrollo local
npm run build        # Build de produccion
npm run start        # Servir build
npm run lint         # Lint Next.js
npm run db:generate  # Generar Prisma Client
npm run db:migrate   # Crear/aplicar migracion en desarrollo
npm run db:seed      # Cargar datos seed
npm run docker:up    # Levantar app + PostgreSQL
```

## Seguridad

Antes de usar el proyecto fuera de local:

- Cambiar `AUTH_SECRET`.
- Cambiar `ADMIN_USERNAME` y `ADMIN_PASSWORD`.
- Cambiar `POSTGRES_PASSWORD`.
- No exponer PostgreSQL publicamente.
- Gestionar secretos desde la plataforma de despliegue.
- Hacer backups de la base de datos.

## Estructura

```text
app/          Rutas, paginas y API routes de Next.js
components/   Componentes reutilizables
lib/          Utilidades compartidas, Prisma y seguridad
prisma/       Schema, migraciones y seed
scripts/      Scripts auxiliares
types/        Tipos compartidos
```

## Verificacion

Antes de subir cambios importantes:

```bash
npm run db:generate
npm run build
```

Si no hay base de datos local activa, algunas rutas pueden imprimir avisos durante el build al intentar consultar PostgreSQL, pero el build debe terminar correctamente.
