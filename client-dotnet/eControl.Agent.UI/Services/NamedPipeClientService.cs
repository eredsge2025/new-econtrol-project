using System;
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
    }
}
