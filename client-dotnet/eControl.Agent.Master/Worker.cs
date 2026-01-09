using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using eControl.Agent.Master.Services;
using eControl.Agent.Shared;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Microsoft.Win32;
using System.Diagnostics;

namespace eControl.Agent.Master
{
    public class Worker : BackgroundService
    {
        private readonly ILogger<Worker> _logger;
        private ApiService? _apiService;
        private HardwareService _hardwareService;
        private SecurityService _securityService;
        private PipeServerService _pipeServer;
        private SocketService? _socketService;
        
        private ClientConfig _config = new();
        private RegisterResponse? _pcInfo;
        private AgentStatusInternal _currentStatus = AgentStatusInternal.LOCKED;
        private bool _isShuttingDown = false;
        private Process? _uiProcess;
        private string _currentSessionData = "{}"; // JSON cache

        private readonly ILoggerFactory _loggerFactory;
        private DateTime _lastLaunchTime = DateTime.MinValue;

        public Worker(ILogger<Worker> logger, ILoggerFactory loggerFactory)
        {
            _logger = logger;
            _loggerFactory = loggerFactory;
            _hardwareService = new HardwareService();
            _securityService = new SecurityService();

            _pipeServer = new PipeServerService(logger);
            _pipeServer.OnMessageReceived += HandlePipeMessage;

            SystemEvents.SessionEnding += OnSessionEnding;
        }

