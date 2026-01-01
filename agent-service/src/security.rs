use windows::Win32::Foundation::{LPARAM, LRESULT, WPARAM, HINSTANCE, HWND};
use windows::Win32::UI::WindowsAndMessaging::{
    CallNextHookEx, SetWindowsHookExW, UnhookWindowsHookEx, GetMessageW,
    WH_KEYBOARD_LL, HHOOK, KBDLLHOOKSTRUCT, WM_KEYDOWN, WM_SYSKEYDOWN,
    WM_KEYUP, WM_SYSKEYUP, HC_ACTION,
};
use windows::Win32::UI::Input::KeyboardAndMouse::{
    VK_LWIN, VK_RWIN, VK_TAB, VK_ESCAPE, VK_F4, VK_CONTROL, VK_MENU, VK_DELETE,
};
use windows::Win32::System::Registry::{
    RegCreateKeyExW, RegSetValueExW, RegCloseKey, HKEY_CURRENT_USER, KEY_WRITE, 
    REG_DWORD, REG_OPTION_NON_VOLATILE, HKEY,
};
use std::sync::atomic::{AtomicBool, Ordering};
use tracing::{info, error, debug};

// Global hook handle - unsafe but necessary for C-style callback
static mut HOOK_HANDLE: HHOOK = HHOOK(0);
static ENABLED: AtomicBool = AtomicBool::new(false);

pub fn set_kiosk_mode(enabled: bool) {
    ENABLED.store(enabled, Ordering::SeqCst);
    if enabled {
        info!("🔒 Modo Kiosco ACTIVADO");
        enable_task_mgr(false);
    } else {
        info!("🔓 Modo Kiosco DESACTIVADO");
        enable_task_mgr(true);
    }
}

use windows::Win32::System::LibraryLoader::GetModuleHandleW;

pub fn start_keyboard_guard() {
    std::thread::spawn(|| {
        unsafe {
            let instance = match GetModuleHandleW(None) {
                Ok(h) => HINSTANCE(h.0),
                Err(_) => HINSTANCE(0),
            };
            // debug!("Obtenido Module Handle: {:?}", instance);

            let hook = SetWindowsHookExW(
                WH_KEYBOARD_LL,
                Some(low_level_keyboard_proc),
                instance,
                0
            );

            match hook {
                Ok(h) => {
                    HOOK_HANDLE = h;
                    info!("🛡️ Hook de teclado instalado correctamente");
                    
                    // Message Loop is required for hooks
                    let mut msg = windows::Win32::UI::WindowsAndMessaging::MSG::default();
                    while GetMessageW(&mut msg, HWND(0), 0, 0).as_bool() {
                        // Just process messages to keep the hook alive
                    }
                },
                Err(e) => error!("❌ Falló al instalar hook de teclado: {}", e),
            }
        }
    });
}

unsafe extern "system" fn low_level_keyboard_proc(
    n_code: i32,
    w_param: WPARAM,
    l_param: LPARAM,
) -> LRESULT {
    if n_code != HC_ACTION as i32 || !ENABLED.load(Ordering::SeqCst) {
        return CallNextHookEx(HOOK_HANDLE, n_code, w_param, l_param);
    }

    let kbd = &*(l_param.0 as *const KBDLLHOOKSTRUCT);
    let vk = kbd.vkCode as u16;
    let flags = kbd.flags;
    
    // Check key combinations
    let ctrl_pressed = (windows::Win32::UI::Input::KeyboardAndMouse::GetAsyncKeyState(VK_CONTROL.0 as i32) as u16 & 0x8000) != 0;
    let alt_pressed = (flags.0 & 0x20) != 0; // LLKHF_ALTDOWN

    let mut block = false;

    // 1. Windows Key (Start Menu)
    if vk == VK_LWIN.0 || vk == VK_RWIN.0 {
        block = true;
    }
    
    // 2. Alt + Tab
    if alt_pressed && vk == VK_TAB.0 {
        block = true;
    }

    // 3. Ctrl + Esc (Start Menu alternative)
    if ctrl_pressed && vk == VK_ESCAPE.0 {
        block = true;
    }

    // 4. Alt + F4 (Close App)
    if alt_pressed && vk == VK_F4.0 {
        block = true;
    }

    // 5. Ctrl + Alt + Del (Partial block - system interrupts this, but we try)
    if ctrl_pressed && alt_pressed && vk == VK_DELETE.0 {
        // This is usually handled by OS/SAS, hard to block here but good practice to try
        block = true;
    }

    if block {
        // info!("🚫 Bloqueada tecla reservada: {}", vk);
        return LRESULT(1); // Block
    }

    CallNextHookEx(HOOK_HANDLE, n_code, w_param, l_param)
}

fn enable_task_mgr(enable: bool) {
    unsafe {
        let mut key: HKEY = HKEY(0);
        let path = windows::core::w!("Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System");
        
        // Create or Open Key
        let res = RegCreateKeyExW(
            HKEY_CURRENT_USER,
            path,
            0,
            None,
            REG_OPTION_NON_VOLATILE,
            KEY_WRITE,
            None,
            &mut key,
            None
        );

        if res.is_ok() {
            let val_name = windows::core::w!("DisableTaskMgr");
            let data = if enable { 0u32 } else { 1u32 }; // 1 = Disable, 0 = Enable
            
            let _ = RegSetValueExW(
                key,
                val_name,
                0,
                REG_DWORD,
                Some(std::slice::from_raw_parts(
                    &data as *const u32 as *const u8,
                    4
                )),
            );
            RegCloseKey(key);
            debug!("Task Manager {}", if enable { "Habilitado" } else { "DESHABILITADO" });
        } else {
            error!("Error accediendo al registro para TaskMgr");
        }
    }
}
