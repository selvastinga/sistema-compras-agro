import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Layers, 
  FolderTree, 
  DollarSign, 
  Percent, 
  Plus, 
  Check, 
  Edit2, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  Equal,
  Building,
  Tag,
  Calendar,
  ShieldCheck,
  Lock,
  Mail,
  UserCheck
} from 'lucide-react';
import { api } from '../api';

export default function Settings({ 
  areas, 
  rubros, 
  selectedYear, 
  onRefreshAreas, 
  onRefreshRubros, 
  onRefreshYears,
  currentUser,
  onOpenAuthModal
}) {
  const [activeSubTab, setActiveSubTab] = useState('budget'); // 'budget', 'areas', 'rubros', 'admins'
  
  // Budget Allocations State
  const [budgetData, setBudgetData] = useState(null);
  const [initialBudget, setInitialBudget] = useState(0);
  const [allocations, setAllocations] = useState([]);
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [budgetSuccessMsg, setBudgetSuccessMsg] = useState(null);

  // Admin Users State
  const [adminsList, setAdminsList] = useState([]);
  const [isSavingAdmins, setIsSavingAdmins] = useState(false);
  const [adminsSuccessMsg, setAdminsSuccessMsg] = useState(null);

  // New Area Modal State
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [areaForm, setAreaForm] = useState({ name: '', code: '', color: '#10B981' });

  // New Rubro Modal State
  const [showRubroModal, setShowRubroModal] = useState(false);
  const [editingRubro, setEditingRubro] = useState(null);
  const [rubroForm, setRubroForm] = useState({ name: '', description: '', color: '#06B6D4' });

  // Load budget data for selected year
  const loadBudgets = async () => {
    try {
      const data = await api.getBudgets(selectedYear);
      setBudgetData(data);
      setInitialBudget(data.year?.initial_budget || 0);
      setAllocations(data.allocations || []);
    } catch (err) {
      console.error('Error loading budget:', err);
    }
  };

  // Load Admins list
  const loadAdmins = async () => {
    try {
      const data = await api.getAdmins();
      setAdminsList(data || []);
    } catch (err) {
      console.error('Error loading admins:', err);
    }
  };

  useEffect(() => {
    loadBudgets();
    loadAdmins();
  }, [selectedYear]);

  // Handle % change for an area
  const handlePercentageChange = (areaId, newPct) => {
    const val = parseFloat(newPct) || 0;
    setAllocations(prev => prev.map(a => {
      if (a.area_id === areaId) {
        const amt = (initialBudget * val) / 100;
        return { ...a, percentage: val, allocated_amount: amt };
      }
      return a;
    }));
  };

  // Handle manual allocated amount change
  const handleAmountChange = (areaId, newAmt) => {
    const val = parseFloat(newAmt) || 0;
    setAllocations(prev => prev.map(a => {
      if (a.area_id === areaId) {
        const pct = initialBudget > 0 ? (val / initialBudget) * 100 : 0;
        return { ...a, allocated_amount: val, percentage: Math.round(pct * 100) / 100 };
      }
      return a;
    }));
  };

  // Auto distribute % equally
  const handleEquallyDistribute = () => {
    const count = allocations.length;
    if (count === 0) return;
    const equalPct = Math.round((100 / count) * 100) / 100;
    setAllocations(prev => prev.map(a => {
      const amt = (initialBudget * equalPct) / 100;
      return { ...a, percentage: equalPct, allocated_amount: amt };
    }));
  };

  // Total % sum
  const totalPercentageSum = allocations.reduce((sum, a) => sum + (parseFloat(a.percentage) || 0), 0);
  const totalAllocatedSum = allocations.reduce((sum, a) => sum + (parseFloat(a.allocated_amount) || 0), 0);

  // Save budget allocations
  const handleSaveBudget = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuthModal();
      return;
    }
    setIsSavingBudget(true);
    setBudgetSuccessMsg(null);
    try {
      await api.updateBudgets(selectedYear, {
        initial_budget: parseFloat(initialBudget) || 0,
        allocations: allocations.map(a => ({
          area_id: a.area_id,
          percentage: parseFloat(a.percentage) || 0,
          allocated_amount: parseFloat(a.allocated_amount) || 0
        }))
      });
      setBudgetSuccessMsg('¡Presupuesto y asignaciones guardadas exitosamente!');
      await loadBudgets();
      onRefreshYears();
    } catch (err) {
      alert('Error guardando presupuesto: ' + err.message);
    } finally {
      setIsSavingBudget(false);
    }
  };

  // Save Admin accounts list
  const handleSaveAdmins = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuthModal();
      return;
    }
    setIsSavingAdmins(true);
    setAdminsSuccessMsg(null);
    try {
      await api.updateAdmins(adminsList);
      setAdminsSuccessMsg('¡Las 3 cuentas de Gmail autorizadas fueron actualizadas correctamente!');
      await loadAdmins();
    } catch (err) {
      alert('Error guardando administradores: ' + err.message);
    } finally {
      setIsSavingAdmins(false);
    }
  };

  const handleAdminFieldChange = (index, field, value) => {
    const updated = [...adminsList];
    updated[index][field] = value;
    setAdminsList(updated);
  };

  // Area Management Handlers
  const handleOpenNewArea = () => {
    if (!currentUser) {
      onOpenAuthModal();
      return;
    }
    setEditingArea(null);
    setAreaForm({ name: '', code: '', color: '#10B981' });
    setShowAreaModal(true);
  };

  const handleOpenEditArea = (area) => {
    if (!currentUser) {
      onOpenAuthModal();
      return;
    }
    setEditingArea(area);
    setAreaForm({ name: area.name, code: area.code || '', color: area.color || '#10B981' });
    setShowAreaModal(true);
  };

  const handleSaveArea = async (e) => {
    e.preventDefault();
    if (!areaForm.name.trim()) return;
    try {
      if (editingArea) {
        await api.updateArea(editingArea.id, areaForm);
      } else {
        await api.createArea(areaForm);
      }
      await onRefreshAreas();
      await loadBudgets();
      setShowAreaModal(false);
    } catch (err) {
      alert('Error guardando el área: ' + err.message);
    }
  };

  const handleDeleteArea = async (area) => {
    if (!currentUser) {
      onOpenAuthModal();
      return;
    }
    if (!window.confirm(`¿Deseas eliminar o desactivar el área "${area.name}"?`)) return;
    try {
      const res = await api.deleteArea(area.id);
      alert(res.message);
      await onRefreshAreas();
      await loadBudgets();
    } catch (err) {
      alert('Error eliminando área: ' + err.message);
    }
  };

  // Rubro Management Handlers
  const handleOpenNewRubro = () => {
    if (!currentUser) {
      onOpenAuthModal();
      return;
    }
    setEditingRubro(null);
    setRubroForm({ name: '', description: '', color: '#06B6D4' });
    setShowRubroModal(true);
  };

  const handleOpenEditRubro = (rubro) => {
    if (!currentUser) {
      onOpenAuthModal();
      return;
    }
    setEditingRubro(rubro);
    setRubroForm({ name: rubro.name, description: rubro.description || '', color: rubro.color || '#06B6D4' });
    setShowRubroModal(true);
  };

  const handleSaveRubro = async (e) => {
    e.preventDefault();
    if (!rubroForm.name.trim()) return;
    try {
      if (editingRubro) {
        await api.updateRubro(editingRubro.id, rubroForm);
      } else {
        await api.createRubro(rubroForm);
      }
      await onRefreshRubros();
      setShowRubroModal(false);
    } catch (err) {
      alert('Error guardando rubro: ' + err.message);
    }
  };

  const handleDeleteRubro = async (rubro) => {
    if (!currentUser) {
      onOpenAuthModal();
      return;
    }
    if (!window.confirm(`¿Deseas eliminar o desactivar el rubro "${rubro.name}"?`)) return;
    try {
      const res = await api.deleteRubro(rubro.id);
      alert(res.message);
      await onRefreshRubros();
    } catch (err) {
      alert('Error eliminando rubro: ' + err.message);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
            Configuración y Parámetros
          </span>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 mt-1">
            Administración de Áreas, Rubros y Presupuestos
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Personaliza las áreas del departamento, los rubros de compra, la distribución porcentual y los administradores autorizados.
          </p>
        </div>

        {/* Sub-tabs switch */}
        <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl gap-1">
          <button
            onClick={() => setActiveSubTab('budget')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'budget' ? 'bg-white text-emerald-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
            Presupuesto ({selectedYear})
          </button>
          <button
            onClick={() => setActiveSubTab('areas')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'areas' ? 'bg-white text-emerald-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building className="w-3.5 h-3.5 text-emerald-700" />
            Áreas ({areas.length})
          </button>
          <button
            onClick={() => setActiveSubTab('rubros')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'rubros' ? 'bg-white text-emerald-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-emerald-700" />
            Rubros ({rubros.length})
          </button>
          <button
            onClick={() => setActiveSubTab('admins')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'admins' ? 'bg-white text-emerald-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            Usuarios y Claves ({adminsList.length})
          </button>
        </div>
      </div>

      {!currentUser && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-medium">
            <Lock className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Estás en <strong>Modo Consulta Pública (Solo Lectura)</strong>. Para modificar porcentajes, crear áreas o guardar cambios debes iniciar sesión con tu usuario y clave autorizada.</span>
          </div>
          <button
            onClick={onOpenAuthModal}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-xs shrink-0 self-start sm:self-auto"
          >
            Iniciar Sesión
          </button>
        </div>
      )}

      {/* SubTab 1: Presupuesto y Distribución de Porcentajes */}
      {activeSubTab === 'budget' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Percent className="w-5 h-5 text-emerald-700" />
                Distribución Presupuestaria por Área - Año {selectedYear}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Define el monto inicial del departamento y asigna el porcentaje (%) que le corresponde a cada una de las áreas.
              </p>
            </div>

            {currentUser && (
              <button
                type="button"
                onClick={handleEquallyDistribute}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 transition-colors"
              >
                <Equal className="w-3.5 h-3.5" />
                Distribuir % Equitativamente
              </button>
            )}
          </div>

          {budgetSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {budgetSuccessMsg}
            </div>
          )}

          <form onSubmit={handleSaveBudget} className="space-y-6">
            
            {/* Monto Inicial Total */}
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 max-w-md">
              <label className="block text-xs font-bold text-emerald-950 uppercase mb-1">
                Presupuesto Inicial Total del Departamento ($) *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center font-bold text-slate-500 text-sm">$</span>
                <input
                  type="number"
                  step="1000"
                  min="0"
                  disabled={!currentUser}
                  value={initialBudget}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setInitialBudget(val);
                    setAllocations(prev => prev.map(a => ({
                      ...a,
                      allocated_amount: (val * (a.percentage || 0)) / 100
                    })));
                  }}
                  className="w-full pl-8 pr-3 py-2 bg-white border border-emerald-300 rounded-lg text-base font-black text-slate-900 focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-100"
                  required
                />
              </div>
            </div>

            {/* Table of Allocations per Area */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Área del Departamento</th>
                    <th className="py-2.5 px-3 w-36 text-center">Porcentaje (%)</th>
                    <th className="py-2.5 px-3 w-48 text-right">Monto Asignado ($)</th>
                    <th className="py-2.5 px-3 w-36 text-right">Total Gastado</th>
                    <th className="py-2.5 px-3 w-36 text-right">Saldo Restante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allocations.map((alloc) => (
                    <tr key={alloc.area_id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: alloc.area_color || '#10B981' }} />
                          {alloc.area_name}
                        </div>
                      </td>

                      <td className="py-2 px-3">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            disabled={!currentUser}
                            value={alloc.percentage}
                            onChange={(e) => handlePercentageChange(alloc.area_id, e.target.value)}
                            className="w-20 px-2 py-1 text-center font-bold text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-600 disabled:bg-slate-100"
                          />
                          <span className="font-bold text-slate-500">%</span>
                        </div>
                      </td>

                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          disabled={!currentUser}
                          value={alloc.allocated_amount}
                          onChange={(e) => handleAmountChange(alloc.area_id, e.target.value)}
                          className="w-36 px-2 py-1 text-right font-bold text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-600 text-slate-800 disabled:bg-slate-100"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-800">
                        {formatCurrency(alloc.total_spent)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-black text-slate-900">
                        {formatCurrency(alloc.allocated_amount - (alloc.total_spent || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-black border-t-2 border-slate-200">
                  <tr>
                    <td className="py-3 px-3 uppercase">Total Asignado:</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        Math.abs(totalPercentageSum - 100) < 0.1 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {totalPercentageSum.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-950 font-black">
                      {formatCurrency(totalAllocatedSum)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {Math.abs(totalPercentageSum - 100) >= 0.1 && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  Nota: La suma de porcentajes actual es <strong>{totalPercentageSum.toFixed(1)}%</strong>. Puedes ajustarla para que complete el 100% de los fondos.
                </span>
              </div>
            )}

            {currentUser && (
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingBudget}
                  className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-md text-xs flex items-center gap-2 transition-all"
                >
                  <Check className="w-4 h-4" />
                  {isSavingBudget ? 'Guardando...' : 'Guardar Asignaciones de Presupuesto'}
                </button>
              </div>
            )}

          </form>

        </div>
      )}

      {/* SubTab 2: Gestión de Áreas */}
      {activeSubTab === 'areas' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-5 h-5 text-emerald-700" />
                Áreas del Departamento de Ciencias Agropecuarias
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Crea nuevas áreas o edita las existentes ("Dejame agregar opciones aqui").
              </p>
            </div>

            {currentUser && (
              <button
                onClick={handleOpenNewArea}
                className="flex items-center gap-1 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                Agregar Nueva Área
              </button>
            )}
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">Color</th>
                  <th className="py-2.5 px-3">Nombre del Área</th>
                  <th className="py-2.5 px-3 w-24">Código</th>
                  <th className="py-2.5 px-3 w-28 text-center">Estado</th>
                  {currentUser && <th className="py-2.5 px-3 w-28 text-center">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {areas.map((area) => (
                  <tr key={area.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 text-center">
                      <span className="w-4 h-4 rounded-full inline-block border border-slate-200" style={{ backgroundColor: area.color || '#10B981' }} />
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {area.name}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-600">
                      {area.code || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        area.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {area.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    {currentUser && (
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditArea(area)}
                            className="p-1 text-slate-500 hover:text-blue-700 rounded transition-colors"
                            title="Editar área"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteArea(area)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Eliminar o desactivar área"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* SubTab 3: Gestión de Rubros */}
      {activeSubTab === 'rubros' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Tag className="w-5 h-5 text-emerald-700" />
                Rubros de Compra
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Administra las categorías de bienes y servicios ("dejame agregar opciones aqui").
              </p>
            </div>

            {currentUser && (
              <button
                onClick={handleOpenNewRubro}
                className="flex items-center gap-1 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                Agregar Nuevo Rubro
              </button>
            )}
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">Color</th>
                  <th className="py-2.5 px-3 w-48">Nombre del Rubro</th>
                  <th className="py-2.5 px-3">Descripción y Ejemplos</th>
                  <th className="py-2.5 px-3 w-28 text-center">Estado</th>
                  {currentUser && <th className="py-2.5 px-3 w-28 text-center">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rubros.map((rubro) => (
                  <tr key={rubro.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 text-center">
                      <span className="w-4 h-4 rounded-full inline-block border border-slate-200" style={{ backgroundColor: rubro.color || '#06B6D4' }} />
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {rubro.name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {rubro.description || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        rubro.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {rubro.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    {currentUser && (
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditRubro(rubro)}
                            className="p-1 text-slate-500 hover:text-blue-700 rounded transition-colors"
                            title="Editar rubro"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRubro(rubro)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Eliminar o desactivar rubro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* SubTab 4: Gestión de Usuarios Administradores */}
      {activeSubTab === 'admins' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                Usuarios Administradores Autorizados (3 Cuentas)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cuentas autorizadas para cargar solicitudes, registrar compras y gestionar presupuestos (Director, Vicedirección y Departamento).
              </p>
            </div>
          </div>

          {adminsSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {adminsSuccessMsg}
            </div>
          )}

          <form onSubmit={handleSaveAdmins} className="space-y-4 max-w-3xl">
            {adminsList.map((adm, idx) => (
              <div key={adm.id || idx} className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Usuario
                  </label>
                  <div className="px-3 py-2 bg-slate-200/70 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800">
                    {adm.username}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre / Cargo
                  </label>
                  <input
                    type="text"
                    disabled={!currentUser}
                    value={adm.name || ''}
                    onChange={(e) => handleAdminFieldChange(idx, 'name', e.target.value)}
                    placeholder="Ej. Director (Omar)"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 bg-white disabled:bg-slate-100 font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nueva Clave (Opcional)
                  </label>
                  <input
                    type="password"
                    disabled={!currentUser}
                    value={adm.password || ''}
                    onChange={(e) => handleAdminFieldChange(idx, 'password', e.target.value)}
                    placeholder="Dejar vacío para no cambiar"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 bg-white disabled:bg-slate-100 text-slate-800"
                  />
                </div>
              </div>
            ))}

            {currentUser && (
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingAdmins}
                  className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-md text-xs flex items-center gap-2 transition-all"
                >
                  <Check className="w-4 h-4" />
                  {isSavingAdmins ? 'Guardando...' : 'Guardar Cambios de Usuarios'}
                </button>
              </div>
            )}
          </form>

        </div>
      )}

      {/* Modal: Area Form */}
      {showAreaModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-emerald-900 px-6 py-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-base">
                {editingArea ? 'Editar Área' : 'Nueva Área del Departamento'}
              </h3>
              <button onClick={() => setShowAreaModal(false)} className="text-emerald-300 hover:text-white text-xl font-bold leading-none">
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveArea} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Área *</label>
                <input
                  type="text"
                  value={areaForm.name}
                  onChange={(e) => setAreaForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej. Área de Zootecnia y Pasturas"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Código / Sigla</label>
                  <input
                    type="text"
                    value={areaForm.code}
                    onChange={(e) => setAreaForm(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="Ej. ZP"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold uppercase focus:ring-2 focus:ring-emerald-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Color Distintivo</label>
                  <input
                    type="color"
                    value={areaForm.color}
                    onChange={(e) => setAreaForm(prev => ({ ...prev, color: e.target.value }))}
                    className="w-full h-9 p-1 border border-slate-300 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAreaModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-bold rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg text-xs"
                >
                  Guardar Área
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Rubro Form */}
      {showRubroModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-emerald-900 px-6 py-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-base">
                {editingRubro ? 'Editar Rubro' : 'Nuevo Rubro de Compra'}
              </h3>
              <button onClick={() => setShowRubroModal(false)} className="text-emerald-300 hover:text-white text-xl font-bold leading-none">
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveRubro} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Rubro *</label>
                <input
                  type="text"
                  value={rubroForm.name}
                  onChange={(e) => setRubroForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej. Herramientas e Insumos de Campo"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descripción y Detalles</label>
                <textarea
                  rows={3}
                  value={rubroForm.description}
                  onChange={(e) => setRubroForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Materiales comprendidos dentro de este clasificador..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Color Distintivo</label>
                <input
                  type="color"
                  value={rubroForm.color}
                  onChange={(e) => setRubroForm(prev => ({ ...prev, color: e.target.value }))}
                  className="w-full h-9 p-1 border border-slate-300 rounded-lg cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRubroModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-bold rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg text-xs"
                >
                  Guardar Rubro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
