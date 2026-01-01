using System;
using System.Runtime.InteropServices;
using System.Linq;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Diagnostics;

namespace eControl.Agent.Master.Services
{
    public class HardwareService
    {
        public string GetMacAddress()
        {
            return NetworkInterface
                .GetAllNetworkInterfaces()
                .Where(nic => nic.OperationalStatus == OperationalStatus.Up && nic.NetworkInterfaceType != NetworkInterfaceType.Loopback)
                .Select(nic => nic.GetPhysicalAddress().ToString().ToUpper())
                .FirstOrDefault() ?? "000000000000";
        }

        public string GetLocalIpAddress()
        {
            var host = Dns.GetHostEntry(Dns.GetHostName());
            foreach (var ip in host.AddressList)
            {
                if (ip.AddressFamily == AddressFamily.InterNetwork)
                {
                    return ip.ToString();
                }
            }
            return "127.0.0.1";
        }

        public string GetHostname()
        {
            return Environment.MachineName;
        }

        public (double cpu, double ram) GetSystemUsage()
        {
            // Simplificado para el prototipo
            // En producción usaríamos PerformanceCounter
            return (5.0, 20.0); 
        }
        public bool LaunchProcessAsUser(string appPath, string cmdLine = "")
        {
            IntPtr hToken = IntPtr.Zero;
            IntPtr hUserToken = IntPtr.Zero;
            IntPtr pEnv = IntPtr.Zero;
            var pi = new PROCESS_INFORMATION();
            var si = new STARTUPINFO();
            si.cb = Marshal.SizeOf(si);
            si.lpDesktop = @"winsta0\default"; // Importante: Desktop del usuario
            si.dwFlags = STARTF_USESHOWWINDOW;
            si.wShowWindow = 1; // SW_SHOWNORMAL

            try
            {
                uint sessionId = GetActiveSessionId();
                LogDebug($"--- Intentando Lanzar: {appPath} ---");
                LogDebug($"Sesión Seleccionada: {sessionId}");

                if (sessionId == 0xFFFFFFFF)
                {
                    LogDebug("ERROR: No se encontró ninguna sesión interactiva válida.");
                    return false;
                }

                // 2. Intentar obtener el token del usuario (WTS o Explorer)
                // En Windows 11, WTSQueryUserToken puede funcionar antes de que el escritorio esté listo,
                // causando que la app se lance en el limbo. Priorizamos Explorer si está disponible.
                
                if (IsSessionReady(sessionId))
                {
                    LogDebug($"Session {sessionId} is ready (Explorer running). Attempting to grab Explorer token directly.");
                    hToken = GetExplorerToken(sessionId);
                }

                if (hToken == IntPtr.Zero)
                {
                    LogDebug($"Explorer token not obtained. Fallback to WTSQueryUserToken for session {sessionId}...");
                    if (!WTSQueryUserToken(sessionId, out hToken))
                    {
                        LogDebug($"WTSQueryUserToken failed for session {sessionId}.");
                    }
                }

                if (hToken == IntPtr.Zero)
                {
                    LogDebug("ERROR: No se pudo obtener el token del usuario por ningún método.");
                    return false;
                }

                // 3. Duplicar Token (SecurityImpersonation es clave para procesos interactivos)
                if (!DuplicateTokenEx(hToken, MAXIMUM_ALLOWED, IntPtr.Zero, 
                    SECURITY_IMPERSONATION_LEVEL.SecurityImpersonation, 
                    TOKEN_TYPE.TokenPrimary, out hUserToken))
                {
                    LogDebug($"DuplicateTokenEx failed. Error: {Marshal.GetLastWin32Error()}");
                    return false;
                }

                // 4. Crear Environment Block
                if (!CreateEnvironmentBlock(out pEnv, hUserToken, false))
                {
                    LogDebug($"CreateEnvironmentBlock failed. Error: {Marshal.GetLastWin32Error()}");
                    // Fallback: Podemos intentar sin bloque de ambiente, aunque no es recomendado
                }

                // 5. Lanzar Proceso
                string commandLine;
                string workingDir;
                string ext = Path.GetExtension(appPath).ToLower();
                
                if (ext == ".bat" || ext == ".cmd" || appPath.Equals("cmd.exe", StringComparison.OrdinalIgnoreCase))
                {
                    string cmdPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "cmd.exe");
                    string actualApp = appPath.Equals("cmd.exe", StringComparison.OrdinalIgnoreCase) ? "" : $"\"{appPath}\"";
                    string argsPart = string.IsNullOrEmpty(cmdLine) ? "" : " " + cmdLine;
                    
                    // Si es cmd.exe directo, lpCommandLine debe empezar con cmd.exe
                    if (appPath.Equals("cmd.exe", StringComparison.OrdinalIgnoreCase))
                        commandLine = $"\"{cmdPath}\" {cmdLine}";
                    else
                        commandLine = $"\"{cmdPath}\" /c \"{actualApp}{argsPart}\"";

                    workingDir = @"C:\Windows\System32";
                }
                else
                {
                    commandLine = string.IsNullOrEmpty(cmdLine) ? $"\"{appPath}\"" : $"\"{appPath}\" {cmdLine}";
                    workingDir = Path.GetDirectoryName(appPath);
                    if (string.IsNullOrEmpty(workingDir)) workingDir = @"C:\Windows\System32";
                }
                LogDebug($"Lanzando: {commandLine} en {workingDir}");

                // Flags para una app GUI en otra sesión:
                // Usamos CREATE_UNICODE_ENVIRONMENT y evitamos CREATE_NEW_CONSOLE por ahora
                uint dwCreationFlags = CREATE_UNICODE_ENVIRONMENT;

                bool result = CreateProcessAsUser(
                    hUserToken,
                    null, 
                    commandLine, 
                    IntPtr.Zero,
                    IntPtr.Zero,
                    false,
                    dwCreationFlags, 
                    pEnv,
                    workingDir,
                    ref si,
                    out pi
                );

                if (!result)
                {
                    LogDebug($"CreateProcessAsUser FALLÓ. Error: {Marshal.GetLastWin32Error()}");
                }
                else
                {
                    LogDebug($"CreateProcessAsUser EXITOSO. PID: {pi.dwProcessId}");
                }

                return result;
            }
            catch (Exception ex)
            {
                LogDebug($"EXCEPCIÓN en LaunchProcessAsUser: {ex.Message}");
                return false;
            }
            finally
            {
                if (hToken != IntPtr.Zero) CloseHandle(hToken);
                if (hUserToken != IntPtr.Zero) CloseHandle(hUserToken);
                if (pEnv != IntPtr.Zero) DestroyEnvironmentBlock(pEnv);
                if (pi.hProcess != IntPtr.Zero) CloseHandle(pi.hProcess);
                if (pi.hThread != IntPtr.Zero) CloseHandle(pi.hThread);
            }
        }

