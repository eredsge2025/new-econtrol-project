# Guía de Configuración de Docker

## Requisitos

Para ejecutar la base de datos local se requiere Docker Desktop.

## Instalación de Docker Desktop (Windows)

1. Descargar Docker Desktop desde: https://www.docker.com/products/docker-desktop/
2. Ejecutar el instalador
3. Reiniciar el sistema si es necesario
4. Abrir Docker Desktop y esperar a que inicie completamente

## Iniciar Servicios

Una vez Docker Desktop esté corriendo:

```bash
# Desde la raíz del proyecto
docker-compose up -d
```

Esto iniciará:
- PostgreSQL 16 en puerto 5432
- Redis 7 en puerto 6379

## Verificar que los servicios estén corriendo

```bash
docker ps
```

Deberías ver dos contenedores:
- `econtrol-postgres`
- `econtrol-redis`

## Ejecutar Migraciones de Prisma

Una vez Docker esté corriendo:

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

Esto creará todas las tablas en PostgreSQL según el esquema definido.

## Detener Servicios

```bash
docker-compose down
```

## Ver Logs

```bash
# Ver logs de todos los servicios
docker-compose logs -f

# Ver logs de PostgreSQL solamente
docker-compose logs -f postgres
```

## Conexión a la Base de Datos

**String de conexión:**
```
postgresql://econtrol:econtrol_dev_password@localhost:5432/econtrol_db
```

**Credenciales:**
- Usuario: `econtrol`
- Contraseña: `econtrol_dev_password`
- Base de datos: `econtrol_db`

Puedes conectarte usando herramientas como:
- pgAdmin
- DBeaver
- TablePlus
- Prisma Studio (`npx prisma studio`)
