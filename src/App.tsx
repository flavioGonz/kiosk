import { useState, useEffect } from 'react'
import { ShieldAlert, Clock, Calendar, Smartphone, RefreshCw, ShieldX } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import { AttendanceScanner } from './components/AttendanceScanner'
import { IdentityConfirmation } from './components/IdentityConfirmation'
import { AttendanceSelection } from './components/AttendanceSelection'
import { TicketPrinter } from './components/TicketPrinter'
import { AttendanceLogs } from './components/AttendanceLogs'
import { AdminPanel } from './components/AdminPanel'
import { Modal } from './components/Modal'
import { useScannerListener } from './hooks/useScannerListener'
import { type User } from './db'
import { syncService } from './services/syncService'
import { ProcessingSplash } from './components/ProcessingSplash'
import { EnrollmentSplash } from './components/EnrollmentSplash'

type ViewState = 'home' | 'scanner' | 'confirm' | 'selection' | 'printer' | 'history' | 'landing'

function Kiosk() {
  const [view, setView] = useState<ViewState>('landing')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [currentPhoto, setCurrentPhoto] = useState<string | null>(null)
  const [attendanceType, setAttendanceType] = useState<string | null>(null)
  const [lastTimestamp, setLastTimestamp] = useState<number | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showUnknownFace, setShowUnknownFace] = useState(false)
  const [serverOnline, setServerOnline] = useState(false)
  const [deviceStatus, setDeviceStatus] = useState<'approved' | 'pending' | 'blocked' | 'unregistered'>('approved')
  const [showEnrollment, setShowEnrollment] = useState(false)

  // Long press for enrollment
  const longPressTimer = useRef<number | null>(null)
  const [isPressing, setIsPressing] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])



  // Check server connection and device moderation
  const checkServerAndDevice = async () => {
    const config = syncService.getConfig()
    if (config.serverUrl) {
      const result = await syncService.testConnection()
      setServerOnline(result.success)

      if (result.success) {
        // Heartbeat and Status Check always run if server is set
        await syncService.heartBeat();
        const status = await syncService.checkDeviceStatus();
        setDeviceStatus(status);
      }
    } else {
      setServerOnline(false)
      setDeviceStatus('approved') // Allow local use if no server is set
    }
  }
  checkServerAndDevice()
  const serverCheck = setInterval(checkServerAndDevice, 20000)
  return () => clearInterval(serverCheck)
}, [])

useScannerListener((scannedData) => {
  console.log('Scanned QR:', scannedData)
  setView('history')
})

const handleStartPress = () => {
  if (view !== 'landing') return
  setIsPressing(true)
  longPressTimer.current = window.setTimeout(() => {
    setShowEnrollment(true)
    setIsPressing(false)
  }, 5000)
}

const handleEndPress = () => {
  setIsPressing(false)
  if (longPressTimer.current) {
    clearTimeout(longPressTimer.current)
    longPressTimer.current = null
  }
}

