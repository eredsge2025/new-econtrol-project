using System;
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

        [ObservableProperty]
        [NotifyCanExecuteChangedFor(nameof(LoginCommand))]
        private string _username = string.Empty;

        [ObservableProperty]
        [NotifyCanExecuteChangedFor(nameof(LoginCommand))]
        private string _password = string.Empty;

        [ObservableProperty]
        private string _errorMessage = string.Empty;
        
        [ObservableProperty]
        [NotifyCanExecuteChangedFor(nameof(LoginCommand))]
        private bool _isBusy;

        [ObservableProperty]
        private bool _isLoggedIn;

        [ObservableProperty]
        private bool _isSessionActive;

        [ObservableProperty]
        private string _windowState = "FullScreen";

        [ObservableProperty]
        private double _windowWidth = double.NaN; // NaN = Auto/Stretch

        [ObservableProperty]
        private double _windowHeight = double.NaN; // NaN = Auto/Stretch

        [ObservableProperty]
        private string _verticalAlignment = "Stretch";

        [ObservableProperty]
        private string _horizontalAlignment = "Stretch";
        
        [ObservableProperty]
        private string _background = "#1A1A1A";

        [ObservableProperty]
        private bool _isDashboardVisible;

        [ObservableProperty]
        private bool _isPillVisible;

        [ObservableProperty]
        private string _pcName = "Loading...";

        [ObservableProperty]
        private string _displayName = string.Empty;

        [ObservableProperty]
        private string _remainingTime = "00:00:00";

        public MainWindowViewModel()
        {
            _pipeClient = new NamedPipeClientService();
            // Log for debugging
            Log("MainWindowViewModel Initialized.");
            
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
                                             ResetState();
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

            try
            {
                var response = await _pipeClient.LoginAsync(Username, Password);
                
                if (response.Success)
                {
                    IsLoggedIn = true; 
                    ErrorMessage = string.Empty;
                    
                    // Almacenar el nombre del usuario autenticado
                    DisplayName = response.User?.Username ?? response.User?.Email ?? Username;
                    
                    // Show Dashboard, Hide Pill, Keep Background Opaque
                    IsDashboardVisible = true;
                    IsPillVisible = false;
                    Background = "#1A1A1A";
                    WindowState = "FullScreen";
                }
                else
                {
                    ErrorMessage = response.Message ?? "Error de autenticación.";
                }
            }
            catch (Exception ex)
            {
                ErrorMessage = $"Error de conexión: {ex.Message}";
            }
            finally
            {
                IsBusy = false;
            }
        }

        [RelayCommand]
        private async Task StartSessionAsync()
        {
            IsBusy = true;
            try
            {
                var success = await _pipeClient.StartSessionAsync();
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
            finally { IsBusy = false; }
        }

        [ObservableProperty]
        private bool _isLoading;

        [RelayCommand]
        public async Task LogoutAsync()
        {
            if (IsLoading) return;
            IsLoading = true;

            try
            {
                // 1. Mostrar Loader y ocultar todo lo demás
                IsDashboardVisible = false;
                IsPillVisible = false;
                
                // Forzar pantalla completa y fondo opaco
                // Esto asegura que el escritorio se oculte inmediatamente
                Background = "#1A1A1A";
                WindowState = "FullScreen"; 
                WindowWidth = double.NaN;
                WindowHeight = double.NaN;
                VerticalAlignment = "Stretch";
                HorizontalAlignment = "Stretch";
                
                // Pequeña pausa para permitir que la UI se actualice visualmente antes de la operación de red
                // Esto evita bloqueos en el renderizado
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
             Username = "";
             Password = "";
             ErrorMessage = "";
             IsLoggedIn = false;
             IsSessionActive = false;
             IsDashboardVisible = false;
             IsPillVisible = false;
             DisplayName = "";
             WindowState = "FullScreen";
             VerticalAlignment = "Stretch";
             HorizontalAlignment = "Stretch";
             WindowHeight = double.NaN;
             WindowWidth = double.NaN;
             Background = "#1A1A1A";
        }
    }
}
