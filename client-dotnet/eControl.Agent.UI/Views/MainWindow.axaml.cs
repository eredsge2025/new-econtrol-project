using Avalonia;
using Avalonia.Controls;
using Avalonia.Threading;
using eControl.Agent.UI.ViewModels;
using System.ComponentModel;

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

            this.DataContextChanged += OnDataContextChanged;
        }
        catch (System.Exception ex)
        {
            Log($"[MainWindow] CRASH in Constructor: {ex.Message}\n{ex.StackTrace}");
            throw;
        }
    }

    private void OnDataContextChanged(object? sender, System.EventArgs e)
    {
        if (DataContext is MainWindowViewModel vm)
        {
            vm.PropertyChanged += OnViewModelPropertyChanged;
        }
    }

    private void OnViewModelPropertyChanged(object? sender, PropertyChangedEventArgs e)
    {
        if (e.PropertyName == nameof(MainWindowViewModel.IsPillVisible))
        {
            Dispatcher.UIThread.Post(UpdateWindowMode);
        }
    }

    private void UpdateWindowMode()
    {
        if (DataContext is MainWindowViewModel vm)
        {
            if (vm.IsPillVisible)
            {
                // PILL MODE: Small, Top-Center, Start Location Manual
                this.WindowState = WindowState.Normal;
                this.SystemDecorations = SystemDecorations.None;
                this.Width = 450;
                this.Height = 80;
                
                // Position at Top Center
                if (Screens.Primary != null)
                {
                    var screenWidth = Screens.Primary.WorkingArea.Width;
                    var x = (screenWidth - 450) / 2;
                    this.Position = new PixelPoint((int)x, 0);
                }
                
                this.Background = null; // Ensure transparency click-through
                this.Topmost = true;
            }
            else
            {
                // FULLSCREEN MODE (Login/Lock)
                // Let ViewModel handle State/Dimensions usually, but ensure Position is correct if needed
                // vm.WindowState usually handles this.
            }
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