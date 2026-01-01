using Avalonia;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Markup.Xaml;
using eControl.Agent.UI.ViewModels;
using eControl.Agent.UI.Views;
using System.Linq;

namespace eControl.Agent.UI
{
    public partial class App : Application
    {
        public override void Initialize()
        {
            AvaloniaXamlLoader.Load(this);
        }

        public override void OnFrameworkInitializationCompleted()
        {
            Log("UI Starting...");
            if (ApplicationLifetime is IClassicDesktopStyleApplicationLifetime desktop)
            {
                var mainVm = new MainWindowViewModel();
                desktop.MainWindow = new MainWindow
                {
                    DataContext = mainVm
                };
            }

            // V3.5 Triple Watchdog: UI vigila al Launcher
            System.Threading.Tasks.Task.Run(async () =>
            {
                Log("UI Watchdog Started.");
                while (true)
                {
                    try
                    {
                        var launcherName = "agent-launcher";
                        var processes = System.Diagnostics.Process.GetProcessesByName(launcherName);
                        if (processes.Length == 0)
                        {
                            Log("UI Watchdog: agent-launcher NOT FOUND. Relaunching...");
                            var launcherPath = System.IO.Path.Combine(System.AppDomain.CurrentDomain.BaseDirectory, "agent-launcher.exe");
                            if (System.IO.File.Exists(launcherPath))
                            {
                                System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                                {
                                    FileName = launcherPath,
                                    UseShellExecute = true
                                });
                            }
                        }
                    }
                    catch (System.Exception ex) { Log($"UI Watchdog Error: {ex.Message}"); }
                    await System.Threading.Tasks.Task.Delay(1000); // Ciclo agresivo de 1 segundo
                }
            });

            base.OnFrameworkInitializationCompleted();
        }

        private void Log(string message)
        {
            try
            {
                var logDir = System.IO.Path.Combine(System.AppDomain.CurrentDomain.BaseDirectory, "eControlLogs");
                if (!System.IO.Directory.Exists(logDir)) System.IO.Directory.CreateDirectory(logDir);
                var logPath = System.IO.Path.Combine(logDir, "ui.log");
                System.IO.File.AppendAllText(logPath, $"{System.DateTime.Now}: {message}{System.Environment.NewLine}");
            }
            catch { }
        }

    }
}