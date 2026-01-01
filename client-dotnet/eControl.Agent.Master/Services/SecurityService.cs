using System;
using System.Diagnostics;
using System.Runtime.InteropServices;

namespace eControl.Agent.Master.Services
{
    public class SecurityService
    {
        private const int WH_KEYBOARD_LL = 13;
        private const int WM_KEYDOWN = 0x0100;
        private const int WM_SYSKEYDOWN = 0x0104;
        private const int VK_LWIN = 0x5B;
        private const int VK_RWIN = 0x5C;
        private const int VK_TAB = 0x09;
        private const int VK_ESCAPE = 0x1B;
        private const int VK_F4 = 0x73;
        private const int VK_LCONTROL = 0xA2;
        private const int VK_RCONTROL = 0xA3;
        private const int VK_LSHIFT = 0xA0;
        private const int VK_RSHIFT = 0xA1;

        private LowLevelKeyboardProc _proc;
        private IntPtr _hookID = IntPtr.Zero;
        private bool _isKioskEnabled = false;
        private Thread? _hookThread;
        private ManualResetEvent _threadStarted = new ManualResetEvent(false);

        public SecurityService()
        {
            _proc = HookCallback;
        }

        public void SetKioskMode(bool enabled)
        {
            if (enabled && !_isKioskEnabled)
            {
                _isKioskEnabled = true;
                _threadStarted.Reset();
                _hookThread = new Thread(RunHookLoop);
                _hookThread.IsBackground = true;
                _hookThread.SetApartmentState(ApartmentState.STA);
                _hookThread.Start();
                _threadStarted.WaitOne(2000); // Esperar a que el hook se instale
                
                DisableTaskManager(true);
                ToggleTaskbar(false);
            }
            else if (!enabled && _isKioskEnabled)
            {
                _isKioskEnabled = false;
                PostThreadMessage((uint)_hookThread!.ManagedThreadId, 0x0012, IntPtr.Zero, IntPtr.Zero); // WM_QUIT
                _hookThread = null;
                
                DisableTaskManager(false);
                ToggleTaskbar(true);
            }
        }

        private void ToggleTaskbar(bool show)
        {
            try
            {
                int nCmdShow = show ? 5 : 0; // SW_SHOW = 5, SW_HIDE = 0
                IntPtr taskbarHandle = FindWindow("Shell_TrayWnd", null);
                IntPtr startButtonHandle = FindWindowEx(IntPtr.Zero, IntPtr.Zero, (IntPtr)0xC017, "Start");

                if (taskbarHandle != IntPtr.Zero) ShowWindow(taskbarHandle, nCmdShow);
                if (startButtonHandle != IntPtr.Zero) ShowWindow(startButtonHandle, nCmdShow);
            }
            catch { }
        }

        [DllImport("user32.dll", SetLastError = true)]
        private static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern IntPtr FindWindowEx(IntPtr parentHandle, IntPtr childAfter, IntPtr className, string windowTitle);

        [DllImport("user32.dll")]
        private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        private void RunHookLoop()
        {
            _hookID = SetHook(_proc);
            _threadStarted.Set();

            // Message Loop crucial para que el Hook funcione
            MSG msg;
            while (GetMessage(out msg, IntPtr.Zero, 0, 0))
            {
                TranslateMessage(ref msg);
                DispatchMessage(ref msg);
            }

            if (_hookID != IntPtr.Zero)
            {
                UnhookWindowsHookEx(_hookID);
                _hookID = IntPtr.Zero;
            }
        }

        private IntPtr SetHook(LowLevelKeyboardProc proc)
        {
            using (Process curProcess = Process.GetCurrentProcess())
            using (ProcessModule curModule = curProcess.MainModule!)
            {
                return SetWindowsHookEx(WH_KEYBOARD_LL, proc, GetModuleHandle(curModule.ModuleName), 0);
            }
        }

        private delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);

        private IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam)
        {
            if (nCode >= 0 && (wParam == (IntPtr)WM_KEYDOWN || wParam == (IntPtr)WM_SYSKEYDOWN))
            {
                int vkCode = Marshal.ReadInt32(lParam);
                
                bool alt = (GetKeyState(0x12) & 0x8000) != 0;
                bool ctrl = (GetKeyState(0x11) & 0x8000) != 0;
                bool win = (vkCode == VK_LWIN || vkCode == VK_RWIN);

                // BLOQUEOS TIPO KIOSKO
                bool isAltTab = vkCode == VK_TAB && alt;
                bool isAltF4 = vkCode == VK_F4 && alt;
                bool isCtrlEsc = vkCode == VK_ESCAPE && ctrl;
                bool isAltEsc = vkCode == VK_ESCAPE && alt;
                bool isStartMenu = win;
                bool isTaskMgrLaunch = vkCode == VK_ESCAPE && ctrl && (GetKeyState(0x10) & 0x8000) != 0; // Ctrl+Shift+Esc

                if (isAltTab || isAltF4 || isCtrlEsc || isAltEsc || isStartMenu || isTaskMgrLaunch)
                {
                    Debug.WriteLine($"Blocked key combo: {vkCode} (Alt:{alt}, Ctrl:{ctrl})");
                    return (IntPtr)1; // Bloquear evento
                }
            }
            return CallNextHookEx(_hookID, nCode, wParam, lParam);
        }

        private void DisableTaskManager(bool disable)
        {
            try
            {
                using var key = Microsoft.Win32.Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Policies\System");
                if (disable)
                    key.SetValue("DisableTaskMgr", 1, Microsoft.Win32.RegistryValueKind.DWord);
                else
                    key.DeleteValue("DisableTaskMgr", false);
            }
            catch { }
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct MSG
        {
            public IntPtr hwnd;
            public uint message;
            public IntPtr wParam;
            public IntPtr lParam;
            public uint time;
            public System.Drawing.Point pt;
        }

        [DllImport("user32.dll")]
        private static extern bool GetMessage(out MSG lpMsg, IntPtr hWnd, uint wMsgFilterMin, uint wMsgFilterMax);

        [DllImport("user32.dll")]
        private static extern bool TranslateMessage(ref MSG lpMsg);

        [DllImport("user32.dll")]
        private static extern IntPtr DispatchMessage(ref MSG lpMsg);

        [DllImport("user32.dll")]
        private static extern bool PostThreadMessage(uint idThread, uint Msg, IntPtr wParam, IntPtr lParam);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProc lpfn, IntPtr hMod, uint dwThreadId);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool UnhookWindowsHookEx(IntPtr hhk);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

        [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr GetModuleHandle(string lpModuleName);

        [DllImport("user32.dll", CharSet = CharSet.Auto, ExactSpelling = true, CallingConvention = CallingConvention.Winapi)]
        private static extern short GetKeyState(int keyCode);
    }
}
