using Avalonia.Controls;

namespace eControl.Agent.UI.Views;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        try 
        {
            Log("[MainWindow] Starting InitializeComponent...");
            
            InitializeComponent();

            Log("[MainWindow] InitializeComponent COMPLETED.");

            this.Closing += (s, e) => 
            {
                e.Cancel = true; 
            };
        }
        catch (System.Exception ex)
        {
            Log($"[MainWindow] CRASH in Constructor: {ex.Message}\n{ex.StackTrace}");
            throw;
        }
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