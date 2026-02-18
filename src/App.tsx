import { useState, useEffect } from 'react'
import { ShieldAlert, Clock, Calendar } from 'lucide-react'
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

type ViewState = 'home' | 'scanner' | 'confirm' | 'selection' | 'printer' | 'history'

function Kiosk() {
  const [view, setView] = useState<ViewState>('scanner')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [currentPhoto, setCurrentPhoto] = useState<string | null>(null)
  const [attendanceType, setAttendanceType] = useState<string | null>(null)
  const [lastTimestamp, setLastTimestamp] = useState<number | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showUnknownFace, setShowUnknownFace] = useState(false)
  const [serverOnline, setServerOnline] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    // Initialize sync service
    syncService.init()

    // Check server connection periodically
    const checkServer = async () => {
      const config = syncService.getConfig()
      if (config.serverUrl && config.enabled) {
        const result = await syncService.testConnection()
        setServerOnline(result.success)
      } else {
        setServerOnline(false)
      }
    }
    checkServer()
    const serverCheck = setInterval(checkServer, 30000)
    return () => clearInterval(serverCheck)
  }, [])

  useScannerListener((scannedData) => {
    console.log('Scanned QR:', scannedData)
    setView('history')
  })

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 sm:p-12 pb-32 relative overflow-hidden bg-white">
      <div className="gradient-bg opacity-30" />

      {/* Admin Secret Link (top-right, invisible) */}
      <Link
        to="/admin"
        className="fixed top-6 right-6 p-4 rounded-full text-black/5 hover:text-black/10 transition-all z-50 group"
      >
        <ShieldAlert className="w-6 h-6" />
      </Link>

      <main className="flex-1 w-full max-w-4xl flex flex-col items-center justify-center gap-12 no-print relative z-10">
        <AnimatePresence mode="wait">
          {view === 'scanner' && (
            <motion.div
              key="scanner"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full flex justify-center"
            >
              <AttendanceScanner
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
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (username === 'admin' && password === 'flavio20') {
      setIsLoggedIn(true)
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

export function App() {
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