return (
  <div
    className="min-h-screen w-full flex flex-col items-center justify-center p-6 sm:p-12 pb-32 relative overflow-hidden bg-slate-50 select-none"
    onMouseDown={handleStartPress}
    onMouseUp={handleEndPress}
    onMouseLeave={handleEndPress}
    onTouchStart={handleStartPress}
    onTouchEnd={handleEndPress}
  >
    <AnimatePresence>
      {isPressing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[60] bg-blue-600/10 pointer-events-none flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 10 }}
            transition={{ duration: 5, ease: "linear" }}
            className="w-20 h-20 bg-blue-600/5 rounded-full"
          />
          <div className="absolute top-12 flex flex-col items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-blue-600 animate-bounce" />
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Modo Admin (Mantener 5s)</span>
          </div>
        </motion.div>
      )}

      {showEnrollment && (
        <EnrollmentSplash onClose={() => setShowEnrollment(false)} />
      )}

      {deviceStatus !== 'approved' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-12 text-center"
        >
          <div className={`w-36 h-36 rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl ${deviceStatus === 'blocked' ? 'bg-rose-100 text-rose-600 shadow-rose-200/50' : 'bg-amber-100 text-amber-600 shadow-amber-200/50'}`}>
            {deviceStatus === 'blocked' ? <ShieldX size={64} strokeWidth={2.5} /> : <Smartphone size={64} strokeWidth={2.5} className="animate-pulse" />}
          </div>

          <h2 className="text-5xl font-black text-slate-900 uppercase tracking-tighter italic mb-6 leading-tight whitespace-pre-line">
            {deviceStatus === 'blocked' ? 'Terminal\nBloqueado' : 'Esperando\nAdopción'}
          </h2>

          <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px] max-w-[280px] mx-auto leading-relaxed mb-16 opacity-60">
            {deviceStatus === 'blocked'
              ? 'Este terminal ha sido restringido por seguridad. Solicite desbloqueo al administrador.'
              : 'Este dispositivo es nuevo. El administrador central debe habilitarlo antes de operar.'}
          </p>

          <div className="flex flex-col items-center gap-3 py-6 px-10 bg-slate-50 rounded-3xl border border-slate-100">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Identificador Único</span>
            <span className="text-xs font-mono font-bold text-slate-400 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">{syncService.getKioskId()}</span>
            {deviceStatus === 'pending' && <span className="flex items-center gap-2 mt-2 text-[10px] font-black text-amber-500 uppercase tracking-widest"><RefreshCw className="w-3 h-3 animate-spin" /> Verificando autorización...</span>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    {/* Decorative Background Elements */}
    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />
    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-400/5 rounded-full blur-[100px] pointer-events-none" />

    {/* Admin Secret Link (top-right, invisible) */}
    <Link
      to="/admin"
      className="fixed top-6 right-6 p-4 rounded-full text-slate-200 hover:text-slate-300 transition-all z-50 group"
    >
      <ShieldAlert className="w-6 h-6" />
    </Link>

    <main className="flex-1 w-full max-w-4xl flex flex-col items-center justify-center gap-12 no-print relative z-10">
      <AnimatePresence mode="wait">
        {view === 'landing' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center text-center space-y-12"
          >
            <div className="relative group">
              <div className="absolute inset-0 bg-blue-500/10 rounded-[3rem] blur-2xl group-hover:bg-blue-500/20 transition-all" />
              <div className="relative w-80 h-[400px] rounded-[3rem] border-[12px] border-white shadow-2xl overflow-hidden bg-slate-100 flex items-center justify-center group-hover:scale-[1.02] transition-transform duration-500">
                {/* Updated Face Photo as static placeholder */}
                <img
                  src="/reco.jpg"
                  className="w-full h-full object-cover opacity-80"
                  alt="Biometric Scan"
                />
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-900/60 to-transparent" />
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setView('scanner')}
                className="absolute -bottom-6 left-0 right-0 mx-auto w-fit px-10 py-5 bg-blue-600 text-white rounded-2xl shadow-2xl shadow-blue-600/40 flex items-center gap-3 active:bg-blue-700 transition-all border-4 border-white z-20"
              >
                <Clock className="w-6 h-6" />
                <span className="text-sm font-black uppercase tracking-widest italic">Registrar Marca</span>
              </motion.button>
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Control de Asistencia</h1>
              <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">Identificación Biométrica Facial</p>
            </div>
          </motion.div>
        )}

        {view === 'scanner' && (
          <motion.div
            key="scanner"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="w-full flex flex-col items-center gap-8"
          >
            <AttendanceScanner
              onBack={() => setView('landing')}
              onMatch={(user, photo) => {
                setCurrentUser(user)
                setCurrentPhoto(photo)
                setView('confirm')
              }}
              onUnknownFace={() => {
                setShowUnknownFace(true)
                setTimeout(() => setShowUnknownFace(false), 4000)
              }}
            />
            <button
              onClick={() => setView('landing')}
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
            >
              Volver al inicio
            </button>
          </motion.div>
        )}

        {view === 'confirm' && currentUser && (
          <Modal
            isOpen={true}
            onClose={() => {
              setCurrentUser(null)
              setView('scanner')
            }}
            title=""
            maxWidth="max-w-lg"
          >
            <IdentityConfirmation
              user={currentUser}
              capturedPhoto={currentPhoto}
              onConfirm={() => setView('selection')}
              onReject={() => {
                setCurrentUser(null)
                setView('scanner')
              }}
            />
          </Modal>
        )}

        {view === 'selection' && currentUser && (
          <AttendanceSelection
            user={currentUser}
            photo={currentPhoto}
            onBack={() => setView('scanner')}
            onComplete={(type) => {
              setAttendanceType(type)
              setLastTimestamp(Date.now())
              setView('printer')
            }}
          />
        )}

        {view === 'printer' && currentUser && attendanceType && lastTimestamp && (
          <Modal
            isOpen={true}
            onClose={() => setView('scanner')}
            title=""
            maxWidth="max-w-lg"
          >
            <TicketPrinter
              user={currentUser}
              type={attendanceType}
              timestamp={lastTimestamp}
              onDone={() => setView('scanner')}
            />
          </Modal>
        )}

        {view === 'history' && (
          <AttendanceLogs onBack={() => setView('scanner')} />
        )}
      </AnimatePresence>
    </main>

    {/* BOTTOM STATUS BAR - REFINED COMPACT FLAT THEME */}
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200"
    >
      <div className="max-w-screen-xl mx-auto px-10 py-3 flex items-center justify-between">
        {/* Left: Time & Date */}
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4">
            <Clock className="w-6 h-6 text-blue-600" />
            <motion.span
              key={currentTime.getMinutes()}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-4xl font-black text-slate-900 tracking-tighter leading-none tabular-nums font-mono italic"
            >
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </motion.span>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="flex items-center gap-2.5 text-slate-500">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-black uppercase tracking-[0.2em] italic">
              {currentTime.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
        </div>

        {/* Right: Server Status Dot Only */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={`w-3.5 h-3.5 rounded-full border-2 border-white ${serverOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]' : 'bg-red-500'}`} />
            {serverOnline && (
              <div className="absolute inset-0 w-3.5 h-3.5 rounded-full bg-green-500 animate-ping opacity-40" />
            )}
          </div>
        </div>
      </div>
    </motion.div>

    {/* Unknown Face Splash */}
    {showUnknownFace && (
      <ProcessingSplash
        type="not-recognized"
        onClose={() => setShowUnknownFace(false)}
      />
    )}
  </div>
)
}

