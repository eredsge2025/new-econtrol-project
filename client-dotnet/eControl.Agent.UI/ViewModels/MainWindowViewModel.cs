using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using eControl.Agent.UI.Services;

using eControl.Agent.Shared;

namespace eControl.Agent.UI.ViewModels
{
    public partial class MainWindowViewModel : ViewModelBase
    {
        private readonly NamedPipeClientService _pipeClient;
        private System.Timers.Timer _idleTimer;
        private string _currentUserId = string.Empty;

        [ObservableProperty] private bool _showLoginForm;
        [ObservableProperty] private bool _isLoggedIn;
        [ObservableProperty] private string _pcName = "Consultando...";
        [ObservableProperty] 
        [NotifyCanExecuteChangedFor(nameof(LoginCommand))]
        [NotifyCanExecuteChangedFor(nameof(StartSessionCommand))]
        private bool _isBusy;

        [ObservableProperty] private string _errorMessage = "";

        [ObservableProperty] 
        [NotifyCanExecuteChangedFor(nameof(LoginCommand))]
        private string _username = "";

        [ObservableProperty] 
        [NotifyCanExecuteChangedFor(nameof(LoginCommand))]
        private string _password = "";
        [ObservableProperty] private string _displayName = "";
        [ObservableProperty] private bool _isSessionActive;
        [ObservableProperty] private bool _isPillVisible;
        [ObservableProperty] private bool _isDashboardVisible;
        [ObservableProperty] private string _remainingTime = "00:00:00";
        
        [ObservableProperty] private string _windowState = "FullScreen";
        [ObservableProperty] private double _windowWidth = double.NaN;
        [ObservableProperty] private double _windowHeight = double.NaN;
        [ObservableProperty] private string _verticalAlignment = "Stretch";
        [ObservableProperty] private string _horizontalAlignment = "Stretch";
        [ObservableProperty] private string _background = "#1A1A1A";
        [ObservableProperty] private decimal _userBalance;

        public MainWindowViewModel()
        {
            _pipeClient = new NamedPipeClientService();
            // Log for debugging
            Log("MainWindowViewModel Initialized.");
            
            _idleTimer = new System.Timers.Timer(10000); // 10 seconds inactivity
            _idleTimer.Elapsed += (s, e) => 
            {
                if (ShowLoginForm && !IsLoggedIn) 
                {
                     ShowLoginForm = false;
                }
                _idleTimer.Stop();
            };

            // Iniciar carga de info del PC en segundo plano
            Task.Run(async () => 
            {
                try 
                {
                    await Task.Delay(1000); // Dar tiempo al Master para iniciar 
                    var info = await _pipeClient.GetPcInfoAsync();
                    if (info != null && !string.IsNullOrEmpty(info.PcName))
                    {
                        PcName = info.PcName;
                    }
                    else 
                    {
                        PcName = "Unknown PC"; 
                    }
                } 
                catch (Exception ex) 
                {
                     Log($"Error fetching PC Info: {ex.Message}");
                     PcName = "Error";
                }

                // Start Polling Loop
                while (true)
                {
                    try
                    {
                         // Poll Session Status
                         var statusJson = await _pipeClient.SendMessageAsync(PipeMessageType.GetSessionStatus);
                         if (!string.IsNullOrEmpty(statusJson))
                         {
                             var status = Newtonsoft.Json.JsonConvert.DeserializeObject<SessionStatusResponse>(statusJson);
                             if (status != null)
                             {
                                 // Update UI on Main Thread
                                 Avalonia.Threading.Dispatcher.UIThread.Post(() => 
                                 {
                                     if (status.IsActive)
                                     {
                                         // Session Active!
                                         if (!IsSessionActive)
                                         {
                                              // Transition to Active
                                              IsSessionActive = true;
                                              IsLoggedIn = true;
                                              IsDashboardVisible = false;
                                              IsPillVisible = true;
                                              
                                              // Set Mini Mode
                                              Background = "Transparent";
                                              WindowState = "Normal";
                                              WindowWidth = 450;
                                              WindowHeight = 100;
                                              VerticalAlignment = "Top";
                                              HorizontalAlignment = "Center";
                                         }
                                         
                                         // Update Timer
                                         if (status.ExpiresAt.HasValue)
                                         {
                                             var remaining = status.ExpiresAt.Value.ToUniversalTime() - DateTime.UtcNow;
                                             if (remaining.TotalSeconds < 0) remaining = TimeSpan.Zero;
                                             RemainingTime = remaining.ToString(@"hh\:mm\:ss");
                                         }
                                         else
                                         {
                                             // Open Session (Elapsed)
                                              var elapsed = DateTime.UtcNow - (status.StartedAt?.ToUniversalTime() ?? DateTime.UtcNow);
                                              RemainingTime = elapsed.ToString(@"hh\:mm\:ss");
                                         }
                                         
                                         if (!string.IsNullOrEmpty(status.ActiveUser))
                                         {
                                             DisplayName = status.ActiveUser;
                                         }
                                     }
                                     else
                                     {
                                         // No Active Session
                                         if (IsSessionActive)
                                         {
                                             // Session Ended -> Lock
                                             IsSessionActive = false;
                                             IsPillVisible = false;
                                             
                                             // Return to Dashboard (Authenticated) or Login (Guest)
                                             if (IsLoggedIn)
                                             {
                                                 IsDashboardVisible = true;
                                                 Background = "#1A1A1A";
                                                 WindowState = "FullScreen";
                                                 WindowWidth = double.NaN;
                                                 WindowHeight = double.NaN;
                                                 VerticalAlignment = "Stretch";
                                                 HorizontalAlignment = "Stretch";
                                             }
                                             else 
                                             {
                                                 ResetState();
                                             }
                                         }
                                     }
                                 });
                             }
                         }
                    }
                    catch {}
                    await Task.Delay(250); // V3.6: Faster polling for instant reaction
                }
            });
        }

