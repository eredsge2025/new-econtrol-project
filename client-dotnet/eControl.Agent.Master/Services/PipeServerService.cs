using System;
using System.IO;
using System.IO.Pipes;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using eControl.Agent.Shared;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace eControl.Agent.Master.Services
{
    public class PipeServerService
    {
        private readonly ILogger _logger;
        private readonly string _pipeName = "eControlAgentPipe";
        private CancellationTokenSource? _cts;

        public event Func<PipeMessage, Task<string>>? OnMessageReceived;

        public PipeServerService(ILogger logger)
        {
            _logger = logger;
        }

        public void Start()
        {
            _cts = new CancellationTokenSource();
            Task.Run(() => ServerLoop(_cts.Token));
        }

        public void Stop()
        {
            _cts?.Cancel();
        }

        private async Task ServerLoop(CancellationToken token)
        {
            while (!token.IsCancellationRequested)
            {
                try
                {
                    var security = new PipeSecurity();
                    // Allow Everyone to read/write to the pipe (simple solution for local IPC)
                    // In a stricter environment, we might limit to Authenticated Users or specific group.
                    security.AddAccessRule(new PipeAccessRule(
                        new System.Security.Principal.SecurityIdentifier(System.Security.Principal.WellKnownSidType.WorldSid, null), 
                        PipeAccessRights.ReadWrite, 
                        System.Security.AccessControl.AccessControlType.Allow));

                    using (var serverStream = NamedPipeServerStreamAcl.Create(
                        _pipeName, 
                        PipeDirection.InOut, 
                        1, 
                        PipeTransmissionMode.Byte, 
                        PipeOptions.Asynchronous, 
                        0, 
                        0, 
                        security))
                    {
                        _logger.LogDebug("Wait for pipe connection...");
                        await serverStream.WaitForConnectionAsync(token);
                        _logger.LogDebug("Pipe client connected.");

                        using (var reader = new StreamReader(serverStream))
                        using (var writer = new StreamWriter(serverStream) { AutoFlush = true })
                        {
                            var jsonRequest = await reader.ReadLineAsync();
                            if (string.IsNullOrEmpty(jsonRequest)) continue;

                            var request = JsonConvert.DeserializeObject<PipeMessage>(jsonRequest);
                            if (request != null && OnMessageReceived != null)
                            {
                                var responsePayload = await OnMessageReceived(request);
                                await writer.WriteLineAsync(responsePayload);
                            }
                        }
                    }
                }
                catch (OperationCanceledException)
                {
                    // Shutdown requested, quiet exit
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in Pipe Server loop: {Message}. StackTrace: {StackTrace}", ex.Message, ex.StackTrace);
                    await Task.Delay(1000, token);
                }
            }
        }
    }
}
