import React, { useState } from 'react';
import { 
  Building2, 
  Calendar, 
  PlusCircle, 
  FileSpreadsheet, 
  LayoutDashboard, 
  FilePlus2, 
  FileText, 
  ShoppingBag, 
  Settings as SettingsIcon,
  ChevronDown,
  Check,
  ShieldCheck,
  Lock,
  LogOut,
  Eye,
  User
} from 'lucide-react';
import { api } from '../api';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  selectedYear, 
  setSelectedYear, 
  years, 
  onRefreshYears,
  currentUser,
  onOpenAuthModal,
  onLogout
}) {
  const [showYearModal, setShowYearModal] = useState(false);
  const [newYearVal, setNewYearVal] = useState(new Date().getFullYear() + 1);
  const [newYearBudget, setNewYearBudget] = useState(0);
  const [newYearDesc, setNewYearDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateYear = async (e) => {
    e.preventDefault();
    if (!newYearVal) return;
    setIsSubmitting(true);
    try {
      await api.createYear({
        year: parseInt(newYearVal, 10),
        initial_budget: parseFloat(newYearBudget) || 0,
        description: newYearDesc || `Presupuesto Anual ${newYearVal}`
      });
      await onRefreshYears();
      setSelectedYear(parseInt(newYearVal, 10));
      setShowYearModal(false);
    } catch (err) {
      alert('Error creando el ejercicio fiscal: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const navTabs = [
    { id: 'dashboard', label: 'Panel de Control', icon: LayoutDashboard },
    { id: 'new-request', label: 'Cargar Pedido / Mail', icon: FilePlus2, adminOnly: true },
    { id: 'requests-list', label: 'Gestión de Pedidos', icon: FileText },
    { id: 'purchases', label: 'Ejecución de Compras', icon: ShoppingBag, adminOnly: true },
    { id: 'settings', label: 'Áreas y Presupuestos', icon: SettingsIcon },
  ];

  return (
    <header className="bg-emerald-900 text-white shadow-lg sticky top-0 z-40 no-print">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between py-3 border-b border-emerald-800/80 gap-3">
          
          {/* Institution & Title */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-800 rounded-xl border border-emerald-700 shadow-inner flex items-center justify-center">
              <Building2 className="w-7 h-7 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded">
                  FICA - UNSL
                </span>
                <span className="text-xs text-emerald-200">Facultad de Ingeniería y Ciencias Agropecuarias</span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white leading-tight">
                Departamento de Ciencias Agropecuarias
              </h1>
              <p className="text-xs text-emerald-200 font-medium">
                Sistema de Gestión de Pedidos de Compras y Control Presupuestario
              </p>
            </div>
          </div>

          {/* Controls: Year Selector, Auth Status & Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 self-end md:self-center">
            
            {/* Auth Indicator / Login Button */}
            {currentUser ? (
              <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-700/80 rounded-lg px-2.5 py-1 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-200 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline font-bold text-white truncate max-w-[170px]">
                    {currentUser.name || currentUser.username}
                  </span>
                  <span className="text-[10px] bg-emerald-800 px-1.5 py-0.5 rounded text-emerald-200 font-bold uppercase">
                    Admin
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  title="Cerrar sesión de Administrador"
                  className="p-1 text-slate-300 hover:text-rose-300 hover:bg-emerald-800 rounded transition-colors ml-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all hover:scale-105"
                title="Iniciar sesión con Gmail para cargar pedidos o compras"
              >
                <Lock className="w-3.5 h-3.5 text-slate-900" />
                <span>Acceso Administrador</span>
              </button>
            )}

            {/* Year Selector */}
            <div className="flex items-center bg-emerald-950/70 border border-emerald-700/80 rounded-lg p-1">
              <Calendar className="w-4 h-4 ml-2 text-emerald-300" />
              <label htmlFor="year-select" className="sr-only">Ejercicio Fiscal</label>
              <select
                id="year-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="bg-transparent text-white font-bold text-sm px-2 py-1 outline-none cursor-pointer"
              >
                {years.map((y) => (
                  <option key={y.year} value={y.year} className="bg-emerald-900 text-white">
                    Año {y.year} {y.year === new Date().getFullYear() ? '(Actual)' : ''}
                  </option>
                ))}
              </select>

              {currentUser && (
                <button
                  type="button"
                  onClick={() => setShowYearModal(true)}
                  title="Crear nuevo ejercicio anual"
                  className="p-1 text-emerald-300 hover:text-white hover:bg-emerald-800 rounded transition-colors ml-1"
                >
                  <PlusCircle className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Export CSV (Always Public) */}
            <a
              href={api.getExportUrl(selectedYear)}
              download={`compras_agro_${selectedYear}.csv`}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors border border-emerald-600 shadow-sm"
              title="Descargar reporte completo en Excel / CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span className="hidden sm:inline">Exportar Excel</span>
            </a>
          </div>
        </div>

        {/* Public Notice Strip when not logged in */}
        {!currentUser && (
          <div className="bg-emerald-950/60 text-emerald-200 text-[11px] py-1 px-3 rounded-md my-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span><strong>Modo Consulta Pública (Solo Lectura):</strong> Puedes consultar todos los presupuestos, pedidos y saldos.</span>
            </div>
            <button
              onClick={onOpenAuthModal}
              className="text-emerald-300 hover:text-white underline font-bold"
            >
              Iniciar sesión como Administrador
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-2 py-2 overflow-x-auto scrollbar-none">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-white text-emerald-950 shadow-md scale-100'
                    : 'text-emerald-100 hover:bg-emerald-800/80 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-emerald-300'}`} />
                {tab.label}
                {tab.adminOnly && !currentUser && (
                  <span className="text-[10px] bg-emerald-950/70 text-emerald-300 px-1.5 py-0.2 rounded font-normal">
                    Admin
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Modal: Nuevo Ejercicio Anual */}
      {showYearModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-emerald-900 px-6 py-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-lg">Nuevo Ejercicio Fiscal</h3>
              </div>
              <button 
                onClick={() => setShowYearModal(false)}
                className="text-emerald-300 hover:text-white text-xl font-bold leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateYear} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Año del Ejercicio
                </label>
                <input
                  type="number"
                  min="2020"
                  max="2040"
                  value={newYearVal}
                  onChange={(e) => setNewYearVal(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none text-slate-800 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Monto Total Presupuestado Inicial ($)
                </label>
                <input
                  type="number"
                  step="1000"
                  min="0"
                  value={newYearBudget}
                  onChange={(e) => setNewYearBudget(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none text-slate-800 font-semibold"
                  placeholder="0"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Descripción u Observaciones (Opcional)
                </label>
                <input
                  type="text"
                  value={newYearDesc}
                  onChange={(e) => setNewYearDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none text-slate-800 text-sm"
                  placeholder="Ej. Presupuesto Ordinario Anual"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowYearModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg shadow transition-colors text-sm flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {isSubmitting ? 'Guardando...' : 'Crear Ejercicio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
