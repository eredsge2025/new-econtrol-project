using System;
using System.Collections.Generic;
using Newtonsoft.Json;

namespace eControl.Agent.Shared
{
    public class ClientConfig
    {
        public string LanId { get; set; } = string.Empty;
        public string ApiKey { get; set; } = string.Empty;
        public string ServerUrl { get; set; } = "http://localhost:3001";
        public int HeartbeatIntervalSeconds { get; set; } = 5;
        public string UiPath { get; set; } = "agent-ui.exe";
    }

    public class RegisterRequest
    {
        [JsonProperty("lanId")]
        public string LanId { get; set; } = string.Empty;

        [JsonProperty("hostname")]
        public string Hostname { get; set; } = string.Empty;

        [JsonProperty("macAddress")]
        public string MacAddress { get; set; } = string.Empty;

        [JsonProperty("ipAddress")]
        public string IpAddress { get; set; } = string.Empty;

        [JsonProperty("agentVersion")]
        public string AgentVersion { get; set; } = "2.4-dotnet";

        [JsonProperty("os")]
        public string Os { get; set; } = Environment.OSVersion.ToString();
    }

    public class RegisterResponse
    {
        [JsonProperty("success")]
        public bool Success { get; set; }

        [JsonProperty("message")]
        public string Message { get; set; } = string.Empty;

        [JsonProperty("id")] // NestJS devuelve 'id' en el objeto PC
        public string PcId { get; set; } = string.Empty;

        [JsonProperty("name")]
        public string PcName { get; set; } = string.Empty;

        [JsonProperty("lanId")]
        public string LanId { get; set; } = string.Empty;
    }

    public class HeartbeatRequest
    {
        // PcId is now sent as part of the URL path, not in the body
        [JsonProperty("status")]
        public string Status { get; set; } = "AVAILABLE";

        [JsonProperty("ipAddress")]
        public string IpAddress { get; set; } = string.Empty;

        // CpuUsage and RamUsage are no longer sent in the heartbeat
    }

    public class LoginRequest
    {
        [JsonProperty("identifier")]
        public string Identifier { get; set; } = string.Empty;

        [JsonProperty("password")]
        public string Password { get; set; } = string.Empty;

        [JsonProperty("pcId")]
        public string PcId { get; set; } = string.Empty;
    }

    public class PcInfoResponse
    {
        public string PcId { get; set; } = string.Empty;
        public string PcName { get; set; } = string.Empty;
    }

    public class UserDto
    {
        [JsonProperty("id")]
        public string Id { get; set; } = string.Empty;

        [JsonProperty("email")]
        public string Email { get; set; } = string.Empty;

        [JsonProperty("username")]
        public string Username { get; set; } = string.Empty;

        [JsonProperty("balance")]
        public decimal Balance { get; set; }

        [JsonProperty("role")]
        public string Role { get; set; } = string.Empty;
    }

    public class LoginResponse
    {
        [JsonProperty("success")]
        public bool Success { get; set; }

        [JsonProperty("access_token")]
        public string Token { get; set; } = string.Empty;

        [JsonProperty("message")]
        public string Message { get; set; } = string.Empty;

        [JsonProperty("user")]
        public UserDto? User { get; set; }
    }

    public enum AgentStatusInternal
    {
        OFFLINE,
        ONLINE,
        AUTHENTICATED,
        SESSION_ACTIVE,
        LOCKED,
        ERROR
    }

    // Identificadores de mensajes para Named Pipes
    public enum PipeMessageType
    {
        StatusUpdate,
        LoginRequest,
        LogoutRequest,
        StartSessionRequest,
        LockSystem,
        UnlockSystem,
        UserAlert,
        GetPcInfo,
        SessionUpdate,
        GetSessionStatus
    }

    public class PipeMessage
    {
        public PipeMessageType Type { get; set; }
        public string Payload { get; set; } = string.Empty;
    }

    public class SessionStatusResponse
    {
        public bool IsActive { get; set; }
        public bool IsLocked { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public DateTime? StartedAt { get; set; }
        public double RemainingSeconds { get; set; }
        public string? ActiveUser { get; set; }
    }
}