function AdminView() {
  const navigate = useNavigate()
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return sessionStorage.getItem('adminSession') === 'active'
  })
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (username === 'admin' && password === 'flavio20') {
      setIsLoggedIn(true)
      sessionStorage.setItem('adminSession', 'active')
    } else {
      alert('Credenciales incorrectas')
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-slate-50 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[100px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm bg-white rounded-[2rem] border border-gray-100 shadow-2xl p-10 relative z-10"
        >
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/20">
              <ShieldAlert className="text-white w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Acceso Admin</h2>
            <p className="text-sm text-slate-500 font-medium tracking-tight">Consola de Control Biométrico</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Usuario</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-slate-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 ring-blue-500 outline-none transition-all"
                placeholder="Nombre de usuario"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 ring-blue-500 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gray-900 text-white rounded-2xl py-4 font-black uppercase tracking-widest text-xs active:scale-95 transition-all shadow-xl mt-4"
            >
              Entrar al Sistema
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full text-slate-400 py-2 font-bold uppercase tracking-widest text-[10px] active:text-slate-600 transition-all mt-2"
            >
              Volver al Kiosko
            </button>
          </form>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center relative overflow-hidden bg-slate-50">
      <AdminPanel onBack={() => navigate('/')} />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Kiosk />} />
        <Route path="/admin" element={<AdminView />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
