using System;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

namespace eControl.Agent.UI.ViewModels
{
    public partial class SessionToolbarViewModel : ViewModelBase
    {
        [ObservableProperty]
        private string _remainingTime = "00:00:00";

        [ObservableProperty]
        private string _userName = "Usuario Demo";

        [ObservableProperty]
        private string _balance = "$0.00";

        [RelayCommand]
        private void Logout()
        {
            // Lógica para cerrar sesión
        }

        [RelayCommand]
        private void ShowDashboard()
        {
            // Lógica para mostrar el dashboard completo
        }
    }
}
