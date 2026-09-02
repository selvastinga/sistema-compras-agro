import React, { useState } from 'react';
import { 
  ShoppingBag, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  DollarSign, 
  FileText, 
  Building, 
  Tag, 
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { api } from '../api';

export default function PurchasesView({ 
  requests, 
  areas, 
  rubros, 
  selectedYear, 
  onRefresh, 
  onOpenPurchaseModal,
  currentUser,
  onOpenAuthModal
}) {
  const [filterState, setFilterState] = useState('all'); // 'all', 'pending', 'purchased'
  const [areaFilter, setAreaFilter] = useState('');
  const [rubroFilter, setRubroFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Extract all items from all requests
  const allItems = [];
  requests.forEach(req => {
    // If request has items loaded
    if (req.items) {
      req.items.forEach(it => {
        allItems.push({
          ...it,
          request_code: req.code,
          request_id: req.id,
          request_area_id: req.area_id,
          request_area_name: req.area_name,
          request_area_color: req.area_color,
          request_rubro_id: req.rubro_id,
          request_rubro_name: req.rubro_name,
          request_modality: req.modality,
          request_solicitante: req.solicitante_nombre
        });
      });
    }
  });

  const filteredItems = allItems.filter(item => {
    if (filterState === 'pending' && item.estado_item === 'Comprado') return false;
    if (filterState === 'purchased' && item.estado_item !== 'Comprado') return false;
    if (areaFilter && item.request_area_id !== parseInt(areaFilter, 10)) return false;
    if (rubroFilter && item.request_rubro_id !== parseInt(rubroFilter, 10)) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const descMatch = item.descripcion?.toLowerCase().includes(term);
      const codeMatch = item.request_code?.toLowerCase().includes(term);
      const provMatch = item.proveedor_adjudicado?.toLowerCase().includes(term);
      const compMatch = item.numero_comprobante?.toLowerCase().includes(term);
      return descMatch || codeMatch || provMatch || compMatch;
    }
    return true;
  });

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const totalSpentFiltered = filteredItems
    .filter(i => i.estado_item === 'Comprado')
    .reduce((s, i) => s + (i.precio_real_total || 0), 0);

  const totalPendingFiltered = filteredItems
    .filter(i => i.estado_item !== 'Comprado')
    .reduce((s, i) => s + (i.precio_estimado_total || 0), 0);

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
            Módulo de Compras Efectivas
          </span>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 mt-1">
            Control y Ejecución de Compras ({selectedYear})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Carga de precios reales facturados, cantidades entregadas y comprobantes de compra.
          </p>
        </div>

        {/* Quick totals */}
        <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div>
            <div className="text-[11px] text-slate-500 font-bold uppercase">Ejecutado Real</div>
            <div className="text-base font-black text-emerald-800">{formatCurrency(totalSpentFiltered)}</div>
          </div>
          <div className="border-l border-slate-200 pl-4">
            <div className="text-[11px] text-slate-500 font-bold uppercase">Estimado Pendiente</div>
            <div className="text-base font-black text-amber-600">{formatCurrency(totalPendingFiltered)}</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Status filter tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setFilterState('all')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                filterState === 'all' ? 'bg-white text-emerald-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos los Ítems ({allItems.length})
            </button>
            <button
              onClick={() => setFilterState('pending')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                filterState === 'pending' ? 'bg-white text-emerald-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pendientes de Compra ({allItems.filter(i => i.estado_item !== 'Comprado').length})
            </button>
            <button
              onClick={() => setFilterState('purchased')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                filterState === 'purchased' ? 'bg-white text-emerald-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Comprados / Adjudicados ({allItems.filter(i => i.estado_item === 'Comprado').length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar ítem, factura, prov..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 outline-none"
            />
          </div>

        </div>

        {/* Area & Rubro Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <div>
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 outline-none"
            >
              <option value="">Todas las Áreas</option>
              {areas.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={rubroFilter}
              onChange={(e) => setRubroFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 outline-none"
            >
              <option value="">Todos los Rubros</option>
              {rubros.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Pedido / Solicitante</th>
                <th className="py-3 px-3">Área / Rubro</th>
                <th className="py-3 px-3">Ítem / Descripción</th>
                <th className="py-3 px-3 text-center">Cant. Sol.</th>
                <th className="py-3 px-3 text-right">P. Estimado</th>
                <th className="py-3 px-3 text-center">Estado</th>
                <th className="py-3 px-3 text-right">Total Real Pagado</th>
                <th className="py-3 px-3">Factura / Proveedor</th>
                <th className="py-3 px-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No se encontraron ítems con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={`${item.request_id}-${item.id}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-semibold">
                      <div className="text-emerald-950 font-mono font-bold">{item.request_code}</div>
                      <div className="text-[11px] text-slate-500 font-normal">{item.request_solicitante || 'Sin solicitante'}</div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.request_area_color || '#10B981' }} />
                        <span className="truncate max-w-[130px]">{item.request_area_name}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">{item.request_rubro_name}</div>
                    </td>

                    <td className="py-3 px-3 font-medium text-slate-800 max-w-[200px]">
                      {item.descripcion}
                    </td>

                    <td className="py-3 px-3 text-center font-bold text-slate-700">
                      {item.cantidad_solicitada} {item.unidad_medida}
                    </td>

                    <td className="py-3 px-3 text-right text-slate-600 font-medium">
                      {formatCurrency(item.precio_estimado_total)}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        item.estado_item === 'Comprado' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {item.estado_item}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-black text-emerald-800">
                      {item.estado_item === 'Comprado' ? formatCurrency(item.precio_real_total) : '-'}
                    </td>

                    <td className="py-3 px-3">
                      {item.estado_item === 'Comprado' ? (
                        <div>
                          <div className="font-bold text-slate-800">{item.numero_comprobante || 'S/N'}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[130px]">{item.proveedor_adjudicado || 'Sin proveedor'}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">No comprado aún</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => currentUser ? onOpenPurchaseModal(item.request_id) : onOpenAuthModal()}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 py-1.5 rounded-lg text-[11px] font-bold shadow-xs transition-colors flex items-center gap-1 mx-auto"
                      >
                        <ShoppingBag className="w-3 h-3" />
                        {item.estado_item === 'Comprado' ? 'Modificar' : 'Cargar Compra'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
