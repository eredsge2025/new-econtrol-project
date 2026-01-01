use anyhow::{Result, Context};
use std::fs;
use std::time::Duration;
use tokio::time;
use tracing::{info, error, warn, debug};
use mac_address::get_mac_address;
use local_ip_address::local_ip;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use axum::response::IntoResponse;

mod security;
use security::{start_keyboard_guard, set_kiosk_mode};

#[derive(Clone)]
struct AppState {
    status: std::sync::Arc<tokio::sync::Mutex<Option<String>>>,
    token: std::sync::Arc<tokio::sync::Mutex<Option<String>>>,
    pc_id: std::sync::Arc<tokio::sync::Mutex<Option<String>>>,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Config {
    lan_id: String,
    api_key: String,
    server_url: String,
    heartbeat_interval: u64,
    ui_path: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RegisterRequest {
    lan_id: String,
    mac_address: String,
    ip_address: String,
    hostname: String,
    agent_version: String,
    os: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct RegisterResponse {
    id: String,
    name: String,
    zone_id: String,
    message: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct HeartbeatRequest {
    ip_address: String,
    status: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
struct LoginRequest {
    identifier: String,
    password: String,
}

#[derive(Debug, Deserialize, Serialize)]
struct LoginResponse {
    access_token: String,
    user: serde_json::Value,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct StartSessionRequest {
    pc_id: String,
    pricing_type: String,
}

async fn maintain_ui(config: &Config) {
    let ui_path = std::path::Path::new(&config.ui_path);
    if ui_path.exists() {
        match std::process::Command::new(ui_path).spawn() {
            Ok(_) => {},
            Err(e) => error!("Error al lanzar UI: {}", e),
        }
    } else {
        warn!("Ejecutable de UI no encontrado en: {:?}", ui_path);
    }
}

async fn get_pc_metadata() -> Result<(String, String, String)> {
    let mac = get_mac_address()
        .map_err(|e| anyhow::anyhow!("No se pudo obtener la MAC: {}", e))?
        .ok_or_else(|| anyhow::anyhow!("No hay interfaces de red con MAC"))?
        .to_string();
    
    let ip = local_ip()
        .map_err(|e| anyhow::anyhow!("No se pudo obtener la IP local: {}", e))?
        .to_string();
    
    let hostname = hostname::get()?
        .to_string_lossy()
        .to_string();

    Ok((mac, ip, hostname))
}

async fn register_pc(client: &Client, config: &Config) -> Result<RegisterResponse> {
    let (mac, ip, hostname) = get_pc_metadata().await?;
    
    let payload = RegisterRequest {
        lan_id: config.lan_id.clone(),
        mac_address: mac,
        ip_address: ip,
        hostname,
        agent_version: env!("CARGO_PKG_VERSION").to_string(),
        os: std::env::consts::OS.to_string(),
    };

    info!("Intentando registro en {}...", config.server_url);

    let res = client
        .post(format!("{}/pcs/register", config.server_url))
        .header("x-api-key", &config.api_key)
        .json(&payload)
        .send()
        .await
        .context("Error al enviar request de registro")?;

    if !res.status().is_success() {
        let status = res.status();
        let err_text = res.text().await?;
        return Err(anyhow::anyhow!("Servidor retornó error {}: {}", status, err_text));
    }

    let pc_info: RegisterResponse = res.json().await?;
    info!("✅ PC Registrada: {} (ID: {})", pc_info.name, pc_info.id);
    info!("Mensaje del servidor: {}", pc_info.message);

    Ok(pc_info)
}

async fn send_heartbeat(client: &Client, pc_id: &str, config: &Config) -> Result<()> {
    let (_, ip, _) = get_pc_metadata().await?;
    
    let payload = HeartbeatRequest {
        ip_address: ip,
        status: None, 
    };

    let res = client
        .patch(format!("{}/pcs/{}/heartbeat", config.server_url, pc_id))
        .header("x-api-key", &config.api_key)
        .json(&payload)
        .send()
        .await
        .context("Error al enviar heartbeat")?;

    if res.status().is_success() {
        debug!("💓 Heartbeat enviado exitosamente");
    } else {
        warn!("⚠️ Heartbeat falló con estado: {}", res.status());
    }

    Ok(())
}

async fn send_final_status(client: &Client, pc_id: &str, config: &Config, status: &str) -> Result<()> {
    let payload = HeartbeatRequest {
        ip_address: "".to_string(), 
        status: Some(status.to_string()),
    };

    let _ = client
        .patch(format!("{}/pcs/{}/heartbeat", config.server_url, pc_id))
        .header("x-api-key", &config.api_key)
        .json(&payload)
        .send()
        .await;

    Ok(())
}

async fn get_status(
    axum::extract::State(state): axum::extract::State<AppState>,
) -> axum::Json<serde_json::Value> {
    let status = state.status.lock().await;
    axum::Json(serde_json::json!({
        "status": *status,
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

// HANDLER DE LOGIN
async fn handle_login(
    axum::extract::State(state): axum::extract::State<AppState>,
    axum::Json(payload): axum::Json<LoginRequest>,
) ->  impl axum::response::IntoResponse {
    info!("🔐 Intento de login para: {}", payload.identifier);

    let config_content = match std::fs::read_to_string("config.json") {
        Ok(c) => c,
        Err(_) => return (axum::http::StatusCode::INTERNAL_SERVER_ERROR, "Config error").into_response(),
    };
    let config: Config = match serde_json::from_str(&config_content) {
        Ok(c) => c,
        Err(_) => return (axum::http::StatusCode::INTERNAL_SERVER_ERROR, "Config parse error").into_response(),
    };

    let client = Client::new();
    
    // 1. Authenticate with Backend
    let auth_url = format!("{}/auth/login", config.server_url);
    let auth_res = match client.post(&auth_url)
        .json(&payload)
        .send()
        .await {
            Ok(r) => r,
            Err(_) => return (axum::http::StatusCode::BAD_GATEWAY, "Backend unreachable").into_response(),
    };

    if !auth_res.status().is_success() {
        return (axum::http::StatusCode::UNAUTHORIZED, "Invalid credentials").into_response();
    }

    let login_data: LoginResponse = match auth_res.json().await {
        Ok(d) => d,
        Err(_) => return (axum::http::StatusCode::INTERNAL_SERVER_ERROR, "Invalid backend response").into_response(),
    };

    // 2. Start Session (Async cleanup)
    let pc_id_opt = {
        let lock = state.pc_id.lock().await;
        lock.clone()
    };

    if let Some(pc_id) = pc_id_opt {
        info!("Iniciando sesión para PC ID: {}", pc_id);
        let session_url = format!("{}/sessions/start", config.server_url);
        let start_req = StartSessionRequest {
            pc_id,
            pricing_type: "OPEN".to_string(), // Por defecto Open Session
        };
        
        let session_res = client.post(&session_url)
            .header("Authorization", format!("Bearer {}", login_data.access_token))
            .json(&start_req)
            .send()
            .await;
            
        if let Err(e) = session_res {
             error!("Error iniciando sesión: {}", e);
             return (axum::http::StatusCode::INTERNAL_SERVER_ERROR, "Failed to start session").into_response();
        } else if let Ok(resp) = session_res {
             if !resp.status().is_success() {
                  let err_txt = resp.text().await.unwrap_or_default();
                  error!("Backend rechazó inicio de sesión: {}", err_txt);
                  return (axum::http::StatusCode::INTERNAL_SERVER_ERROR, "Backend refused session").into_response();
             }
        }
    } else {
        error!("No PC ID available for session start");
        return (axum::http::StatusCode::INTERNAL_SERVER_ERROR, "Agent not registered").into_response();
    }
    
    // 3. Update State & Security
    {
        let mut token_lock = state.token.lock().await;
        *token_lock = Some(login_data.access_token.clone());
        
        let mut status_lock = state.status.lock().await;
        *status_lock = Some("SESSION_ACTIVE".to_string());
    }

    // Desbloquear Kiosco
    set_kiosk_mode(false);
    info!("🔓 Sesión iniciada para {}. Kiosco DESACTIVADO.", payload.email);

    (axum::http::StatusCode::OK, axum::Json(login_data)).into_response()
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter("econtrol_agent_service=debug,info")
        .init();

    info!("🚀 eControl Agent Service v{}", env!("CARGO_PKG_VERSION"));

    // 1. Cargar configuración
    let config_path = "config.json";
    let config_str = fs::read_to_string(config_path)
        .context("No se pudo encontrar config.json. Asegúrate de que el archivo exista en la raíz.")?;
    let config: Config = serde_json::from_str(&config_str)
        .context("Error al parsear config.json")?;

    info!("Configuración cargada. LAN ID: {}", config.lan_id);

    // Estado compartido
    let app_state = AppState {
        status: std::sync::Arc::new(tokio::sync::Mutex::new(None)),
        token: std::sync::Arc::new(tokio::sync::Mutex::new(None)),
        pc_id: std::sync::Arc::new(tokio::sync::Mutex::new(None)),
    };

    // Configurar CORS
    let cors = tower_http::cors::CorsLayer::new()
        .allow_origin(tower_http::cors::Any)
        .allow_methods(tower_http::cors::Any)
        .allow_headers(tower_http::cors::Any);

    // Iniciar servidor axum en background
    let app = axum::Router::new()
        .route("/status", axum::routing::get(get_status))
        .route("/login", axum::routing::post(handle_login))
        .layer(cors)
        .with_state(app_state.clone());

    let listener = tokio::net::TcpListener::bind("127.0.0.1:9876").await?;
    info!("🔗 Maestro escuchando en http://127.0.0.1:9876");
    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });

    // 2. Iniciar Watchdog en tarea separada
    let config_watchdog = config.clone();
    tokio::spawn(async move {
        let mut interval = time::interval(Duration::from_secs(3));
        info!("👀 Watchdog iniciado (3s check)");
        loop {
            interval.tick().await;
            maintain_ui(&config_watchdog).await;
        }
    });

    // 2.1 Iniciar Guardián de Teclado (Thread de Windows Hooks)
    start_keyboard_guard();

    let client = Client::builder()
        .timeout(Duration::from_secs(10))
        .build()?;

    // 3. Bucle Principal de Lógica de Negocio (Registro + Heartbeat)
    let mut pc_info: Option<RegisterResponse> = None;
    let mut heartbeat_interval = time::interval(Duration::from_secs(config.heartbeat_interval));

    info!("🔄 Iniciando bucle principal de servicio...");

    loop {
        tokio::select! {
             _ = tokio::signal::ctrl_c() => {
                warn!("🛑 Señal de apagado recibida, notificando al servidor...");
                if let Some(info) = &pc_info {
                    let _ = send_final_status(&client, &info.id, &config, "OFFLINE").await;
                }
                break;
            }
            _ = heartbeat_interval.tick() => {
                if let Some(info) = &pc_info {
                    match send_heartbeat(&client, &info.id, &config).await {
                        Ok(_) => {
                             let mut s = app_state.status.lock().await;
                             // Si NO estamos en sesion activa y NO estamos online, ponemos online
                             // PERO si estamos en SESSION_ACTIVE, NO cambiamos a ONLINE
                             let current_status = s.clone();
                             
                             if current_status.as_deref() != Some("ONLINE") && current_status.as_deref() != Some("SESSION_ACTIVE") {
                                 // Recuperando conexion
                                 *s = Some("ONLINE".to_string());
                                 info!("✅ Conexión recuperada (ONLINE)");
                                 set_kiosk_mode(true); 
                             }
                        },
                        Err(e) => {
                            error!("❌ Error en heartbeat: {}", e);
                            let mut s = app_state.status.lock().await;
                            if s.as_deref() != Some("DISCONNECTED") {
                                *s = Some("DISCONNECTED".to_string());
                                warn!("⚠️ Estado actualizado a DISCONNECTED por fallo de heartbeat");
                            }
                        }
                    }
                } else {
                    match register_pc(&client, &config).await {
                        Ok(info) => {
                            {
                                let mut s = app_state.status.lock().await;
                                *s = Some("ONLINE".to_string());
                                let mut id = app_state.pc_id.lock().await;
                                *id = Some(info.id.clone());
                            }
                            pc_info = Some(info);
                            set_kiosk_mode(true); 
                        },
                        Err(_) => {}
                    }
                }
            }
        }
    }

    set_kiosk_mode(false); 
    Ok(())
}
