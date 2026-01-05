using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;
using Avalonia.Markup.Xaml;
using eControl.Agent.UI.ViewModels;

namespace eControl.Agent.UI.Views
{
    public partial class DashboardWindow : Window
    {
        public DashboardWindow()
        {
            InitializeComponent();
#if DEBUG
            this.AttachDevTools();
#endif
        }

        private void InitializeComponent()
        {
            AvaloniaXamlLoader.Load(this);
        }

        protected override void OnPointerPressed(PointerPressedEventArgs e)
        {
            base.OnPointerPressed(e);
            if (e.GetCurrentPoint(this).Properties.IsLeftButtonPressed)
            {
                this.BeginMoveDrag(e);
            }
        }

        private void CloseWindow_Click(object? sender, RoutedEventArgs e)
        {
            this.Hide();
        }

        protected override void OnClosing(WindowClosingEventArgs e)
        {
            // Instead of closing, we just hide to preserve state and quick reopen
            e.Cancel = true;
            this.Hide();
        }
    }
}
