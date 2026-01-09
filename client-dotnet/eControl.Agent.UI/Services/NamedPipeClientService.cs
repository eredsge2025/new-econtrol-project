using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Pipes;
using System.Text;
using System.Threading.Tasks;
using eControl.Agent.Shared;
using Newtonsoft.Json;

namespace eControl.Agent.UI.Services
{
    public class NamedPipeClientService
    {
        private readonly string _pipeName = "eControlAgentPipe";

        public async Task<string> SendMessageAsync(PipeMessageType type, string payload = "")
        {
            try
            {
                using (var clientStream = new NamedPipeClientStream(".", _pipeName, PipeDirection.InOut, PipeOptions.Asynchronous))
                {
                    await clientStream.ConnectAsync(2000);
                    
                    using (var reader = new StreamReader(clientStream))
                    using (var writer = new StreamWriter(clientStream) { AutoFlush = true })
                    {
                        var message = new PipeMessage { Type = type, Payload = payload };
                        await writer.WriteLineAsync(JsonConvert.SerializeObject(message));
                        
                        var response = await reader.ReadLineAsync();
                        return response ?? string.Empty;
                    }
                }
            }
            catch (Exception ex)
            {
                return JsonConvert.SerializeObject(new { Success = false, Message = $"Pipe Error: {ex.Message}" });
            }
        }

        public async Task<LoginResponse> LoginAsync(string identifier, string password)
        {
            var payload = JsonConvert.SerializeObject(new LoginRequest { Identifier = identifier, Password = password });
            var responseJson = await SendMessageAsync(PipeMessageType.LoginRequest, payload);
            
            try
            {
                return JsonConvert.DeserializeObject<LoginResponse>(responseJson) 
                    ?? new LoginResponse { Success = false, Message = "Invalid response from service" };
            }
            catch
            {
                return new LoginResponse { Success = false, Message = "Error parsing service response" };
            }
        }
        public async Task<bool> StartSessionAsync()
        {
            var responseJson = await SendMessageAsync(PipeMessageType.StartSessionRequest);
            try
            {
                dynamic result = JsonConvert.DeserializeObject(responseJson);
                return result?.Success == true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<PcInfoResponse?> GetPcInfoAsync()
        {
            var responseJson = await SendMessageAsync(PipeMessageType.GetPcInfo);
            try
            {
                return JsonConvert.DeserializeObject<PcInfoResponse>(responseJson);
            }
            catch
            {
                return null;
            }
        }

        public async Task<List<RateDto>> GetRatesAsync()
        {
            var responseJson = await SendMessageAsync(PipeMessageType.GetRates);
            try { return JsonConvert.DeserializeObject<List<RateDto>>(responseJson) ?? new List<RateDto>(); }
            catch { return new List<RateDto>(); }
        }

        public async Task<List<BundleDto>> GetBundlesAsync()
        {
            var responseJson = await SendMessageAsync(PipeMessageType.GetBundles);
            try { return JsonConvert.DeserializeObject<List<BundleDto>>(responseJson) ?? new List<BundleDto>(); }
            catch { return new List<BundleDto>(); }
        }

        public async Task<PurchaseResponse> PurchaseAsync(string itemId, string type, string userId, string paymentMethod = "BALANCE")
        {
            var payload = new PurchaseRequestPayload { ItemId = itemId, Type = type, UserId = userId, PaymentMethod = paymentMethod };
            var responseJson = await SendMessageAsync(PipeMessageType.PurchaseRequest, JsonConvert.SerializeObject(payload));
            try { return JsonConvert.DeserializeObject<PurchaseResponse>(responseJson) ?? new PurchaseResponse { Success = false, Message = "Invalid response" }; }
            catch { return new PurchaseResponse { Success = false, Message = "Parse error" }; }
        }
        public async Task<bool> EndSessionAsync(string userId)
        {
            var payload = JsonConvert.SerializeObject(new EndSessionRequestPayload { UserId = userId });
            var responseJson = await SendMessageAsync(PipeMessageType.EndSessionRequest, payload);
            try
            {
                dynamic result = JsonConvert.DeserializeObject(responseJson);
                return result?.Success == true;
            }
            catch
            {
                return false;
            }
        }
    }
}