        private async Task<string> HandlePipeMessage(PipeMessage message)
        {
            _logger.LogInformation("📩 Received pipe message: {Type}", message.Type);

            switch (message.Type)
            {
                case PipeMessageType.GetPcInfo:
                    var pcName = _pcInfo?.PcName ?? "Unknown PC";
                    var pcId = _pcInfo?.PcId ?? "";
                    return JsonConvert.SerializeObject(new PcInfoResponse { PcId = pcId, PcName = pcName });

                case PipeMessageType.GetSessionStatus:
                    try
                    {
                        if (string.IsNullOrEmpty(_currentSessionData) || _currentSessionData == "{}")
                        {
                            return JsonConvert.SerializeObject(new SessionStatusResponse 
                            { 
                                IsActive = false, 
                                IsLocked = _currentStatus == AgentStatusInternal.LOCKED 
                            });
                        }

                        dynamic pcData = JsonConvert.DeserializeObject(_currentSessionData)!;
                        dynamic? session = null;
                        
                        // Try to find active session
                        if (pcData.sessions != null)
                        {
                            foreach(var s in pcData.sessions) 
                            { 
                                if (s.status == "ACTIVE") { session = s; break; } 
                            }
                        }

                            if (session != null)
                        {
                            DateTime? expiresAt = null;
                            if (session.expiresAt != null && session.expiresAt.Type != Newtonsoft.Json.Linq.JTokenType.Null)
                            {
                                expiresAt = (DateTime)session.expiresAt;
                            }

                            DateTime? startedAt = null;
                            if (session.startedAt != null && session.startedAt.Type != Newtonsoft.Json.Linq.JTokenType.Null)
                            {
                                startedAt = (DateTime)session.startedAt;
                            }

                            double remaining = 0;

                            if (expiresAt.HasValue)
                            {
                                var utcNow = DateTime.UtcNow;
                                var universalExpires = expiresAt.Value.ToUniversalTime();
                                _logger.LogInformation($"🕒 Timer Debug Logic:\n" +
                                                       $"   - Incoming ExpiresAt: {expiresAt.Value:o} (Kind: {expiresAt.Value.Kind})\n" +
                                                       $"   - Converted Universal: {universalExpires:o}\n" +
                                                       $"   - Current UtcNow: {utcNow:o}\n" +
                                                       $"   - Diff Seconds: {(universalExpires - utcNow).TotalSeconds}");
                                
                                remaining = (universalExpires - utcNow).TotalSeconds;
                                if (remaining < 0) remaining = 0;
                            }
                            else if (startedAt.HasValue)
                            {
                                // Open session
                                remaining = (DateTime.Now - startedAt.Value).TotalSeconds;
                            }

                            string activeUser = "";
                            decimal userBalance = 0;
                            if (pcData.activeUser != null && pcData.activeUser.Type != Newtonsoft.Json.Linq.JTokenType.Null)
                            {
                                activeUser = (string)pcData.activeUser.username ?? (string)pcData.activeUser.email ?? "User";
                                if (pcData.activeUser.balance != null && pcData.activeUser.balance.Type != Newtonsoft.Json.Linq.JTokenType.Null)
                                {
                                    userBalance = (decimal)pcData.activeUser.balance;
                                }
                            }

                            return JsonConvert.SerializeObject(new SessionStatusResponse
                            {
                                IsActive = true,
                                IsLocked = false,
                                ExpiresAt = expiresAt,
                                StartedAt = startedAt,
                                RemainingSeconds = remaining,
                                ActiveUser = activeUser,
                                UserBalance = userBalance
                            });
                        }
                    }
                    catch (Exception ex)
                    {
                         _logger.LogError(ex, "Error parsing session status");
                    }
                     return JsonConvert.SerializeObject(new SessionStatusResponse 
                            { 
                                IsActive = false, 
                                IsLocked = _currentStatus == AgentStatusInternal.LOCKED 
                            });

                case PipeMessageType.LoginRequest:
                    LogToFile($"Pipe: LoginRequest received. Payload: {message.Payload}");
                    var loginData = JsonConvert.DeserializeObject<LoginRequest>(message.Payload);
                    if (loginData != null && _apiService != null)
                    {
                        // INJECT PC ID
                        if (_pcInfo != null)
                        {
                            loginData.PcId = _pcInfo.PcId;
                        }
                        else 
                        {
                            LogToFile("Pipe: LoginRequest WARNING - _pcInfo is NULL");
                        }

                        var result = await _apiService.LoginAsync(loginData);
                        if (result != null && result.Success)
                        {
                            _logger.LogInformation("🔑 Login successful for {Identifier}", loginData.Identifier);
                            LogToFile($"Pipe: Login successful for {loginData.Identifier}");
                            _currentStatus = AgentStatusInternal.AUTHENTICATED;
                        }
                        else 
                        {
                            LogToFile($"Pipe: Login FAILED: {result?.Message}");
                        }
                        return JsonConvert.SerializeObject(result);
                    }
                    break;

                case PipeMessageType.StartSessionRequest:
                    LogToFile($"Pipe: StartSessionRequest received. CurrentStatus: {_currentStatus}");
                    if (_currentStatus == AgentStatusInternal.AUTHENTICATED || _currentStatus == AgentStatusInternal.LOCKED)
                    {
                        _logger.LogInformation("⏳ Starting Session (Unlocking Kiosk)...");
                        LogToFile("Pipe: StartSessionRequest - Success, unlocking kiosk mode.");
                        _currentStatus = AgentStatusInternal.SESSION_ACTIVE;
                        _securityService.SetKioskMode(false); // Desbloqueo Real
                        return JsonConvert.SerializeObject(new { Success = true });
                    }
                    LogToFile($"Pipe: StartSessionRequest - Rejected. Reason: Must be authenticated. Current: {_currentStatus}");
                    return JsonConvert.SerializeObject(new { Success = false, Message = "Must be authenticated first" });

                case PipeMessageType.LogoutRequest:
                    LogToFile("Pipe: LogoutRequest received.");
                    _logger.LogInformation("🚪 Logout Requested. Notifying backend and locking system.");
                    if (_pcInfo != null && _apiService != null)
                    {
                        _ = _apiService.LogoutPcAsync(_pcInfo.PcId);
                    }
                    _currentStatus = AgentStatusInternal.LOCKED;
                    _securityService.SetKioskMode(true);
                    return JsonConvert.SerializeObject(new { Success = true });

                case PipeMessageType.StatusUpdate:
                    return _currentStatus.ToString();

                case PipeMessageType.GetRates:
                    LogToFile($"Pipe: GetRates received. _pcInfo is {(_pcInfo == null ? "NULL" : "OK")}");
                     if (_pcInfo != null && _apiService != null)
                     {
                         var rates = await _apiService.GetRatesAsync(_pcInfo.PcId);
                         LogToFile($"Pipe: GetRates returning {rates.Count} items");
                         return JsonConvert.SerializeObject(rates);
                     }
                     return "[]";

                case PipeMessageType.GetBundles:
                    LogToFile($"Pipe: GetBundles received. _pcInfo is {(_pcInfo == null ? "NULL" : "OK")}");
                     if (_pcInfo != null && _apiService != null)
                     {
                         var bundles = await _apiService.GetBundlesAsync(_pcInfo.PcId);
                         LogToFile($"Pipe: GetBundles returning {bundles.Count} items");
                         return JsonConvert.SerializeObject(bundles);
                     }
                     return "[]";

                case PipeMessageType.PurchaseRequest:
                    LogToFile($"Pipe: PurchaseRequest received. Payload: {message.Payload}");
                     if (_pcInfo != null && _apiService != null)
                     {
                         var purchaseData = JsonConvert.DeserializeObject<PurchaseRequestPayload>(message.Payload);
                         var activeUser = ""; 
                         if (purchaseData != null && !string.IsNullOrEmpty(purchaseData.UserId))
                         {
                             activeUser = purchaseData.UserId;
                             LogToFile($"Pipe: PurchaseRequest - Using UserId from payload: {activeUser}");
                         }
                         else 
                         {
                             try 
                             {
                                 dynamic pcData = JsonConvert.DeserializeObject(_currentSessionData)!;
                                 if (pcData.activeUser != null) activeUser = pcData.activeUser.id;
                                 LogToFile($"Pipe: PurchaseRequest - Fallback to _currentSessionData: {activeUser}");
                             } catch (Exception ex) {
                                 LogToFile($"Pipe: PurchaseRequest - Error parsing session data: {ex.Message}");
                             }
                         }

                         if (string.IsNullOrEmpty(activeUser))
                         {
                             LogToFile("Pipe: PurchaseRequest - FAILED: activeUser is empty");
                             return JsonConvert.SerializeObject(new PurchaseResponse { Success = false, Message = "Usuario no identificado" });
                         }

                     var response = await _apiService.PurchaseAsync(_pcInfo.PcId, activeUser, purchaseData!);
                         LogToFile($"Pipe: PurchaseRequest Result: {response.Success}. NewBalance: {response.NewBalance}");
                         
                         if (response.Success)
                         {
                             // FIX: Update local cache immediately so UI polling sees the new balance
                             try 
                             {
                                 dynamic pcData = JsonConvert.DeserializeObject(_currentSessionData)!;
                                 if (pcData.activeUser != null)
                                 {
                                     pcData.activeUser.balance = response.NewBalance;
                                     _currentSessionData = JsonConvert.SerializeObject(pcData);
                                     LogToFile($"Pipe: PurchaseRequest - Updated local session data with new balance: {response.NewBalance}");
                                 }
                             }
                             catch (Exception ex)
                             {
                                 LogToFile($"Pipe: PurchaseRequest - Failed to update local cache: {ex.Message}");
                             }
                         }

                         return JsonConvert.SerializeObject(response);
                     }
                     LogToFile("Pipe: PurchaseRequest - FAILED: Master not ready (_pcInfo/ApiService null)");
                     return JsonConvert.SerializeObject(new PurchaseResponse { Success = false, Message = "Servicio no disponible" });
            }

            return "Unknown";
        }

