using System;
using System.Threading.Tasks;
using SocketIOClient;
using Microsoft.Extensions.Logging;
using eControl.Agent.Shared;
using Newtonsoft.Json;

namespace eControl.Agent.Master.Services
{
    public class SocketService
    {
        private readonly SocketIOClient.SocketIO _client;
        private readonly ILogger<SocketService> _logger;
        private readonly ClientConfig _config;
        private string _pcId = string.Empty;

        // Events to notify Worker
        public event Action<string>? OnSessionStarted;
        public event Action? OnSessionEnded;
        public event Action<string>? OnSessionUpdated; // Payload with timer info

        public SocketService(ClientConfig config, ILogger<SocketService> logger)
        {
            _config = config;
            _logger = logger;

            var uri = new Uri(new Uri(_config.ServerUrl), "/pcs");
            _logger.LogInformation("🔌 Initializing Socket.IO Client to: {Uri}", uri);
            LogToFile($"🔌 Initializing Socket.IO Client to: {uri}");

            _client = new SocketIOClient.SocketIO(uri, new SocketIOOptions
            {
                AutoUpgrade = true,
                Reconnection = true,
                ReconnectionAttempts = int.MaxValue,
                ReconnectionDelay = 2000
            });

            _client.OnConnected += async (sender, e) =>
            {
                _logger.LogInformation("✅ Socket Connected to Namespace /pcs!");
                LogToFile("✅ Socket Connected to Namespace /pcs!");
                if (!string.IsNullOrEmpty(_pcId))
                {
                    // If we have pcId, we might be reconnecting. 
                    // We need active LanId. If ConnectAsync wasn't called (restart?), config is used.
                    // But ConnectAsync sets active session vars. 
                    // We'll rely on global vars or config.
                    // Ideally, ConnectAsync logic handles the first registration.
                    // This is for auto-reconnects. 
                     // await RegisterSocketAsync(); // Logic in ConnectAsync handles this better for now.
                }
            };

            _client.OnDisconnected += (sender, e) =>
            {
                _logger.LogWarning("⚠️ Socket Disconnected: {Reason}", e);
                LogToFile($"⚠️ Socket Disconnected: {e}");
            };
            
            _client.OnError += (sender, e) => 
            {
                _logger.LogError("🔥 Socket Error: {Error}", e);
                LogToFile($"🔥 Socket Error: {e}");
            };

            _client.On("pc_status_update", response =>
            {
                try
                {
                    var pcData = response.GetValue<Newtonsoft.Json.Linq.JObject>(); 
                    string activeUser = pcData["activeUser"]?.Type != Newtonsoft.Json.Linq.JTokenType.Null ? (string)pcData["activeUser"]["username"] : "None";
                    _logger.LogInformation("📩 Received pc_status_update for PC: {PcId} (User: {User})", (string)pcData["id"], activeUser);
                     LogToFile($"📩 Received pc_status_update for PC: {(string)pcData["id"]} (User: {activeUser})");
                    
                    HandlePcStatusUpdate(pcData); // dynamic binding works on JObject too, or we cast it
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "❌ Error handling pc_status_update");
                    LogToFile($"❌ Error handling pc_status_update: {ex.Message}");
                }
            });
        }

        public async Task ConnectAsync(string pcId, string? lanId = null)
        {
            try 
            {
                _pcId = pcId;
                string targetLanId = !string.IsNullOrEmpty(lanId) ? lanId : _config.LanId;
                
                LogToFile($"🔗 ConnectAsync Called. PC: {pcId}, LAN: {targetLanId ?? "NULL"}");

                if (_client.Connected)
                {
                    LogToFile("⚠️ Already connected. Registering directly.");
                    await RegisterSocketAsync(targetLanId);
                    return;
                }

                // Temporary Re-connect handler to ensure registration persists on reconnect logic
                // But simplified for now: just connect and register.
                
                await _client.ConnectAsync();
                
                // Wait a bit? No, ConnectAsync awaits valid connection.
                LogToFile("✅ Socket.ConnectAsync returned. Registering...");
                await RegisterSocketAsync(targetLanId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to connect socket initialy");
                LogToFile($"💥 Exception in ConnectAsync: {ex.Message}");
            }
        }

        private async Task RegisterSocketAsync(string? lanId = null)
        {
             string finalLanId = !string.IsNullOrEmpty(lanId) ? lanId : _config.LanId;
             LogToFile($"📤 Emitting join_lan for LAN: {finalLanId ?? "NULL"} with PC: {_pcId}");

             if (!string.IsNullOrEmpty(finalLanId))
             {
                  _logger.LogInformation("📡 Joining LAN Room: {LanId}", finalLanId);
                  // REVERTED: Backend expects string, not object.
                  await _client.EmitAsync("join_lan", finalLanId); 
             }
             else
             {
                 _logger.LogWarning("⚠️ LanId is empty! Cannot join room.");
                 LogToFile("⚠️ LanId is empty! Cannot join room.");
             } 
        }

        private void HandlePcStatusUpdate(dynamic pcData)
        {
            try 
            {
                // Detailed logging for debugging
                 _logger.LogInformation("🔍 Processing Status Update. My ID: {MyId}", _pcId);
                 LogToFile($"🔍 Processing Status Update. My ID: {_pcId}");
                 
                 string updatedPcId = (string)pcData.id;
                 if (!string.Equals(updatedPcId, _pcId, StringComparison.OrdinalIgnoreCase))
                 {
                     _logger.LogWarning("⚠️ Ignoring update for different PC. Received: {ReceivedId}, Expected: {MyId}", updatedPcId, _pcId);
                     LogToFile($"⚠️ Ignoring update: Received {updatedPcId} != {_pcId}");
                     return;
                 }

                 var activeUser = pcData.activeUser;
                 string userName = activeUser != null ? (string)activeUser.username : "NULL";
                 _logger.LogInformation("👤 Active User Node: {ActiveUser}", userName);
                 LogToFile($"👤 Active User Node: {userName}");

                 if (activeUser != null)
                 {
                     // Has User -> UNLOCK / UPDATE SESSION
                     string sessionData = JsonConvert.SerializeObject(pcData);
                     _logger.LogInformation("🔓 Invoking OnSessionStarted with payload length: {Length}", sessionData.Length);
                     LogToFile($"🔓 Invoking OnSessionStarted. Payload Len: {sessionData.Length}");
                     OnSessionStarted?.Invoke(sessionData);
                     
                     // Trigger update for timer sync
                     OnSessionUpdated?.Invoke(sessionData); 
                 }
                 else
                 {
                     // No User -> LOCK
                     _logger.LogInformation("🔒 Invoking OnSessionEnded (User is null)");
                     LogToFile("🔒 Invoking OnSessionEnded (User is null)");
                     OnSessionEnded?.Invoke(); 
                 }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error in HandlePcStatusUpdate logic");
                LogToFile($"❌ Error in HandlePcStatusUpdate: {ex.Message}");
            }
        }

        public async Task DisconnectAsync()
        {
            await _client.DisconnectAsync();
        }
        private void LogToFile(string message)
        {
             try {
                 string logPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "eControlLogs", "master_socket.log");
                 // Ensure dir exists (Worker does it, but safety first)
                 Directory.CreateDirectory(Path.GetDirectoryName(logPath)!);
                 File.AppendAllText(logPath, $"{DateTime.Now}: {message}{Environment.NewLine}");
             } catch {}
        }
    }
}
