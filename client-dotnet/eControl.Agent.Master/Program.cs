using eControl.Agent.Master;
using System.Runtime.InteropServices;

// Ocultar ventana de consola inmediatamente
[DllImport("kernel32.dll")]
static extern IntPtr GetConsoleWindow();

[DllImport("user32.dll")]
static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

const int SW_HIDE = 0;
var handle = GetConsoleWindow();

// Solo ocultar si hay una ventana de consola (no en modo servicio real)
if (handle != IntPtr.Zero)
{
    ShowWindow(handle, SW_HIDE);
}

var builder = Host.CreateApplicationBuilder(new HostApplicationBuilderSettings
{
    ContentRootPath = AppDomain.CurrentDomain.BaseDirectory,
    Args = args
});

// Configurar como Servicio de Windows (SystemD/WindowsService)
builder.Services.AddWindowsService();
builder.Services.AddHostedService<Worker>();

try 
{
    var host = builder.Build();
    host.Run();
}
catch (Exception ex)
{
    try
    {
        string fatalLog = @"C:\eControl\eControlLogs\master_fatal.log";
        string logDir = Path.GetDirectoryName(fatalLog);
        if (!Directory.Exists(logDir)) Directory.CreateDirectory(logDir);
        File.AppendAllText(fatalLog, $"{DateTime.Now}: FATAL ERROR IN MASTER: {ex}{Environment.NewLine}");
    }
    catch { }
}