        public override async Task StartAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("🚀 eControl Master Service starting...");
            LogToFile("🚀 eControl Master Service starting...");
            LoadConfig();
            
            // Re-Initialize Services that depend on Config
            _apiService = new ApiService(_config, _loggerFactory.CreateLogger<ApiService>());
            
            _socketService = new SocketService(_config, _loggerFactory.CreateLogger<SocketService>());
            _socketService.OnSessionStarted += HandleSessionStarted;
            _socketService.OnSessionEnded += HandleSessionEnded;
            _socketService.OnSessionUpdated += HandleSessionUpdated;

            _pipeServer.Start();
            _securityService.SetKioskMode(true);
            await base.StartAsync(cancellationToken);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("📡 Master service execution starting...");
            
            // 1. Iniciar Registro en segundo plano
            _ = Task.Run(async () => await RegisterWithBackendAsync(), stoppingToken);

            // 2. Iniciar Watchdog de ALTA FRECUENCIA (cada 2 seg)
            _ = Task.Run(async () => {
                while (!stoppingToken.IsCancellationRequested)
                {
                    try { await CheckUiHealth(); } catch { }
                    await Task.Delay(1000, stoppingToken); // V3.5: Ciclo agresivo de 1 segundo
                }
            }, stoppingToken);

            // 3. Loop principal de Heartbeat (cada N seg)
            while (!stoppingToken.IsCancellationRequested)
            {
                if (_pcInfo != null && _pcInfo.Success)
                {
                    // Log para depuración de heartbeat
                    // LogToFile($"Heartbeat Loop: Sending... Status={MapToBackendStatus()}"); 
                    var hbResponse = await _apiService!.SendHeartbeatAsync(_pcInfo.PcId, new HeartbeatRequest
                    {
                        Status = MapToBackendStatus(),
                        IpAddress = _hardwareService.GetLocalIpAddress()
                    });

                    if (!string.IsNullOrEmpty(hbResponse))
                    {
                         LogToFile($"Heartbeat Response: {hbResponse}");
                         if (IsSessionActive(hbResponse))
                         {
                             // Backup current data
                             _currentSessionData = hbResponse;
                             
                             if (_currentStatus != AgentStatusInternal.SESSION_ACTIVE)
                             {
                                 _logger.LogInformation("💖 Syncing Status from Heartbeat: ACTIVE. Unlocking...");
                                 LogToFile("💖 Syncing Status from Heartbeat: ACTIVE. Unlocking...");
                                 // Trigger unlock logic
                                 HandleSessionStarted(hbResponse);
                             }
                         }
                         else if (_currentStatus == AgentStatusInternal.SESSION_ACTIVE)
                         {
                             // Heartbeat says no session, but we are active.
                             // Trust the heartbeat as 'Active Source of Truth' if socket is silent
                             _logger.LogInformation("💖 Syncing Status from Heartbeat: INACTIVE. Locking...");
                             LogToFile("💖 Syncing Status from Heartbeat: INACTIVE. Locking...");
                             HandleSessionEnded();
                         }
                    }
                    else
                    {
                         LogToFile("Heartbeat Loop: SendHeartbeatAsync returned NULL."); 
                    }
                }
                else
                {
                    LogToFile("Heartbeat Loop: Skipped (PC not registered).");
                }

                await Task.Delay(_config.HeartbeatIntervalSeconds * 1000, stoppingToken);
            }
        }

