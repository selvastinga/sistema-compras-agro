import React, { useState } from 'react';
import {
  Briefcase,
  User,
  MapPin,
  Calendar,
  DollarSign,
  Building2,
  PlusCircle,
  Edit2,
  Trash2,
  Search,
  Filter,
  Check,
  X,
  Lock,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { api } from '../api';

export default function ViaticosView({
  viaticos = [],
  areas = [],
  selectedYear,
  onRefresh,
  currentUser,
  onOpenAuthModal
}) {
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    docente: '',
    area_id: areas.find(a => a.is_active)?.id || '',
    destino: '',
    dias: '1',
    monto: '',
    fecha: new Date().toISOString().split('T')[0],
    observaciones: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [filterArea, setFilterArea] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const activeAreas = areas.filter(a => a.is_active);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      docente: '',
      area_id: activeAreas[0]?.id || '',
      destino: '',
      dias: '1',
      monto: '',
      fecha: new Date().toISOString().split('T')[0],
      observaciones: ''
    });
  };

  const handleEdit = (v) => {
    if (!currentUser) {
      onOpenAuthModal();
      return;
    }
    setEditingId(v.id);
    setFormData({
      docente: v.docente || '',
      area_id: v.area_id || '',
      destino: v.destino || '',
      dias: v.dias !== undefined ? String(v.dias) : '1',
      monto: v.monto !== undefined ? String(v.monto) : '',
      fecha: v.fecha ? v.fecha.split('T')[0] : new Date().toISOString().split('T')[0],
      observaciones: v.observaciones || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (v) => {
    if (!currentUser) {
      onOpenAuthModal();
      return;
    }
    if (!window.confirm(`¿Eliminar el viático de ${v.docente} a ${v.destino} por ${formatCurrency(v.monto)}?`)) {
      return;
    }
    try {
      await api.deleteViatico(v.id);
      await onRefresh();
    } catch (err) {
      alert('Error al eliminar viático: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuthModal();
      return;
    }
    if (!formData.docente.trim() || !formData.area_id || !formData.destino.trim() || !formData.monto) {
      alert('Por favor completá docente, área, destino y monto.');
      return;
    }

    setIsSubmitting(true);
    setSuccessMsg(null);
    try {
      const payload = {
        year: selectedYear,
        docente: formData.docente.trim(),
        area_id: parseInt(formData.area_id, 10),
        destino: formData.destino.trim(),
        dias: parseFloat(formData.dias) || 1,
        monto: parseFloat(formData.monto) || 0,
        fecha: formData.fecha,
        observaciones: formData.observaciones.trim()
      };

      if (editingId) {
        await api.updateViatico(editingId, payload);
        setSuccessMsg('¡Viático actualizado correctamente! El monto se actualizó en el presupuesto.');
      } else {
        await api.createViatico(payload);
        setSuccessMsg('¡Viático registrado correctamente! El egreso ya fue descontado del área y del departamento.');
      }
      resetForm();
      await onRefresh();
    } catch (err) {
      alert('Error guardando viático: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredViaticos = viaticos.filter(v => {
    if (filterArea && String(v.area_id) !== String(filterArea)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDocente = (v.docente || '').toLowerCase().includes(q);
      const matchDestino = (v.destino || '').toLowerCase().includes(q);
      const matchObs = (v.observaciones || '').toLowerCase().includes(q);
      if (!matchDocente && !matchDestino && !matchObs) return false;
    }
    return true;
  });

  const totalViaticosMonto = filteredViaticos.reduce((acc, v) => acc + (parseFloat(v.monto) || 0), 0);
  const totalViaticosDias = filteredViaticos.reduce((acc, v) => acc + (parseFloat(v.dias) || 0), 0);

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded">
            Egresos Departamentales • Ejercicio {selectedYear}
          </span>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-emerald-700" />
            Gestión y Pago de Viáticos
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registrá los pagos de viáticos por docente, área, destino y días. Cada viático se descuenta automáticamente del presupuesto del área y del departamento.
          </p>
        </div>

        {/* Summary Badges */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl text-right">
            <div className="text-[11px] font-bold uppercase text-emerald-800">Total Viáticos ({selectedYear})</div>
            <div className="text-lg font-black text-emerald-950">{formatCurrency(totalViaticosMonto)}</div>
          </div>
          <div className="bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-xl text-right">
            <div className="text-[11px] font-bold uppercase text-slate-600">Registros / Días</div>
            <div className="text-lg font-black text-slate-800">{filteredViaticos.length} ({totalViaticosDias} días)</div>
          </div>
        </div>
      </div>

      {/* Form Card (Admin Only or Prompt Login) */}
      {currentUser ? (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-700" />
              {editingId ? 'Editar Viático Registrado' : 'Cargar Nuevo Pago de Viático'}
            </h3>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
                Cancelar edición
              </button>
            )}
          </div>

          {successMsg && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Docente que lo recibe */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Docente que lo recibe *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={formData.docente}
                    onChange={(e) => setFormData({ ...formData, docente: e.target.value })}
                    placeholder="Apellido y Nombre del docente"
                    className="w-full pl-9 pr-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none text-slate-900"
                  />
                </div>
              </div>

              {/* Área del docente */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Área del Docente *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <select
                    required
                    value={formData.area_id}
                    onChange={(e) => setFormData({ ...formData, area_id: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none text-slate-900 bg-white"
                  >
                    <option value="">Seleccionar área...</option>
                    {activeAreas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Destino */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Destino *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={formData.destino}
                    onChange={(e) => setFormData({ ...formData, destino: e.target.value })}
                    placeholder="Ciudad, localidad o institución de destino"
                    className="w-full pl-9 pr-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none text-slate-900"
                  />
                </div>
              </div>

              {/* Cantidad de Días */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Días *
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    required
                    value={formData.dias}
                    onChange={(e) => setFormData({ ...formData, dias: e.target.value })}
                    placeholder="Ej. 2"
                    className="w-full pl-9 pr-3 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none text-slate-900"
                  />
                </div>
              </div>

              {/* Monto ($) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Monto del Viático ($) *
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-emerald-700 absolute left-3 top-2.5" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.monto}
                    onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-9 pr-3 py-2 text-xs font-black border border-emerald-400 bg-emerald-50/30 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none text-slate-900"
                  />
                </div>
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Fecha
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none text-slate-900"
                  />
                </div>
              </div>

            </div>

            {/* Observaciones */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-4 pt-2">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Observaciones / Motivo o Nº Expediente (Opcional)
                </label>
                <input
                  type="text"
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  placeholder="Ej. Viaje de práctica con alumnos / Congreso / Comisión de servicio"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none text-slate-800"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-md text-xs flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                {isSubmitting ? 'Guardando...' : editingId ? 'Guardar Cambios del Viático' : 'Registrar Pago de Viático'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-medium">
            <Lock className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              Estás en <strong>Modo Consulta Pública</strong>. Para cargar o editar pagos de viáticos, iniciá sesión como Administrador.
            </span>
          </div>
          <button
            onClick={onOpenAuthModal}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-xs shrink-0"
          >
            Iniciar Sesión
          </button>
        </div>
      )}

      {/* List & Filters */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">
            Listado de Viáticos Otorgados ({filteredViaticos.length})
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar docente o destino..."
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none"
              />
            </div>

            {/* Area Filter */}
            <div className="relative">
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <select
                value={filterArea}
                onChange={(e) => setFilterArea(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none bg-white"
              >
                <option value="">Todas las áreas</option>
                {areas.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {filteredViaticos.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            No hay viáticos registrados para este período o filtro.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Fecha</th>
                  <th className="py-3 px-3">Docente</th>
                  <th className="py-3 px-3">Área del Docente</th>
                  <th className="py-3 px-3">Destino</th>
                  <th className="py-3 px-3 text-center">Días</th>
                  <th className="py-3 px-3 text-right">Monto ($)</th>
                  {currentUser && <th className="py-3 px-3 text-center w-24">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredViaticos.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-medium text-slate-600 whitespace-nowrap">
                      {v.fecha ? v.fecha.split('T')[0] : '-'}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{v.docente}</div>
                      {v.observaciones && (
                        <div className="text-[11px] text-slate-500 mt-0.5">{v.observaciones}</div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-full">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: v.area_color || '#10B981' }}
                        />
                        {v.area_name}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>{v.destino}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-700">
                      {v.dias} {Number(v.dias) === 1 ? 'día' : 'días'}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-emerald-800 text-sm whitespace-nowrap">
                      {formatCurrency(v.monto)}
                    </td>
                    {currentUser && (
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(v)}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar viático"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(v)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Eliminar viático"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-black border-t-2 border-slate-200">
                <tr>
                  <td colSpan={4} className="py-3 px-3 text-right uppercase text-slate-600">
                    Totales:
                  </td>
                  <td className="py-3 px-3 text-center text-slate-800">
                    {totalViaticosDias} días
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-900 text-sm">
                    {formatCurrency(totalViaticosMonto)}
                  </td>
                  {currentUser && <td></td>}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
