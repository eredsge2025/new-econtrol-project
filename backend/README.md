# Backend eControl

API backend construida con NestJS para el sistema eControl.

## Requisitos Previos

- Node.js 20+
- Docker y Docker Compose (para bases de datos locales)

## Instalación

```bash
npm install
```

## Configuración

1. Copiar `.env.example` a `.env`:
```bash
cp .env.example .env
```

2. Iniciar servicios de base de datos:
```bash
# Desde el directorio raíz del proyecto
docker-compose up -d
```

## Desarrollo

```bash
# Dev mode con hot reload
npm run start:dev

# Modo debug
npm run start:debug
```

El servidor estará disponible en `http://localhost:3001`

Endpoints de salud:
- GET `/` - Mensaje de bienvenida
- GET `/health` - Estado del servidor

## Build

```bash
npm run build
npm run start:prod
```

## Estructura

```
backend/
├── src/
│   ├── main.ts           # Punto de entrada
│   ├── app.module.ts     # Módulo raíz
│   ├── app.controller.ts # Controlador principal
│   └── app.service.ts    # Servicio principal
├── nest-cli.json         # Configuración NestJS
├── tsconfig.json         # Configuración TypeScript
└── package.json
```