        private async Task CheckUiHealth()
        {
            if (_isShuttingDown) return;
            
            // Log manual a archivo para debugear si ILogger no se ve
            LogToFile("Watchdog: Checking agent-launcher status...");

            // En la Versión 3.0, el Maestro vigila que el Lanzador (agent-launcher) esté vivo.
            // NUEVO: Verificación de Sesión Lista
            uint msgSessionId = 0xFFFFFFFF; // Usar método del HardwareService para obtener la mejor sesión
            // Nota: HardwareService no es estático, debemos usar _hardwareService para acceder a la lógica de sesión pero el método GetActiveSessionId es privado en el código original...
            // Espera, GetActiveSessionId es privado en HardwareService.cs. Deberíamos exponerlo o simplemente usar IsSessionReady si tuviéramos el ID.
            // Vamos a confiar en que LaunchLauncher usa internamente la lógica inteligente.
            // PERO, para el Watchdog, queremos evitar intentarlo si no estamos listos.
            
            // Un hack rápido para no cambiar la visibilidad de todo: 
            // Vamos a verificar si hay algún explorer.exe corriendo. Si no hay ninguno, asumimos que no hay sesión lista.
             var explorers = Process.GetProcessesByName("explorer");
             if (explorers.Length == 0)
             {
                 // Log manual reducido para no saturar
                 if ((DateTime.Now - _lastLaunchTime).TotalSeconds > 10) 
                     LogToFile("Watchdog: Waiting for User Session (No explorer.exe found)...");
                 return;
             }

            var launcherProcs = Process.GetProcessesByName("agent-launcher");
            bool isLauncherRunning = false;

            foreach (var proc in launcherProcs)
            {
                if (proc.SessionId > 0)
                {
                    isLauncherRunning = true;
                    // No hacemos break para permitir que la limpieza continúe si hubiera más procesos
                }
                else 
                {
                    try 
                    {
                        LogToFile($"Watchdog: Limpiando instancia fantasma de agent-launcher en Sesión 0 (PID: {proc.Id})");
                        proc.Kill();
                    } catch { }
                }
            }

            // También limpiar agent-ui en Sesión 0 (nunca debe estar ahí)
            var uiProcs = Process.GetProcessesByName("agent-ui");
            foreach (var proc in uiProcs)
            {
                if (proc.SessionId == 0)
                {
                    try 
                    {
                        LogToFile($"Watchdog: Limpiando instancia fantasma de agent-ui en Sesión 0 (PID: {proc.Id})");
                        proc.Kill();
                    } catch { }
                }
            }

            if (!isLauncherRunning)
            {
                // Verificar si ha pasado suficiente tiempo desde el último lanzamiento (grace period)
                if ((DateTime.Now - _lastLaunchTime).TotalSeconds < 15)
                {
                    LogToFile("Watchdog: agent-launcher NOT FOUND, but in grace period. Waiting...");
                    return;
                }

                LogToFile("Watchdog: agent-launcher NOT FOUND. Triggering relaunch...");
                _logger.LogWarning("⚠️ Security Alert: agent-launcher was closed! Attempting breakout relauch...");
                await LaunchLauncher();
            }
        }

