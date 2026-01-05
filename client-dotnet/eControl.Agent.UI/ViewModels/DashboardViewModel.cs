using System;
using System.Collections.ObjectModel;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using eControl.Agent.UI.Services;
using eControl.Agent.Shared;

namespace eControl.Agent.UI.ViewModels
{
    public partial class DashboardViewModel : ViewModelBase
    {
        private readonly NamedPipeClientService _pipeClient;
        private readonly string _userId;
        private readonly string _pcId;

        [ObservableProperty] private string _displayName = "";
        [ObservableProperty] private decimal _userBalance;
        [ObservableProperty] private string _errorMessage = "";
        [ObservableProperty] private bool _isBusy;
        [ObservableProperty] private bool _isPurchaseLoading;

        public ObservableCollection<RateDto> Rates { get; } = new();
        public ObservableCollection<BundleDto> Bundles { get; } = new();

        public event Action<decimal>? OnBalanceUpdated;
        public event Action? OnLogoutRequested;
        public event Action? OnSessionStarted;

        public DashboardViewModel(string userId, string pcId, string displayName, decimal balance)
        {
            _pipeClient = new NamedPipeClientService();
            _userId = userId;
            _pcId = pcId;
            DisplayName = displayName;
            UserBalance = balance;

            _ = LoadStoreItems();
        }

        public async Task LoadStoreItems()
        {
            if (IsPurchaseLoading) return;
            IsPurchaseLoading = true;
            try
            {
                var rates = await _pipeClient.GetRatesAsync();
                var bundles = await _pipeClient.GetBundlesAsync();

                Rates.Clear();
                foreach (var r in rates) Rates.Add(r);

                Bundles.Clear();
                foreach (var b in bundles) Bundles.Add(b);
            }
            catch (Exception ex)
            {
                ErrorMessage = $"Error al cargar tienda: {ex.Message}";
            }
            finally
            {
                IsPurchaseLoading = false;
            }
        }

        [RelayCommand]
        public async Task PurchaseRate(RateDto rate)
        {
            await PurchaseItem(rate.Id, "RATE", rate.Name);
        }

        [RelayCommand]
        public async Task PurchaseBundle(BundleDto bundle)
        {
            await PurchaseItem(bundle.Id, "BUNDLE", bundle.Name);
        }

        private async Task PurchaseItem(string itemId, string type, string itemName)
        {
            if (IsPurchaseLoading) return;
            IsPurchaseLoading = true;
            IsBusy = true;
            ErrorMessage = $"Procesando compra de {itemName}...";

            try
            {
                var response = await _pipeClient.PurchaseAsync(itemId, type, _userId);
                if (response.Success)
                {
                    ErrorMessage = "";
                    UserBalance = response.NewBalance;
                    OnBalanceUpdated?.Invoke(UserBalance);
                    OnSessionStarted?.Invoke();
                }
                else
                {
                    ErrorMessage = $"Error: {response.Message}";
                }
            }
            catch (Exception ex)
            {
                ErrorMessage = $"Error: {ex.Message}";
            }
            finally
            {
                IsPurchaseLoading = false;
                IsBusy = false;
            }
        }

        [RelayCommand]
        public async Task StartSession()
        {
            IsBusy = true;
            try
            {
                var success = await _pipeClient.StartSessionAsync();
                if (success)
                {
                    OnSessionStarted?.Invoke();
                }
                else
                {
                    ErrorMessage = "No se pudo iniciar la sesión. Verifique su saldo.";
                }
            }
            catch (Exception ex)
            {
                ErrorMessage = $"Error: {ex.Message}";
            }
            finally { IsBusy = false; }
        }
        [RelayCommand]
        public void RequestLogout()
        {
            OnLogoutRequested?.Invoke();
        }
    }
}