        public bool IsSessionReady(uint sessionId)
        {
            var explorers = Process.GetProcessesByName("explorer");
            return explorers.Any(e => e.SessionId == (int)sessionId);
        }

        private IntPtr GetExplorerToken(uint sessionId)
        {
            var explorers = System.Diagnostics.Process.GetProcessesByName("explorer");
            foreach (var explorer in explorers)
            {
                if (explorer.SessionId == (int)sessionId)
                {
                    LogDebug($"Explorer encontrado en sesión {sessionId}. PID: {explorer.Id}. Intentando abrir proceso...");
                    IntPtr hProcess = OpenProcess(PROCESS_QUERY_INFORMATION, false, (uint)explorer.Id);
                    if (hProcess != IntPtr.Zero)
                    {
                        IntPtr hToken = IntPtr.Zero;
                        if (OpenProcessToken(hProcess, TOKEN_DUPLICATE | TOKEN_QUERY | TOKEN_ASSIGN_PRIMARY, out hToken))
                        {
                            LogDebug("Token de Explorer obtenido con éxito.");
                            CloseHandle(hProcess);
                            return hToken;
                        }
                        LogDebug($"OpenProcessToken falló para Explorer. Error: {Marshal.GetLastWin32Error()}");
                        CloseHandle(hProcess);
                    }
                    else
                    {
                        LogDebug($"OpenProcess falló para Explorer. Error: {Marshal.GetLastWin32Error()}");
                    }
                }
            }
            return IntPtr.Zero;
        }

