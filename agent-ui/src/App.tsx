import { useState, useEffect, useRef } from 'react';
import { Window, LogicalSize } from '@tauri-apps/api/window';
import './App.css';

const appWindow = Window.getCurrent();

interface StatusResponse {
  status: string;
  timestamp: string;
}

function App() {
  const [status, setStatus] = useState<string>('CONNECTING');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const lastStatus = useRef<string>('');

  // Seguridad: Bloquear atajos y click derecho
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "F12" ||
        e.key === "F5" ||
        (e.ctrlKey && e.key === "r") ||
        (e.ctrlKey && e.shiftKey && e.key === "I") ||
        (e.altKey && e.key === "F4") ||
        e.key === "Meta" || // Windows Key
        (e.altKey && e.key === "Tab")
      ) {
        e.preventDefault();
      }
    };
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    }
  }, []);

  // Control de Ventana según estado
  useEffect(() => {
    const manageWindow = async () => {
      if (status === 'ONLINE' && lastStatus.current !== 'ONLINE') {
        await appWindow.setFullscreen(true);
        await appWindow.setAlwaysOnTop(true);
        await appWindow.setDecorations(false);
        // Asegurar foco
        await appWindow.setFocus();
      } else if (status === 'SESSION_ACTIVE' && lastStatus.current !== 'SESSION_ACTIVE') {
        await appWindow.setFullscreen(false);
        // Toolbar mode: Small floating bar at top right or bottom right
        await appWindow.setSize(new LogicalSize(300, 80));
        // Position handled by user dragging or fixed? Let's fix it top-right for now
        // But we need screen size. For now, let's just make it small.
        // await appWindow.setPosition(new PhysicalPosition(50, 50)); 
        await appWindow.setAlwaysOnTop(true); // Keep toolbar visible
      }
      lastStatus.current = status;
    };
    manageWindow();
  }, [status]);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('http://127.0.0.1:9876/status');
        if (response.ok) {
          const data: StatusResponse = await response.json();
          const newStatus = data.status || 'CONNECTED';
          setStatus(newStatus);
        } else {
          setStatus('ERROR_RESPONSE');
        }
      } catch (error) {
        setStatus('DISCONNECTED');
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('http://127.0.0.1:9876/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (res.ok) {
        // Login successful, Agent Service will update status to SESSION_ACTIVE
        // We rely on polling to update UI
        setEmail('');
        setPassword('');
      } else {
        setErrorMsg('Credenciales inválidas');
      }
    } catch (err) {
      setErrorMsg('Error de conexión con Agente');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`container ${status.toLowerCase()}`}>

      {/* PANTALLA DE BLOQUEO / LOGIN */}
      {status === 'ONLINE' && (
        <div className="login-screen">
          <div className="login-card">
            <h1>eControl</h1>
            <p>Ingresa tus credenciales para desbloquear</p>
            <form onSubmit={handleLogin}>
              <input
                type="email"
                placeholder="Usuario"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
                autoFocus
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
              />
              {errorMsg && <div className="error-msg">{errorMsg}</div>}
              <button type="submit" disabled={loading}>
                {loading ? 'Verificando...' : 'Iniciar Sesión'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* BARRA DE HERRAMIENTAS DE SESIÓN */}
      {status === 'SESSION_ACTIVE' && (
        <div className="session-toolbar">
          <div className="status-indicator active"></div>
          <div className="session-info">
            <span className="time">00:00</span>
            <span className="balance">$0.00</span>
          </div>
          <button className="logout-btn" onClick={() => {
            // TODO: Implementar logout
            alert("Logout not implemented yet");
          }}>Salir</button>
        </div>
      )}

      {/* PANTALLA DE ERROR / CARGA */}
      {(status === 'DISCONNECTED' || status === 'CONNECTING' || status === 'ERROR_RESPONSE') && (
        <div className="error-screen">
          <div className="loader"></div>
          <p>{status === 'CONNECTING' ? 'Conectando al Agente...' : 'Buscando servicio...'}</p>
        </div>
      )}
    </div>
  );
}

export default App;
