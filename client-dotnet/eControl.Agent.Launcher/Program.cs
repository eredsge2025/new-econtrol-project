using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text.Json;

namespace eControl.Agent.Launcher;

class Program
{
    private static string configPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "config.json");
    private static string launcherExe = "agent-launcher";
    private static string uiExe = "agent-ui";
    private static string masterExe = "agent-master";
    private static string logPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "eControlLogs", "launcher.log");

    [DllImport("kernel32.dll")]
    static extern IntPtr GetConsoleWindow();

    [DllImport("user32.dll")]
    static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    const int SW_HIDE = 0;

    static async Task Main(string[] args)
    {
        try 
        {
            // Ocultar consola inmediatamente
            var handle = GetConsoleWindow();
            if (handle != IntPtr.Zero) ShowWindow(handle, SW_HIDE);

            Directory.CreateDirectory(Path.GetDirectoryName(logPath)!);
            Log("Lanzador iniciado.");

            LoadConfig();

            AppDomain.CurrentDomain.ProcessExit += (s, e) => Log("Lanzador cerrándose (ProcessExit).");
            AppDomain.CurrentDomain.UnhandledException += (s, e) => Log($"CRASH NO MANEJADO: {e.ExceptionObject}");

            int cycleCount = 0;
            while (true)
            {
                try
                {
                    EnsureUiRunning();
                    // EnsureMasterRunning(); // DISABLED: False positives across sessions cause restart loops

                    cycleCount++;
                    if (cycleCount >= 5) // Cada 5 segundos
                    {
                        Log("Watchdog Alive (5s)");
                        cycleCount = 0;
                    }
                }
                catch (Exception ex)
                {
                    Log($"Error en Watchdog Loop: {ex.Message} \n{ex.StackTrace}");
                }

                await Task.Delay(1000); // V3.5: Triple Watchdog - Ciclo agresivo de 1 segundo
            }
        }
        catch (Exception fatalEx)
        {
            // Fallback Log
            try 
            {
                File.AppendAllText(Path.Combine(Path.GetTempPath(), "launcher_fatal.log"), $"{DateTime.Now}: FATAL CRASH: {fatalEx}\n");
            } catch { }
        }
    }

    private static void EnsureUiRunning()
    {
        string fullUiPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, uiExe + ".exe");
        int currentSessionId = Process.GetCurrentProcess().SessionId;

        if (!File.Exists(fullUiPath))
        {
            Log($"ERROR: No se encontró la interfaz en {fullUiPath}");
            return;
        }

        var processes = Process.GetProcessesByName(uiExe);
        bool isUiInMySession = false;
        foreach (var proc in processes)
        {
            if (proc.SessionId == currentSessionId)
            {
                isUiInMySession = true;
                break;
            }
        }

        if (!isUiInMySession)
        {
            Log($"Interfaz no detectada en la sesión actual (Sesión: {currentSessionId}). Lanzando...");
            Process.Start(new ProcessStartInfo
            {
                FileName = fullUiPath,
                WorkingDirectory = Path.GetDirectoryName(fullUiPath),
                UseShellExecute = true
            });
            Log("Interfaz lanzada.");
        }
    }

    private static void LoadConfig()
    {
        if (File.Exists(configPath))
        {
            try
            {
                var json = File.ReadAllText(configPath);
                using var doc = JsonDocument.Parse(json);
                if (doc.RootElement.TryGetProperty("uiPath", out var pathElement))
                {
                    string pathVal = pathElement.GetString() ?? "agent-ui.exe";
                    uiExe = Path.GetFileNameWithoutExtension(pathVal);
                }
            }
            catch { /* Usar default */ }
        }
    }
    
    private static void EnsureMasterRunning()
    {
        var masterProcs = Process.GetProcessesByName(masterExe);
        if (masterProcs.Length == 0)
        {
             Log("CRÍTICO: Maestro (agent-master) no detectado. Intentando reiniciar el servicio...");
             try
             {
                 // Intentar arrancar el servicio (requiere elevación, pero si el launcher corre como admin funcionará)
                 Process.Start(new ProcessStartInfo
                 {
                     FileName = "sc.exe",
                     Arguments = "start eControlMaestro",
                     CreateNoWindow = true,
                     UseShellExecute = true,
                     Verb = "runas" // Intentar forzar elevación si es necesario
                 });
             }
             catch { }
        }
    }

    private static void Log(string message)
    {
        try
        {
            string line = $"{DateTime.Now}: {message}{Environment.NewLine}";
            File.AppendAllText(logPath, line);
        }
        catch { }
    }
}