        private uint GetActiveSessionId()
        {
            uint activeSessionId = WTSGetActiveConsoleSessionId();
            LogDebug($"WTSGetActiveConsoleSessionId retornó: {activeSessionId} (0xFFFFFFFF = Sin consola)");

            // En muchos casos de auto-login o boot, la consola puede no estar "lista" inmediatamente
            // o puede reportar 0 (Sesión 0) si Windows no ha cargado el user desktop.
            
            IntPtr pSessionInfo = IntPtr.Zero;
            uint count = 0;
            if (WTSEnumerateSessions(IntPtr.Zero, 0, 1, out pSessionInfo, out count))
            {
                int structSize = Marshal.SizeOf(typeof(WTS_SESSION_INFO));
                for (int i = 0; i < count; i++)
                {
                    var sessionInfo = (WTS_SESSION_INFO)Marshal.PtrToStructure(
                        pSessionInfo + (i * structSize), typeof(WTS_SESSION_INFO));
                    
                    LogDebug($"Sesión detectada: ID={sessionInfo.SessionID}, State={sessionInfo.State}");

                    // Buscamos una sesión que sea WTSActive y NO sea la sesión 0
                    if (sessionInfo.State == WTS_CONNECTSTATE_CLASS.WTSActive && sessionInfo.SessionID != 0)
                    {
                        LogDebug($"-> Sesión interactiva activa encontrada: {sessionInfo.SessionID}");
                        WTSFreeMemory(pSessionInfo);
                        return sessionInfo.SessionID;
                    }
                }
                WTSFreeMemory(pSessionInfo);
            }

            // Si llegamos aquí y activeSessionId es 1 o mayor, la respetamos, 
            // pero hacemos un chequeo extra: Si hay un Explorer corriendo en CUALQUIER sesión, usemos esa.
            var bestSession = GetSessionWithExplorer();
            if (bestSession != 0xFFFFFFFF)
            {
                LogDebug($"Session with running Explorer found: {bestSession}. Preferring this over WTCActive session.");
                return bestSession;
            }

            if (activeSessionId != 0xFFFFFFFF && activeSessionId != 0)
            {
                return activeSessionId;
            }

            return 0xFFFFFFFF;
        }

        private uint GetSessionWithExplorer()
        {
            try
            {
                var explorers = Process.GetProcessesByName("explorer");
                foreach (var proc in explorers)
                {
                    if (proc.SessionId != 0) return (uint)proc.SessionId;
                }
            }
            catch { }
            return 0xFFFFFFFF;
        }

