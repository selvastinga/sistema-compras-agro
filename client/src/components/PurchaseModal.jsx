import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  CheckCircle2, 
  DollarSign, 
  Calendar, 
  FileText, 
  Building2, 
  X, 
  AlertCircle,
  PackageCheck
} from 'lucide-react';
import { api } from '../api';

export default function PurchaseModal({ 
  requestId, 
  onClose, 
  onPurchaseSuccess 
}) {
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('single'); // 'single' item or 'all' items
  const [selectedItemId, setSelectedItemId] = useState(null);
  
  // Single item purchase state
  const [itemData, setItemData] = useState({
    cantidad_comprada: 1,
    precio_real_unitario: '',
    precio_real_total: 0,
    fecha_compra: new Date().toISOString().split('T')[0],
    numero_comprobante: '',
    proveedor_adjudicado: '',
    observaciones_compra: ''
  });

  // Bulk purchase state
  const [bulkData, setBulkData] = useState({
    fecha_compra: new Date().toISOString().split('T')[0],
    numero_comprobante: '',
    proveedor_adjudicado: ''
  });
  const [bulkItems, setBulkItems] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!requestId) return;
    setLoading(true);
    api.getRequest(requestId).then(data => {
      setRequest(data);
      if (data.items && data.items.length > 0) {
        // Find first pending item
        const firstPending = data.items.find(i => i.estado_item !== 'Comprado') || data.items[0];
        setSelectedItemId(firstPending.id);
        
        setItemData({
          cantidad_comprada: firstPending.cantidad_comprada || firstPending.cantidad_solicitada,
          precio_real_unitario: firstPending.precio_real_unitario || firstPending.precio_estimado_unitario || '',
          precio_real_total: firstPending.precio_real_total || (firstPending.cantidad_solicitada * (firstPending.precio_estimado_unitario || 0)),
          fecha_compra: firstPending.fecha_compra || new Date().toISOString().split('T')[0],
          numero_comprobante: firstPending.numero_comprobante || '',
          proveedor_adjudicado: firstPending.proveedor_adjudicado || (data.vendors?.[0]?.nombre || ''),
          observaciones_compra: firstPending.observaciones_compra || ''
        });

        // Setup bulk items
        setBulkItems(data.items.map(it => ({
          id: it.id,
          descripcion: it.descripcion,
          cantidad_solicitada: it.cantidad_solicitada,
          cantidad_comprada: it.cantidad_comprada || it.cantidad_solicitada,
          precio_estimado_unitario: it.precio_estimado_unitario,
          precio_real_unitario: it.precio_real_unitario || it.precio_estimado_unitario || '',
          precio_real_total: it.precio_real_total || (it.cantidad_solicitada * (it.precio_estimado_unitario || 0))
        })));
      }
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setError('Error al cargar datos del pedido');
      setLoading(false);
    });
  }, [requestId]);

  const handleItemSelect = (itemId) => {
    setSelectedItemId(itemId);
    const it = request.items.find(i => i.id === itemId);
    if (it) {
      setItemData({
        cantidad_comprada: it.cantidad_comprada || it.cantidad_solicitada,
        precio_real_unitario: it.precio_real_unitario || it.precio_estimado_unitario || '',
        precio_real_total: it.precio_real_total || (it.cantidad_solicitada * (it.precio_estimado_unitario || 0)),
        fecha_compra: it.fecha_compra || new Date().toISOString().split('T')[0],
        numero_comprobante: it.numero_comprobante || '',
        proveedor_adjudicado: it.proveedor_adjudicado || (request.vendors?.[0]?.nombre || ''),
        observaciones_compra: it.observaciones_compra || ''
      });
    }
  };

  const handleSingleItemChange = (field, value) => {
    setItemData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'cantidad_comprada' || field === 'precio_real_unitario') {
        const qty = parseFloat(field === 'cantidad_comprada' ? value : updated.cantidad_comprada) || 0;
        const price = parseFloat(field === 'precio_real_unitario' ? value : updated.precio_real_unitario) || 0;
        updated.precio_real_total = qty * price;
      }
      return updated;
    });
  };

  const handleBulkItemChange = (index, field, value) => {
    const updated = [...bulkItems];
    updated[index][field] = value;
    if (field === 'cantidad_comprada' || field === 'precio_real_unitario') {
      const qty = parseFloat(updated[index].cantidad_comprada) || 0;
      const price = parseFloat(updated[index].precio_real_unitario) || 0;
      updated[index].precio_real_total = qty * price;
    }
    setBulkItems(updated);
  };

  const handleSubmitSingle = async (e) => {
    e.preventDefault();
    if (!selectedItemId) return;
    setIsSubmitting(true);
    try {
      await api.purchaseItem(requestId, selectedItemId, {
        cantidad_comprada: parseFloat(itemData.cantidad_comprada) || 1,
        precio_real_unitario: parseFloat(itemData.precio_real_unitario) || 0,
        precio_real_total: parseFloat(itemData.precio_real_total) || 0,
        fecha_compra: itemData.fecha_compra,
        numero_comprobante: itemData.numero_comprobante,
        proveedor_adjudicado: itemData.proveedor_adjudicado,
        observaciones_compra: itemData.observaciones_compra,
        estado_item: 'Comprado'
      });
      onPurchaseSuccess();
      onClose();
    } catch (err) {
      alert('Error guardando la compra: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitBulk = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.purchaseAllItems(requestId, {
        fecha_compra: bulkData.fecha_compra,
        numero_comprobante: bulkData.numero_comprobante,
        proveedor_adjudicado: bulkData.proveedor_adjudicado,
        items_data: bulkItems
      });
      onPurchaseSuccess();
      onClose();
    } catch (err) {
      alert('Error guardando la compra completa: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  if (!requestId) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-200 my-8">
        
        {/* Top Modal Header */}
        <div className="bg-emerald-900 px-6 py-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-800 rounded-lg">
              <ShoppingBag className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">
                Registrar Compra Efectiva / Cargar Gasto
              </h3>
              <p className="text-xs text-emerald-200">
                {request ? `${request.code} - ${request.area_name} (${request.rubro_name})` : 'Cargando...'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-emerald-300 hover:text-white text-2xl font-bold leading-none p-1"
          >
            &times;
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700 mx-auto mb-2"></div>
            Cargando información del pedido...
          </div>
        ) : error ? (
          <div className="p-6 text-rose-700 bg-rose-50 text-center font-bold">{error}</div>
        ) : (
          <div className="p-6 space-y-5">
            
            {/* Mode Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setMode('single')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  mode === 'single' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cargar por Renglón Individual
              </button>
              <button
                type="button"
                onClick={() => setMode('all')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  mode === 'all' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cargar Todo el Pedido Junto
              </button>
            </div>

            {/* Mode 1: Single Item Form */}
            {mode === 'single' ? (
              <form onSubmit={handleSubmitSingle} className="space-y-4">
                
                {/* Item Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Seleccionar Renglón a Registrar *
                  </label>
                  <select
                    value={selectedItemId || ''}
                    onChange={(e) => handleItemSelect(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-slate-50 focus:ring-2 focus:ring-emerald-600 outline-none"
                  >
                    {request.items.map(it => (
                      <option key={it.id} value={it.id}>
                        Renglón {it.renglon_numero}: {it.descripcion} (Sol: {it.cantidad_solicitada} {it.unidad_medida} | Est: {formatCurrency(it.precio_estimado_total)}) {it.estado_item === 'Comprado' ? '✓ YA COMPRADO' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                  {/* Cantidad Comprada */}
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-950 uppercase mb-1">
                      Cantidad Comprada *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      value={itemData.cantidad_comprada}
                      onChange={(e) => handleSingleItemChange('cantidad_comprada', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-center"
                      required
                    />
                  </div>

                  {/* Precio Unitario Real */}
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-950 uppercase mb-1">
                      Precio Unitario Real ($) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={itemData.precio_real_unitario}
                      onChange={(e) => handleSingleItemChange('precio_real_unitario', e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-right"
                      required
                    />
                  </div>

                  {/* Total Real Pagado */}
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-950 uppercase mb-1">
                      Total Real Pagado ($)
                    </label>
                    <div className="px-3 py-2 bg-white border border-emerald-300 rounded-lg text-sm font-black text-right text-emerald-900">
                      {formatCurrency(itemData.precio_real_total)}
                    </div>
                  </div>
                </div>

                {/* Comprobante, Proveedor y Fecha */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Fecha de Compra *
                    </label>
                    <input
                      type="date"
                      value={itemData.fecha_compra}
                      onChange={(e) => handleSingleItemChange('fecha_compra', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nº Factura / Orden / Expte
                    </label>
                    <input
                      type="text"
                      value={itemData.numero_comprobante}
                      onChange={(e) => handleSingleItemChange('numero_comprobante', e.target.value)}
                      placeholder="Ej. FAC-A-0001-1234"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Proveedor Adjudicado
                    </label>
                    <input
                      type="text"
                      value={itemData.proveedor_adjudicado}
                      onChange={(e) => handleSingleItemChange('proveedor_adjudicado', e.target.value)}
                      placeholder="Ej. Droguería Central"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Observaciones de la Compra (Opcional)
                  </label>
                  <input
                    type="text"
                    value={itemData.observaciones_compra}
                    onChange={(e) => handleSingleItemChange('observaciones_compra', e.target.value)}
                    placeholder="Detalles sobre entrega, garantía, etc."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-700" />
                  <span>
                    Al registrar la compra, este monto se descontará automáticamente del presupuesto del área (<strong>{request.area_name}</strong>) y del saldo disponible del departamento.
                  </span>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 transition-colors"
                  >
                    Cerrar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-md text-xs flex items-center gap-2 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    {isSubmitting ? 'Guardando...' : 'Confirmar Compra del Renglón'}
                  </button>
                </div>

              </form>
            ) : (
              /* Mode 2: Bulk Purchase All Items */
              <form onSubmit={handleSubmitBulk} className="space-y-4">
                
                {/* Header info for all items */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Fecha de Compra General *
                    </label>
                    <input
                      type="date"
                      value={bulkData.fecha_compra}
                      onChange={(e) => setBulkData(prev => ({ ...prev, fecha_compra: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nº Factura / Orden / Expte
                    </label>
                    <input
                      type="text"
                      value={bulkData.numero_comprobante}
                      onChange={(e) => setBulkData(prev => ({ ...prev, numero_comprobante: e.target.value }))}
                      placeholder="Ej. OC-2026-089"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Proveedor Adjudicado
                    </label>
                    <input
                      type="text"
                      value={bulkData.proveedor_adjudicado}
                      onChange={(e) => setBulkData(prev => ({ ...prev, proveedor_adjudicado: e.target.value }))}
                      placeholder="Ej. Distribuidora Cuyo"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* Items pricing table */}
                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Renglón / Detalle</th>
                        <th className="py-2 px-2 w-20 text-center">Cant. Real</th>
                        <th className="py-2 px-2 w-28 text-right">P. Unit Real</th>
                        <th className="py-2 px-3 w-28 text-right">Total Real</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bulkItems.map((bItem, idx) => (
                        <tr key={bItem.id}>
                          <td className="py-2 px-3 font-medium text-slate-800">
                            {idx + 1}. {bItem.descripcion}
                          </td>
                          <td className="py-1 px-2">
                            <input
                              type="number"
                              step="any"
                              value={bItem.cantidad_comprada}
                              onChange={(e) => handleBulkItemChange(idx, 'cantidad_comprada', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-300 rounded text-center text-xs"
                            />
                          </td>
                          <td className="py-1 px-2">
                            <input
                              type="number"
                              step="any"
                              value={bItem.precio_real_unitario}
                              onChange={(e) => handleBulkItemChange(idx, 'precio_real_unitario', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-300 rounded text-right text-xs"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-800">
                            {formatCurrency(bItem.precio_real_total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <span className="text-xs font-bold uppercase text-emerald-950">
                    Total Global a Descontar:
                  </span>
                  <span className="text-base font-black text-emerald-900">
                    {formatCurrency(bulkItems.reduce((s, it) => s + (parseFloat(it.precio_real_total) || 0), 0))}
                  </span>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 transition-colors"
                  >
                    Cerrar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-md text-xs flex items-center gap-2 transition-all"
                  >
                    <PackageCheck className="w-4 h-4 text-emerald-300" />
                    {isSubmitting ? 'Guardando...' : 'Marcar Todo como Comprado'}
                  </button>
                </div>

              </form>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
