using Avalonia;
using System;

namespace eControl.Agent.UI;

sealed class Program
{
    // Initialization code. Don't use any Avalonia, third-party APIs or any
    // SynchronizationContext-reliant code before AppMain is called: things aren't initialized
    // yet and stuff might break.
    [STAThread]
    public static void Main(string[] args)
    {
        string logDir = @"C:\Users\Public\eControlLogs";
        try
        {
            if (!System.IO.Directory.Exists(logDir)) System.IO.Directory.CreateDirectory(logDir);
            string startLog = System.IO.Path.Combine(logDir, "ui_start.log");
            string info = $"{DateTime.Now}: UI [INICIO] Ejecutando como: {Environment.UserName}, Sesión: {System.Diagnostics.Process.GetCurrentProcess().SessionId}{Environment.NewLine}";
            System.IO.File.AppendAllText(startLog, info);
        }
        catch { }

        try 
        {
            AppDomain.CurrentDomain.UnhandledException += (sender, e) => 
            {
                try {
                    System.IO.File.AppendAllText(System.IO.Path.Combine(logDir, "ui_crash.log"), 
                        $"{DateTime.Now}: ERROR NO CONTROLADO: {e.ExceptionObject}{Environment.NewLine}");
                } catch {}
            };
            
            BuildAvaloniaApp()
                .StartWithClassicDesktopLifetime(args);
        }
        catch (Exception ex)
        {
            try
            {
                string tempLog = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "eControl_UI_Crash_Main.log");
                System.IO.File.AppendAllText(tempLog, $"{DateTime.Now}: Main Error: {ex}{Environment.NewLine}");
            }
            catch { }
            throw; 
        }
    }

    // Avalonia configuration, don't remove; also used by visual designer.
    public static AppBuilder BuildAvaloniaApp()
        => AppBuilder.Configure<App>()
            .UsePlatformDetect()
            .WithInterFont()
            .LogToTrace();
}
