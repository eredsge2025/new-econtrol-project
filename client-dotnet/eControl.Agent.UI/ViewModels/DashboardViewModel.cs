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

        private void LogToFile(string msg)
        {
            try
            {
                var logPath = System.IO.Path.Combine(System.AppDomain.CurrentDomain.BaseDirectory, "eControlLogs", "ui_dashboard.log");
                System.IO.File.AppendAllText(logPath, $"{DateTime.Now}: {msg}{Environment.NewLine}");
            }
            catch { }
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

        [ObservableProperty] private bool _isStoreVisible = true;
        [ObservableProperty] private bool _isPlayNowVisible = true;
        [ObservableProperty] private bool _isEndSessionVisible = false;

        private string? _sessionType;
        public string? SessionType
        {
            get => _sessionType;
            set
            {
                LogToFile($"[DashboardVM] SessionType changing from '{_sessionType}' to '{value}'");
                if (SetProperty(ref _sessionType, value))
                {
                    LogToFile($"[DashboardVM] SessionType changed. Calling UpdateUiVisibility...");
                    UpdateUiVisibility(_sessionType);
                }
                else
                {
                    LogToFile($"[DashboardVM] SessionType unchanged (same value)");
                }
            }
        }

        public DashboardViewModel(string userId, string pcId, string displayName, decimal balance, string? sessionType = null)
        {
            _pipeClient = new NamedPipeClientService();
            _userId = userId;
            _pcId = pcId;
            DisplayName = displayName;
            UserBalance = balance;

            SessionType = sessionType; // This triggers UpdateUiVisibility
            _ = LoadStoreItems();
        }

        public void UpdateUiVisibility(string? sessionType)
        {
            LogToFile($"[DashboardVM] UpdateUiVisibility called with sessionType='{sessionType}'");
            if (string.IsNullOrEmpty(sessionType))
            {
                // No active session
                LogToFile($"[DashboardVM] No session - Store=true, PlayNow=true, EndSession=false");
                IsStoreVisible = true;
                IsPlayNowVisible = true; 
                IsEndSessionVisible = false;
            }
            else if (sessionType == "OPEN")
            {
                // Open session
                LogToFile($"[DashboardVM] OPEN session - Store=false, PlayNow=false, EndSession=true");
                IsStoreVisible = false;
                IsPlayNowVisible = false;
                IsEndSessionVisible = true;
            }
            else // FIXED or BUNDLE
            {
                LogToFile($"[DashboardVM] {sessionType} session - Store=true, PlayNow=false, EndSession=false");
                IsStoreVisible = true;
                IsPlayNowVisible = false;
                IsEndSessionVisible = false;
            }
        }

        [RelayCommand]
        public async Task EndSession()
        {
            if (IsBusy) return;
            IsBusy = true;
            ErrorMessage = "Finalizando sesión...";
            LogToFile($"[DashboardVM] EndSession: Starting. Current SessionType='{SessionType}'");

            try
            {
                var success = await _pipeClient.EndSessionAsync(_userId);
                LogToFile($"[DashboardVM] EndSession: API response Success={success}");
                if (success)
                {
                    LogToFile($"[DashboardVM] EndSession: Success. Setting SessionType=null and clearing error.");
                    ErrorMessage = "";
                    SessionType = null; // Force UI reset immediately
                    OnSessionStarted?.Invoke(); // Trigger full refresh
                    LogToFile($"[DashboardVM] EndSession: Completed. SessionType is now '{SessionType}'");
                }
                else
                {
                    LogToFile($"[DashboardVM] EndSession: Failed");
                    ErrorMessage = $"Error al finalizar sesión";
                }
            }
            catch (Exception ex)
            {
                LogToFile($"[DashboardVM] EndSession: Exception: {ex.Message}");
                ErrorMessage = $"Error: {ex.Message}";
            }
            finally
            {
                IsBusy = false;
            }
        }
        [RelayCommand]
        public async Task StartSession()
        {
            // "Play Now" Logic -> Purchase Type OPEN
            LogToFile($"[DashboardVM] StartSession: Starting. Current Balance={UserBalance}");
            if (UserBalance <= 0)
            {
                ErrorMessage = "Saldo insuficiente para iniciar sesión abierta.";
                LogToFile($"[DashboardVM] StartSession: Insufficient balance ({UserBalance}). Aborting.");
                return;
            }

            IsBusy = true;
            ErrorMessage = "Iniciando Tiempo Libre...";

            try
            {
                // Use PurchaseAsync with type "OPEN"
                // ItemId can be empty or "OPEN"
                var response = await _pipeClient.PurchaseAsync("OPEN", "OPEN", _userId);
                
                if (response.Success)
                {
                    ErrorMessage = "";
                    OnSessionStarted?.Invoke();
                    // Dashboard usually closes here via View logic handling OnSessionStarted
                }
                else
                {
                    ErrorMessage = $"No se pudo iniciar: {response.Message}";
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