        private void LogToFile(string message)
        {
            try
            {
                string logDir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "eControlLogs");
                if (!Directory.Exists(logDir)) Directory.CreateDirectory(logDir);
                File.AppendAllText(Path.Combine(logDir, "master_worker.log"), $"{DateTime.Now}: {message}{Environment.NewLine}");
            }
            catch { }
        }

        private async Task LaunchLauncher()
        {
            try
            {
                string launcherPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "agent-launcher.exe");
                if (File.Exists(launcherPath))
                {
                    _logger.LogInformation("🚀 Attempting Launcher Launch: {Path}", launcherPath);
                    _lastLaunchTime = DateTime.Now; // Update last launch time
                    
                    // 1. Intentar Breakout (Solo funciona si es SYSTEM)
                    bool success = _hardwareService.LaunchProcessAsUser(launcherPath);
                    
                    if (success)
                    {
                         LogToFile($"LaunchLauncher: EXITOSO. PID enviado al sistema. Iniciando Grace Period.");
                    }
                    else
                    {
                        _lastLaunchTime = DateTime.MinValue; // Reset time to retry immediately
                        _logger.LogWarning("⚠️ Breakout failed or session not ready. Will retry in next cycle.");
                        LogToFile("LaunchLauncher: Breakout falló. Reintentando en el próximo ciclo (sin Grace Period).");
                    }
                }
                else
                {
                    _logger.LogError("🛑 Launcher binary not found at: {Path}", launcherPath);
                }
            }
            catch (Exception ex) { _logger.LogError(ex, "Failed to launch Launcher"); }
        }

        private string MapToBackendStatus()
        {
            return _currentStatus switch
            {
                AgentStatusInternal.SESSION_ACTIVE => "OCCUPIED",
                AgentStatusInternal.AUTHENTICATED => "OCCUPIED",
                AgentStatusInternal.ERROR => "MALICIOUS",
                AgentStatusInternal.OFFLINE => "OFFLINE",
                _ => "AVAILABLE" // LOCKED, ONLINE, STARTING, etc.
            };
        }

        private void LoadConfig()
        {
            string configPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "config.json");
            if (File.Exists(configPath))
            {
                var json = File.ReadAllText(configPath);
                _config = JsonConvert.DeserializeObject<ClientConfig>(json) ?? new ClientConfig();
            }
            else
            {
                File.WriteAllText(configPath, JsonConvert.SerializeObject(_config, Formatting.Indented));
            }
        }

        private async Task RegisterWithBackendAsync()
        {
            try
            {
                LogToFile("RegisterWithBackendAsync: Starting registration check...");
                var request = new RegisterRequest
                {
                    LanId = _config.LanId,
                    Hostname = _hardwareService.GetHostname(),
                    MacAddress = _hardwareService.GetMacAddress(),
                    IpAddress = _hardwareService.GetLocalIpAddress()
                };

                LogToFile($"RegisterWithBackendAsync: Sending request for Hostname={request.Hostname}, MAC={request.MacAddress}");
                _pcInfo = await _apiService!.RegisterPcAsync(request);

                if (_pcInfo != null && _pcInfo.Success)
                {
                    _logger.LogInformation("✅ Registered successfully. PC ID: {PcId}", _pcInfo.PcId);
                    LogToFile($"✅ Registered successfully. PC ID: {_pcInfo.PcId}, LanId: {_pcInfo.LanId}");
                    
                    // Sync LanId from Backend
                    if (!string.IsNullOrEmpty(_pcInfo.LanId) && _pcInfo.LanId != _config.LanId)
                    {
                        _logger.LogInformation("🔄 Updating LanId from Backend: {LanId}", _pcInfo.LanId);
                        LogToFile($"🔄 Updating LanId from {_config.LanId} to {_pcInfo.LanId}");
                        _config.LanId = _pcInfo.LanId;
                        // Save updated config
                        string configPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "config.json");
                        File.WriteAllText(configPath, JsonConvert.SerializeObject(_config, Formatting.Indented));
                    }

                    _currentStatus = AgentStatusInternal.LOCKED;
                }
                else
                {
                    _logger.LogError("❌ Registration failed: {Message}", _pcInfo?.Message ?? "Unknown error");
                    LogToFile($"❌ Registration failed: {_pcInfo?.Message ?? "Unknown error"}");
                }
                
                // Try to connect socket if we have ID (even if re-registering)
                if (_pcInfo != null && !string.IsNullOrEmpty(_pcInfo.PcId))
                {
                    LogToFile($"RegisterWithBackendAsync: Attempting socket connection for PC {_pcInfo.PcId}");
                    await _socketService!.ConnectAsync(_pcInfo.PcId, _config.LanId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during registration process");
                LogToFile($"❌ Error during registration process: {ex.Message}\n{ex.StackTrace}");
            }
        }

        public override async Task StopAsync(CancellationToken cancellationToken)
        {
            await _socketService!.DisconnectAsync();
            _pipeServer.Stop();
            _securityService.SetKioskMode(false);
            SystemEvents.SessionEnding -= OnSessionEnding;
            await base.StopAsync(cancellationToken);
        }

        private void OnSessionEnding(object sender, SessionEndingEventArgs e)
        {
            _isShuttingDown = true;
            if (_pcInfo != null)
                _apiService?.SendHeartbeatAsync(_pcInfo.PcId, new HeartbeatRequest { Status = "OFFLINE", IpAddress = _hardwareService.GetLocalIpAddress() }).Wait(1000);
        }

        private void HandleSessionStarted(string payload)
        {
             // Save Data
             _currentSessionData = payload;
             
             if (IsSessionActive(payload))
             {
                 _logger.LogInformation("🔓 Session ACTIVE via Socket! Unlocking...");
                 _currentStatus = AgentStatusInternal.SESSION_ACTIVE;
                 _securityService.SetKioskMode(false);
             }
             else
             {
                 _logger.LogInformation("👤 User Authenticated via Socket (No Active Session). Keeping Kiosk Mode.");
                 _currentStatus = AgentStatusInternal.AUTHENTICATED;
                 _securityService.SetKioskMode(true);
             }
        }

        private void HandleSessionEnded()
        {
            _logger.LogInformation("🔒 Session Ended via Socket! Locking...");
             _currentSessionData = "{}";

            // 1. Update Internal Status
            _currentStatus = AgentStatusInternal.LOCKED;
            // 2. Lock System
            _securityService.SetKioskMode(true);
        }
        
        private void HandleSessionUpdated(string payload)
        {
             _currentSessionData = payload;
             // Re-evaluate unlock state on update (e.g. if session became active)
             if (IsSessionActive(payload))
             {
                 if (_currentStatus != AgentStatusInternal.SESSION_ACTIVE)
                 {
                     _logger.LogInformation("🔓 Session became ACTIVE via Update! Unlocking...");
                     _currentStatus = AgentStatusInternal.SESSION_ACTIVE;
                     _securityService.SetKioskMode(false);
                 }
             }
             else if (_currentStatus == AgentStatusInternal.SESSION_ACTIVE)
             {
                  // Session no longer active? (Expired/Ended)
                  // HandleSessionEnded calls this usually, but update might carry "COMPLETED" status
                  // Let's rely on logic, but we could re-lock here if needed. 
                  // For now, assume HandleSessionEnded is called if user is removed.
                  // If user exists but session ended (e.g. time ran out), we should probably Lock.
             }
        }

        private bool IsSessionActive(string payload)
        {
            try
            {
                dynamic pcData = JsonConvert.DeserializeObject(payload)!;
                if (pcData.sessions != null)
                {
                    foreach(var s in pcData.sessions) 
                    { 
                        string status = (string)s.status;
                        if (status == "ACTIVE" || status == "PAUSED" || status == "EXPIRED") return true; 
                    }
                }
            }
            catch {}
            return false;
        }
    }
}
