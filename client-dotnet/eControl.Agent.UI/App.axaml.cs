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
                try 
                {
                    Log("Instantiating MainWindowViewModel...");
                    var mainVm = new MainWindowViewModel();
                    
                    Log("Instantiating MainWindow...");
                    desktop.MainWindow = new MainWindow
                    {
                        DataContext = mainVm
                    };
                    Log("MainWindow Created Successfully.");
                }
                catch (System.Exception ex)
                {
                    Log($"CRITICAL CRASH during MainWindow creation: {ex.Message}");
                    Log($"Stack: {ex.StackTrace}");
                    if (ex.InnerException != null)
                    {
                        Log($"Inner: {ex.InnerException.Message}");
                    }
                    throw; // Re-throw to allow default crash handling but we got the logs
                }
            }

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