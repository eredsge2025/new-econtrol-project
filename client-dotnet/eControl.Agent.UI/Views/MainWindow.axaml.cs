using Avalonia.Controls;

namespace eControl.Agent.UI.Views;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
        this.Closing += (s, e) => 
        {
            // Bloquear el cierre de la ventana a menos que la app esté cerrándose por el sistema
            e.Cancel = true; 
        };
    }
}