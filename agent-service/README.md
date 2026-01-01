# eControl Agent Service (Rust)

Servicio Windows nativo escrito en Rust para controlar las PCs del LAN Center.

## Características Principales

- 🔒 Ejecución como Windows Service (privilegios SYSTEM)
- 🔌 Conexión persistente WebSocket al backend
- 💾 Base de datos SQLite local (modo offline)
- ⏱️ Session Manager con timer preciso
- 🔐 SQLite cifrado con sqlcipher

## Requisitos

- Rust 1.75+ (toolchain MSVC)
- Windows 10/11

## Compilación

```bash
cargo build
cargo build --release
```

## Ejecución (Desarrollo)

```bash
cargo run
```

## Instalación como Servicio

```bash
# TODO: Agregar comandos para instalar como servicio Windows
```

## Arquitectura

```
agent-service/
├── src/
│   ├── main.rs           # Punto de entrada
│   ├── service/          # Lógica del Windows Service
│   ├── websocket/        # Cliente WebSocket
│   ├── session/          # Session Manager
│   ├── database/         # SQLite local
│   └── http_server/      # API local para el Tray
└── Cargo.toml
```

## Variables de Entorno

Ver `.env.example` para configuración.
