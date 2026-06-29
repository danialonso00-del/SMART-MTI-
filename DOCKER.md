# Docker y PostgreSQL

Este proyecto ya usa Prisma con PostgreSQL. La configuración Docker levanta:

- `app`: aplicación Next.js en `http://localhost:3000`.
- `db`: PostgreSQL 16 con volumen persistente.

## Resumen de mejoras

Se ha añadido una configuración de despliegue local con Docker Compose y PostgreSQL, manteniendo la base de datos en un servicio separado y accesible por la aplicación mediante la red interna de Docker.

También se ha añadido una migración inicial de Prisma para que el esquema de base de datos quede versionado en el repositorio. Por defecto, el contenedor aplica migraciones con `prisma migrate deploy`, que es una opción más adecuada para despliegues controlados que sincronizar directamente con `prisma db push`.

La configuración queda preparada para separar variables locales y de producción:

- `.env`: variables locales, ignoradas por Git.
- `.env.example`: plantilla para desarrollo.
- `.env.production.example`: plantilla orientativa para producción.

El acceso inicial en local se mantiene simple para facilitar pruebas, pero debe cambiarse antes de cualquier despliegue real.

## Estado actual

Se ha dejado preparada una configuración inicial con Docker y PostgreSQL para que la aplicación pueda levantarse en un entorno controlado con Docker Compose.

La base de datos ya no queda planteada como un servicio que deba exponerse publicamente. En local, PostgreSQL se publica solo en `127.0.0.1:5432`; dentro de Docker, la aplicación accede a la base de datos mediante la red interna de Compose usando el host `db`.

Para producción, la recomendación es mantener la base de datos accesible solo desde la aplicación o desde un entorno controlado, como una red privada, VPN o infraestructura interna. No se recomienda exponer PostgreSQL directamente a Internet.

## Arranque local

```bash
docker compose up --build
```

La aplicación aplica el esquema Prisma al arrancar con migraciones Prisma.

Por defecto, el entorno local usa `PRISMA_SCHEMA_SYNC=migrate`. Esto ejecuta `prisma migrate deploy` y aplica las migraciones versionadas incluidas en `prisma/migrations`.

Para prototipos locales se puede cambiar temporalmente a `PRISMA_SCHEMA_SYNC=push`, que sincroniza el esquema con `prisma db push` sin crear migraciones. En produccion conviene mantener `migrate`.

## Primer acceso

Para desarrollo local se puede acceder inicialmente con:

```text
Usuario: admin
Password: admin123
```

Estas credenciales estan en el fichero `.env`, que esta excluido de Git. Antes de usar el proyecto fuera de local hay que cambiar `ADMIN_PASSWORD` y generar un `AUTH_SECRET` seguro.

## Variables recomendadas

Para no usar los valores por defecto, crea un `.env` local:

```env
AUTH_SECRET="genera-un-secreto-largo-y-aleatorio"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="cambia-esta-password"
POSTGRES_DB="mti_business_control"
POSTGRES_USER="mti_app"
POSTGRES_PASSWORD="cambia-esta-password-de-postgres"
PRISMA_SCHEMA_SYNC="migrate"
FACTORIAL_API_KEY=""
FACTORIAL_COMPANY_ID=""
```

Para produccion hay un ejemplo separado en `.env.production.example`.

## Base de datos

La base de datos se publica solo en `127.0.0.1:5432` para desarrollo local. En producción conviene no exponer ese puerto públicamente y permitir acceso solo desde la aplicación, una red privada o VPN.

La configuración incluida usa:

- Imagen `postgres:16-alpine`.
- Base de datos `mti_business_control`.
- Usuario de aplicación `mti_app`.
- Volumen Docker `postgres_data` para persistir datos.
- Healthcheck con `pg_isready` antes de arrancar la aplicación.

El usuario, password y nombre de base de datos salen de variables `POSTGRES_DB`, `POSTGRES_USER` y `POSTGRES_PASSWORD`. Los valores por defecto solo deberian usarse en local.

## Criterios de despliegue

Antes de llevarlo a producción conviene revisar:

- Cambiar `AUTH_SECRET`, `ADMIN_USERNAME` y `ADMIN_PASSWORD`.
- Sustituir la contraseña por defecto de PostgreSQL.
- No publicar el puerto `5432` en una IP publica.
- Usar secretos o variables de entorno gestionadas por la plataforma de despliegue.
- Usar migraciones Prisma versionadas con `PRISMA_SCHEMA_SYNC=migrate`.
- Hacer backup del volumen/base de datos.

## Comandos útiles

```bash
docker compose ps
docker compose logs -f app
docker compose exec app npx prisma studio
docker compose down
docker compose down -v
```

`docker compose down -v` borra también los datos de PostgreSQL.