        private void LogDebug(string message)
        {
            try 
            {
                string logDir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "eControlLogs");
                if (!Directory.Exists(logDir)) Directory.CreateDirectory(logDir);
                string logPath = Path.Combine(logDir, "master_debug.log");
                File.AppendAllText(logPath, $"{DateTime.Now}: {message}{Environment.NewLine}");
            }
            catch { }
        }

        #region P/Invoke Definitions
        [DllImport("kernel32.dll", SetLastError = true)]
        static extern uint WTSGetActiveConsoleSessionId();

        [DllImport("wtsapi32.dll", SetLastError = true)]
        static extern bool WTSEnumerateSessions(IntPtr hServer, uint Reserved, uint Version, out IntPtr ppSessionInfo, out uint pCount);

        [DllImport("wtsapi32.dll")]
        static extern void WTSFreeMemory(IntPtr pMemory);

        [DllImport("wtsapi32.dll", SetLastError = true)]
        static extern bool WTSQueryUserToken(uint sessionId, out IntPtr phToken);

        [DllImport("advapi32.dll", SetLastError = true)]
        static extern bool DuplicateTokenEx(IntPtr hExistingToken, uint dwDesiredAccess, IntPtr lpTokenAttributes, SECURITY_IMPERSONATION_LEVEL ImpersonationLevel, TOKEN_TYPE TokenType, out IntPtr phNewToken);

        [DllImport("kernel32.dll", SetLastError = true)]
        static extern IntPtr OpenProcess(uint dwDesiredAccess, bool bInheritHandle, uint dwProcessId);

        [DllImport("advapi32.dll", SetLastError = true)]
        static extern bool OpenProcessToken(IntPtr ProcessHandle, uint DesiredAccess, out IntPtr TokenHandle);

        [DllImport("userenv.dll", SetLastError = true)]
        static extern bool CreateEnvironmentBlock(out IntPtr lpEnvironment, IntPtr hToken, bool bInherit);

        [DllImport("userenv.dll", SetLastError = true)]
        static extern bool DestroyEnvironmentBlock(IntPtr lpEnvironment);

        [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        static extern bool CreateProcessAsUser(IntPtr hToken, string lpApplicationName, string lpCommandLine, IntPtr lpProcessAttributes, IntPtr lpThreadAttributes, bool bInheritHandles, uint dwCreationFlags, IntPtr lpEnvironment, string lpCurrentDirectory, ref STARTUPINFO lpStartupInfo, out PROCESS_INFORMATION lpProcessInformation);

        [DllImport("kernel32.dll", SetLastError = true)]
        static extern bool CloseHandle(IntPtr hObject);

        private const uint MAXIMUM_ALLOWED = 0x02000000;
        private const uint PROCESS_QUERY_INFORMATION = 0x0400;
        private const uint TOKEN_DUPLICATE = 0x0002;
        private const uint TOKEN_QUERY = 0x0008;
        private const uint TOKEN_ASSIGN_PRIMARY = 0x0001;
        
        private const uint CREATE_UNICODE_ENVIRONMENT = 0x00000400;
        private const uint CREATE_NEW_CONSOLE = 0x00000010;
        private const int STARTF_USESHOWWINDOW = 0x00000001;

        [StructLayout(LayoutKind.Sequential)]
        struct STARTUPINFO
        {
            public int cb;
            public string lpReserved;
            public string lpDesktop;
            public string lpTitle;
            public int dwX;
            public int dwY;
            public int dwXSize;
            public int dwYSize;
            public int dwXCountChars;
            public int dwYCountChars;
            public int dwFillAttribute;
            public int dwFlags;
            public short wShowWindow;
            public short cbReserved2;
            public IntPtr lpReserved2;
            public IntPtr hStdInput;
            public IntPtr hStdOutput;
            public IntPtr hStdError;
        }

        [StructLayout(LayoutKind.Sequential)]
        struct PROCESS_INFORMATION
        {
            public IntPtr hProcess;
            public IntPtr hThread;
            public int dwProcessId;
            public int dwThreadId;
        }

        enum SECURITY_IMPERSONATION_LEVEL
        {
            SecurityAnonymous,
            SecurityIdentification,
            SecurityImpersonation,
            SecurityDelegation
        }

        enum TOKEN_TYPE
        {
            TokenPrimary = 1,
            TokenImpersonation
        }

        [StructLayout(LayoutKind.Sequential)]
        struct WTS_SESSION_INFO
        {
            public uint SessionID;
            [MarshalAs(UnmanagedType.LPStr)]
            public string pWinStationName;
            public WTS_CONNECTSTATE_CLASS State;
        }

        enum WTS_CONNECTSTATE_CLASS
        {
            WTSActive,
            WTSConnected,
            WTSConnectQuery,
            WTSShadow,
            WTSDisconnected,
            WTSIdle,
            WTSListen,
            WTSReset,
            WTSDown,
            WTSInit
        }
        #endregion
    }
}