        [RelayCommand]
        public void ShowLogin()
        {
            ShowLoginForm = true;
            _idleTimer.Stop();
            _idleTimer.Start();
        }

        public void ResetIdleTimer()
        {
            if (ShowLoginForm) 
            {
               _idleTimer.Stop();
               _idleTimer.Start();
            }
        }

        private bool CanLogin()
        {
             return !IsBusy && !string.IsNullOrWhiteSpace(Username) && !string.IsNullOrWhiteSpace(Password);
        }

        private void Log(string msg)
        {
            try {
                 var logPath = System.IO.Path.Combine(System.AppDomain.CurrentDomain.BaseDirectory, "eControlLogs", "ui_vm.log");
                 System.IO.File.AppendAllText(logPath, $"{DateTime.Now}: {msg}{Environment.NewLine}");
            } catch {}
        }

        private void LogToFile(string msg) => Log(msg);

        [RelayCommand(CanExecute = nameof(CanLogin))]
        private async Task LoginAsync()
        {
            if (string.IsNullOrWhiteSpace(Username) || string.IsNullOrWhiteSpace(Password))
            {
                ErrorMessage = "Por favor, ingrese usuario y contraseña.";
                return;
            }

            IsBusy = true;
            ErrorMessage = string.Empty;
            LogToFile($"LoginAsync: Starting login for {Username}...");

            try
            {
                var response = await _pipeClient.LoginAsync(Username, Password);
                LogToFile($"LoginAsync: Response success={response.Success}, Message={response.Message}");
                
                if (response.Success)
                {
                    IsLoggedIn = true; 
                    ShowLoginForm = false; // Hide Login Form
                    ErrorMessage = string.Empty;
                    
                    // Almacenar el nombre del usuario autenticado y saldo
                    _currentUserId = response.User?.Id ?? string.Empty;
                    DisplayName = response.User?.Username ?? response.User?.Email ?? Username;
                    UserBalance = response.User?.Balance ?? 0;
                    LogToFile($"LoginAsync: Success. User={DisplayName} (ID={_currentUserId}), Balance={UserBalance}");
                    
                    // Show Dashboard, Hide Pill, Keep Background Opaque
                    IsDashboardVisible = true;
                    IsPillVisible = false;
                    Background = "#1A1A1A";
                    WindowState = "FullScreen";

                    // Load Store Items immediately
                    _ = LoadStoreItems();
                }
                else
                {
                    ErrorMessage = response.Message ?? "Error de autenticación.";
                }
            }
            catch (Exception ex)
            {
                ErrorMessage = $"Error de conexión: {ex.Message}";
                LogToFile($"LoginAsync: Exception: {ex.Message}");
            }
            finally
            {
                IsBusy = false;
                LogToFile("LoginAsync: Finished.");
            }
        }

        [RelayCommand(CanExecute = nameof(CanStartSession))]
        private async Task StartSessionAsync()
        {
            IsBusy = true;
            LogToFile("StartSessionAsync: Command triggered.");
            try
            {
                var success = await _pipeClient.StartSessionAsync();
                LogToFile($"StartSessionAsync: Pipe call result={success}");
                if (success)
                {
                    IsSessionActive = true;
                    
                    // Switch to Pill Mode
                    IsDashboardVisible = false;
                    IsPillVisible = true;
                    
                    // Resize to Pill (Float Mode)
                    Background = "Transparent";
                    WindowState = "Normal";
                    WindowWidth = 450;
                    WindowHeight = 100;
                    VerticalAlignment = "Top";
                    HorizontalAlignment = "Center";
                }
                else
                {
                    ErrorMessage = "No se pudo iniciar la sesión. Verifique su saldo.";
                }
            }
            catch (Exception ex)
            {
                LogToFile($"StartSessionAsync: Exception: {ex.Message}");
            }
            finally { IsBusy = false; }
        }

        private bool CanStartSession() => !IsBusy;

        [ObservableProperty]
        private bool _isLoading;

