using Avalonia;
using Avalonia.Controls;
using Avalonia.Markup.Xaml;

namespace eControl.Agent.UI.Views
{
    public partial class SessionToolbar : Window
    {
        public SessionToolbar()
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
    }
}
