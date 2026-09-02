import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  KeyRound, 
  AlertCircle, 
  X, 
  ArrowRight,
  Info,
  Eye,
  EyeOff
} from 'lucide-react';
import { api } from '../api';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    setError(null);

    try {
      const result = await api.login(username.trim(), password);
      onLoginSuccess(result.user);
      onClose();
    } catch (err) {
      setError(err.message || 'Error al verificar credenciales');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden text-slate-800 animate-in zoom-in-95 duration-200 border border-slate-200">
        
        {/* Modal Top Banner */}
        <div className="bg-gradient-to-r from-emerald-900 to-teal-950 px-6 py-5 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-emerald-300 hover:text-white text-2xl font-bold leading-none p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-800/80 rounded-2xl border border-emerald-700 shadow-inner">
              <ShieldCheck className="w-7 h-7 text-emerald-300" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded">
                Seguridad & Acceso
              </span>
              <h3 className="text-lg font-black text-white mt-0.5">
                Acceso de Administrador
              </h3>
              <p className="text-xs text-emerald-200">
                Depto. Ciencias Agropecuarias (FICA - UNSL)
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          
          {/* Information Notice */}
          <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl text-xs text-blue-950 space-y-1 font-medium">
            <div className="flex items-center gap-1.5 font-bold text-blue-900">
              <Info className="w-4 h-4 text-blue-700 shrink-0" />
              <span>Consultas públicas abiertas</span>
            </div>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              Cualquier usuario puede consultar presupuestos, pedidos y saldos. Para <strong>cargar pedidos, registrar compras y modificar presupuestos</strong> debes ingresar con tu usuario y clave autorizada.
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 flex items-start gap-2.5 font-medium animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Usuario */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Usuario *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ingresa tu usuario"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none transition-all"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Clave */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Contraseña / Clave *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Verificando acceso...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-emerald-300" />
                    <span>Iniciar Sesión como Administrador</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

          </form>

        </div>

      </div>
    </div>
  );
}
