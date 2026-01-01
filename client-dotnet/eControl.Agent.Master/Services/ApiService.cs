using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using eControl.Agent.Shared;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Polly;
using Polly.Retry;

namespace eControl.Agent.Master.Services
{
    public class ApiService
    {
        private readonly ILogger<ApiService> _logger;
        private readonly HttpClient _httpClient;
        private readonly AsyncRetryPolicy _retryPolicy;
        private readonly ClientConfig _config;

        public ApiService(ClientConfig config, ILogger<ApiService> logger)
        {
            _config = config;
            _logger = logger;
            _httpClient = new HttpClient();
            _httpClient.BaseAddress = new Uri(_config.ServerUrl);
            _httpClient.DefaultRequestHeaders.Accept.Clear();
            _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            _httpClient.DefaultRequestHeaders.Add("x-api-key", _config.ApiKey);
            
            // Reintentos con backoff exponencial
            _retryPolicy = Policy
                .Handle<HttpRequestException>()
                .Or<TaskCanceledException>()
                .WaitAndRetryAsync(5, 
                    retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
                    (exception, timeSpan, retryCount, context) =>
                    {
                        _logger.LogWarning("⚠️ Backend connection attempt {RetryCount} failed. Retrying in {Delay}s... ({Error})", 
                            retryCount, timeSpan.TotalSeconds, exception.Message);
                    }
                );
        }

        public async Task<RegisterResponse?> RegisterPcAsync(RegisterRequest request)
        {
            try
            {
                return await _retryPolicy.ExecuteAsync(async () =>
                {
                    var content = new StringContent(JsonConvert.SerializeObject(request), Encoding.UTF8, "application/json");
                    var response = await _httpClient.PostAsync("/pcs/register", content);
                    
                    if (response.IsSuccessStatusCode)
                    {
                        var responseString = await response.Content.ReadAsStringAsync();
                        return JsonConvert.DeserializeObject<RegisterResponse>(responseString);
                    }
                    
                    return new RegisterResponse { Success = false, Message = $"Error: {response.StatusCode}" };
                });
            }
            catch (Exception ex)
            {
                return new RegisterResponse { Success = false, Message = ex.Message };
            }
        }

        public async Task<string?> SendHeartbeatAsync(string pcId, HeartbeatRequest request)
        {
            try
            {
                var json = JsonConvert.SerializeObject(request);
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                
                // NestJS espera PATCH pcs/:id/heartbeat
                var response = await _httpClient.PatchAsync($"/pcs/{pcId}/heartbeat", content);
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    LogToFile($"Heartbeat Error: {response.StatusCode} - {errorContent} - Payload: {json}");
                    return null;
                }

                return await response.Content.ReadAsStringAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send heartbeat to backend");
                LogToFile($"Heartbeat Exception: {ex.Message}");
                return null;
            }
        }

        private void LogToFile(string message)
        {
            try
            {
                string logDir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "eControlLogs");
                if (!Directory.Exists(logDir)) Directory.CreateDirectory(logDir);
                File.AppendAllText(Path.Combine(logDir, "api_errors.log"), $"{DateTime.Now}: {message}{Environment.NewLine}");
            }
            catch { }
        }

        public async Task<LoginResponse?> LoginAsync(LoginRequest request)
        {
            try
            {
                var content = new StringContent(JsonConvert.SerializeObject(request), Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync("/auth/login", content);
                
                var responseString = await response.Content.ReadAsStringAsync();

                try
                {
                    var responseObj = JsonConvert.DeserializeObject<LoginResponse>(responseString);
                    if (responseObj != null && !string.IsNullOrEmpty(responseObj.Token))
                    {
                        responseObj.Success = true;
                    }
                    return responseObj;
                }
                catch (Exception innerEx) // Catch ALL json errors (Reader, Serialization, etc)
                {
                    // Fallback para errores de validación de NestJS (message: ["error 1", "error 2"])
                    try 
                    {
                        var jObj = JObject.Parse(responseString);
                        var msgToken = jObj["message"];
                        string finalMsg = "";

                        if (msgToken != null)
                        {
                            if (msgToken.Type == JTokenType.Array)
                            {
                                finalMsg = string.Join(", ", msgToken.ToObject<string[]>() ?? Array.Empty<string>());
                            }
                            else
                            {
                                finalMsg = msgToken.ToString();
                            }
                        }

                        // Intentar capturar 'error' si message falló o es genérico
                        var error = jObj["error"]?.ToString();
                        if (!string.IsNullOrEmpty(error) && string.IsNullOrEmpty(finalMsg))
                        {
                            finalMsg = error;
                        }

                        return new LoginResponse 
                        { 
                            Success = false, 
                            Message = string.IsNullOrEmpty(finalMsg) ? "Error de autenticación desconocido" : finalMsg 
                        };
                    }
                    catch (Exception parsingEx)
                    {
                        // Si falla incluso el parseo manual, mostramos la respuesta cruda para depurar
                        var safeResponse = responseString?.Length > 100 
                            ? responseString.Substring(0, 100) + "..." 
                            : responseString;
                            
                        return new LoginResponse 
                        { 
                            Success = false, 
                            Message = $"Error: {safeResponse} || {parsingEx.Message}" 
                        };
                    }
                }
            }
            catch (Exception ex)
            {
                return new LoginResponse { Success = false, Message = ex.Message };
            }
        }
        public async Task<bool> LogoutPcAsync(string pcId)
        {
            try
            {
                var response = await _httpClient.PatchAsync($"/pcs/{pcId}/logout", null);
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    LogToFile($"Logout Error: {response.StatusCode} - {errorContent}");
                }
                return response.IsSuccessStatusCode;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send logout to backend");
                return false;
            }
        }
    }
}