        [RelayCommand]
        public async Task LogoutAsync()
        {
            if (IsLoading) return;
            IsLoading = true;
            LogToFile("LogoutAsync: Triggered.");

            try
            {
                // 1. Mostrar Loader y ocultar todo lo demás
                IsDashboardVisible = false;
                IsPillVisible = false;
                
                // Forzar pantalla completa y fondo opaco
                Background = "#1A1A1A";
                WindowState = "FullScreen"; 
                WindowWidth = double.NaN;
                WindowHeight = double.NaN;
                VerticalAlignment = "Stretch";
                HorizontalAlignment = "Stretch";
                
                await Task.Delay(50);
                
                // 2. Enviar petición al backend
                await _pipeClient.SendMessageAsync(PipeMessageType.LogoutRequest);
                
                // 3. Resetear estado completo (vuelve al Login)
                ResetState();
            }
            finally 
            { 
                IsLoading = false; 
                IsBusy = false;
            }
        }

        [RelayCommand]
        private void EmergencyReset() 
        {
            try 
            {
                var path = System.IO.Path.Combine(System.AppDomain.CurrentDomain.BaseDirectory, "uninstall_clean.bat");
                LogToFile($"Attempting Emergency Reset using script: {path}");
                
                if (System.IO.File.Exists(path))
                {
                    var psi = new System.Diagnostics.ProcessStartInfo 
                    {
                        FileName = path,
                        UseShellExecute = true,
                        Verb = "runas",
                        CreateNoWindow = false
                    };
                    System.Diagnostics.Process.Start(psi);
                    // Exit immediately to release file locks
                    System.Environment.Exit(0);
                }
                else
                {
                    ErrorMessage = "uninstall_clean.bat no encontrado. Reinstale eControl.";
                    LogToFile("Emergency Reset Failed: uninstall_clean.bat not found.");
                }
            }
            catch (Exception ex)
            {
                 ErrorMessage = $"Error al ejecutar reset: {ex.Message}";
                 LogToFile($"Emergency Reset Exception: {ex.Message}");
            }
        }
        
        private void ResetState()
        {
             LogToFile("ResetState: Cleaning up UI state.");
             Username = "";
             Password = "";
             ErrorMessage = "";
             IsLoggedIn = false;
             ShowLoginForm = false;
             IsSessionActive = false;
             IsDashboardVisible = false;
             IsPillVisible = false;
             DisplayName = "";
             UserBalance = 0;
             WindowState = "FullScreen";
             VerticalAlignment = "Stretch";
             HorizontalAlignment = "Stretch";
             WindowHeight = double.NaN;
             WindowWidth = double.NaN;
             Background = "#1A1A1A";
        }
        // Purchase Logic
        public ObservableCollection<RateDto> Rates { get; } = new();
        public ObservableCollection<BundleDto> Bundles { get; } = new();

        [ObservableProperty] private bool _isPurchaseLoading;

        public async Task LoadStoreItems()
        {
            if (IsPurchaseLoading) return;
            IsPurchaseLoading = true;
            LogToFile("LoadStoreItems: Fetching rates and bundles...");
            try
            {
                var rates = await _pipeClient.GetRatesAsync();
                var bundles = await _pipeClient.GetBundlesAsync();

                LogToFile($"LoadStoreItems: Received {rates.Count} rates and {bundles.Count} bundles.");

                Rates.Clear();
                foreach(var r in rates) Rates.Add(r);

                Bundles.Clear();
                foreach(var b in bundles) Bundles.Add(b);
            }
            catch (Exception ex)
            {
                LogToFile($"LoadStoreItems: Exception: {ex.Message}");
            }
            finally
            {
                IsPurchaseLoading = false;
            }
        }

        [RelayCommand]
        public async Task PurchaseRate(RateDto rate)
        {
             await PurchaseItem(rate.Id, "RATE", rate.Name, rate.Price);
        }

        [RelayCommand]
        public async Task PurchaseBundle(BundleDto bundle)
        {
             await PurchaseItem(bundle.Id, "BUNDLE", bundle.Name, bundle.Price);
        }

        private async Task PurchaseItem(string itemId, string type, string itemName, decimal price)
        {
            if (IsPurchaseLoading) return;
            IsPurchaseLoading = true;
            ErrorMessage = $"Procesando compra de {itemName}...";
            LogToFile($"PurchaseItem: Buying {itemName} ({type}) ID={itemId}");

            try 
            {
                var response = await _pipeClient.PurchaseAsync(itemId, type, _currentUserId);
                LogToFile($"PurchaseItem: Response success={response.Success}, NewBalance={response.NewBalance}");

                if (response.Success)
                {
                    ErrorMessage = ""; 
                    UserBalance = response.NewBalance;
                    
                    // Auto-Unlock UI locally
                    IsSessionActive = true;
                    IsDashboardVisible = false;
                    IsPillVisible = true;
                    Background = "Transparent";
                    WindowState = "Normal";
                    WindowWidth = 450;
                    WindowHeight = 100;
                    VerticalAlignment = "Top";
                    HorizontalAlignment = "Center";
                }
                else
                {
                    ErrorMessage = $"Error: {response.Message}";
                }
            }
            catch (Exception ex)
            {
                LogToFile($"PurchaseItem: Exception: {ex.Message}");
                ErrorMessage = $"Error: {ex.Message}";
            }
            finally 
            {
                IsPurchaseLoading = false;
            }
        }

        // Trigger loading on Login Success
        [ObservableProperty]
        private bool _showAlert;
    }
}
