import React, { useState, useEffect } from 'react';
import { 
  FilePlus2, 
  Plus, 
  Trash2, 
  Mail, 
  Sparkles, 
  Building, 
  FolderTree, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Calculator,
  UserCheck,
  Building2,
  DollarSign
} from 'lucide-react';
import { api } from '../api';

export default function RequestForm({ 
  areas, 
  rubros, 
  selectedYear, 
  onRequestCreated, 
  editingRequest, 
  onCancelEdit,
  currentUser,
  onOpenAuthModal
}) {
  const [formData, setFormData] = useState({
    year: selectedYear,
    area_id: areas.length > 0 ? areas[0].id : '',
    rubro_id: rubros.length > 0 ? rubros[0].id : '',
    modality: 'Compra directa',
    solicitante_nombre: '',
    solicitante_email: currentUser ? currentUser.email : '',
    texto_mail_origen: '',
    justificacion: '',
    fecha_solicitud: new Date().toISOString().split('T')[0],
    observaciones: ''
  });

  const [items, setItems] = useState([
    { renglon_numero: 1, descripcion: '', cantidad_solicitada: 1, unidad_medida: 'Unidad', precio_estimado_unitario: '', precio_estimado_total: 0 }
  ]);

  const [vendors, setVendors] = useState([]);
  const [showMailHelper, setShowMailHelper] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // If editing an existing request, populate form
  useEffect(() => {
    if (editingRequest) {
      setFormData({
        year: editingRequest.year,
        area_id: editingRequest.area_id,
        rubro_id: editingRequest.rubro_id,
        modality: editingRequest.modality || 'Compra directa',
        solicitante_nombre: editingRequest.solicitante_nombre || '',
        solicitante_email: editingRequest.solicitante_email || '',
        texto_mail_origen: editingRequest.texto_mail_origen || '',
        justificacion: editingRequest.justificacion || '',
        fecha_solicitud: editingRequest.fecha_solicitud || new Date().toISOString().split('T')[0],
        observaciones: editingRequest.observaciones || ''
      });
      if (editingRequest.items && editingRequest.items.length > 0) {
        setItems(editingRequest.items.map((it, idx) => ({
          ...it,
          renglon_numero: it.renglon_numero || idx + 1
        })));
      }
      if (editingRequest.vendors) {
        setVendors(editingRequest.vendors);
      }
    } else {
      setFormData(prev => ({
        ...prev,
        year: selectedYear,
        area_id: areas.length > 0 ? (areas.find(a => a.id === prev.area_id)?.id || areas[0].id) : '',
        rubro_id: rubros.length > 0 ? (rubros.find(r => r.id === prev.rubro_id)?.id || rubros[0].id) : ''
      }));
    }
  }, [editingRequest, selectedYear, areas, rubros]);

  // Handle header form change
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Items manipulation
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    if (field === 'cantidad_solicitada' || field === 'precio_estimado_unitario') {
      const qty = parseFloat(newItems[index].cantidad_solicitada) || 0;
      const unit = parseFloat(newItems[index].precio_estimado_unitario) || 0;
      newItems[index].precio_estimado_total = qty * unit;
    }

    setItems(newItems);
  };

  const addItemRow = () => {
    setItems(prev => [
      ...prev,
      {
        renglon_numero: prev.length + 1,
        descripcion: '',
        cantidad_solicitada: 1,
        unidad_medida: 'Unidad',
        precio_estimado_unitario: '',
        precio_estimado_total: 0
      }
    ]);
  };

  const removeItemRow = (index) => {
    if (items.length === 1) return;
    const newItems = items.filter((_, i) => i !== index).map((it, idx) => ({
      ...it,
      renglon_numero: idx + 1
    }));
    setItems(newItems);
  };

  // Vendors manipulation
  const addVendorRow = () => {
    setVendors(prev => [
      ...prev,
      { nombre: '', cuit: '', direccion: '', telefono: '', email: '' }
    ]);
  };

  const removeVendorRow = (index) => {
    setVendors(prev => prev.filter((_, i) => i !== index));
  };

  const handleVendorChange = (index, field, value) => {
    const newVendors = [...vendors];
    newVendors[index][field] = value;
    setVendors(newVendors);
  };

  // Smart Mail Content Extractor Helper
  const parseMailContent = () => {
    const text = formData.texto_mail_origen;
    if (!text || !text.trim()) {
      alert('Por favor pega primero el texto del correo electrónico en el cuadro de texto.');
      return;
    }

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const parsedItems = [];

    // Simple line matcher for lists like: 10 Vasos de precipitado $15000 or - 5 pipetas
    lines.forEach((line) => {
      // Check if line looks like an item (e.g. starts with number or bullet)
      const qtyMatch = line.match(/^[-*•\d\.]*\s*(\d+)\s*(?:unidades|unid|u\.|x)?\s+(.+)/i);
      if (qtyMatch) {
        const qty = parseInt(qtyMatch[1], 10);
        const desc = qtyMatch[2].replace(/\$[\d\.,]+/g, '').trim();
        parsedItems.push({
          renglon_numero: parsedItems.length + 1,
          descripcion: desc || line,
          cantidad_solicitada: qty || 1,
          unidad_medida: 'Unidad',
          precio_estimado_unitario: '',
          precio_estimado_total: 0
        });
      }
    });

    if (parsedItems.length > 0) {
      setItems(parsedItems);
      setStatusMessage({ type: 'success', text: `Se extrajeron automáticamente ${parsedItems.length} renglones del texto del correo.` });
    } else {
      setStatusMessage({ type: 'info', text: 'El texto del correo quedó registrado como referencia. Puedes cargar los renglones en la tabla de abajo.' });
    }
  };

  // Calculations
  const grandTotalEstimado = items.reduce((sum, item) => sum + (parseFloat(item.precio_estimado_total) || 0), 0);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);

    // Validate at least one item has description
    const validItems = items.filter(it => it.descripcion && it.descripcion.trim());
    if (validItems.length === 0) {
      setStatusMessage({ type: 'error', text: 'Debes ingresar al menos un renglón con descripción.' });
      setIsSubmitting(false);
      return;
    }

    if (!currentUser) {
      onOpenAuthModal();
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        year: parseInt(formData.year, 10),
        area_id: parseInt(formData.area_id, 10),
        rubro_id: parseInt(formData.rubro_id, 10),
        items: validItems,
        vendors: vendors.filter(v => v.nombre && v.nombre.trim())
      };

      if (editingRequest) {
        await api.updateRequest(editingRequest.id, payload);
        setStatusMessage({ type: 'success', text: '¡Pedido actualizado exitosamente!' });
      } else {
        await api.createRequest(payload);
        setStatusMessage({ type: 'success', text: '¡Pedido registrado exitosamente!' });
        
        // Reset form
        setFormData({
          year: selectedYear,
          area_id: areas[0]?.id || '',
          rubro_id: rubros[0]?.id || '',
          modality: 'Compra directa',
          solicitante_nombre: '',
          solicitante_email: currentUser ? currentUser.email : '',
          texto_mail_origen: '',
          justificacion: '',
          fecha_solicitud: new Date().toISOString().split('T')[0],
          observaciones: ''
        });
        setItems([
          { renglon_numero: 1, descripcion: '', cantidad_solicitada: 1, unidad_medida: 'Unidad', precio_estimado_unitario: '', precio_estimado_total: 0 }
        ]);
        setVendors([]);
      }

      if (onRequestCreated) {
        onRequestCreated();
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: 'Error al guardar el pedido: ' + err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100">
            <FilePlus2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
              Ficha de Solicitud FICA
            </span>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 mt-1">
              {editingRequest ? `Editar Pedido ${editingRequest.code}` : 'Carga de Solicitud de Bienes y Servicios'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Formulario oficial adaptado para carga manual y transcripción directa de pedidos recibidos por correo electrónico.
            </p>
          </div>
        </div>

        {editingRequest && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold transition-colors"
          >
            Cancelar Edición
          </button>
        )}
      </div>

      {!currentUser && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
            <span>Estás en <strong>Modo Consulta Pública (Solo Lectura)</strong>. Para enviar o guardar solicitudes de compra debes iniciar sesión con una cuenta de Gmail autorizada.</span>
          </div>
          <button
            type="button"
            onClick={onOpenAuthModal}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-xs shrink-0 self-start sm:self-auto"
          >
            Iniciar Sesión con Gmail
          </button>
        </div>
      )}

      {statusMessage && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
          statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' :
          statusMessage.type === 'error' ? 'bg-rose-50 text-rose-900 border border-rose-200' :
          'bg-blue-50 text-blue-900 border border-blue-200'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section 1: Datos Generales */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building className="w-4 h-4 text-emerald-700" />
            1. Datos Generales de la Solicitud
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Ejercicio */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ejercicio Fiscal *
              </label>
              <input
                type="number"
                name="year"
                value={formData.year}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 text-sm font-bold text-slate-800"
                required
              />
            </div>

            {/* Area Solicitante */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Área Solicitante *
              </label>
              <select
                name="area_id"
                value={formData.area_id}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 text-sm font-medium text-slate-800"
                required
              >
                {areas.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Rubro */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Rubro de Compra *
              </label>
              <select
                name="rubro_id"
                value={formData.rubro_id}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 text-sm font-medium text-slate-800"
                required
              >
                {rubros.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Modalidad de Compra */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Modalidad de Compra *
              </label>
              <select
                name="modality"
                value={formData.modality}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 text-sm font-bold text-emerald-900 bg-emerald-50/50"
                required
              >
                <option value="Compra directa">Compra directa</option>
                <option value="Licitación">Licitación</option>
              </select>
            </div>

            {/* Solicitante Nombre */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nombre del Solicitante / Docente
              </label>
              <input
                type="text"
                name="solicitante_nombre"
                value={formData.solicitante_nombre}
                onChange={handleFormChange}
                placeholder="Ej. Ing. Juan Pérez"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 text-sm"
              />
            </div>

            {/* Solicitante Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                E-mail del Solicitante
              </label>
              <input
                type="email"
                name="solicitante_email"
                value={formData.solicitante_email}
                onChange={handleFormChange}
                placeholder="docente@fica.unsl.edu.ar"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 text-sm"
              />
            </div>

            {/* Fecha Solicitud */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Fecha de Solicitud *
              </label>
              <input
                type="date"
                name="fecha_solicitud"
                value={formData.fecha_solicitud}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 text-sm"
                required
              />
            </div>

            {/* Justificación */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Destino / Justificación
              </label>
              <input
                type="text"
                name="justificacion"
                value={formData.justificacion}
                onChange={handleFormChange}
                placeholder="Ej. Clases prácticas de botánica"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 text-sm"
              />
            </div>

          </div>

          {/* Mail transcription helper toggle */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowMailHelper(!showMailHelper)}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              {showMailHelper ? 'Ocultar Asistente de Correo' : '¿El pedido llegó escrito en un mail? Pegar texto aquí'}
            </button>

            {showMailHelper && (
              <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    Copia y Pega aquí el texto completo del correo recibido:
                  </label>
                  <button
                    type="button"
                    onClick={parseMailContent}
                    className="text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 px-3 py-1 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Auto-extraer renglones
                  </button>
                </div>

                <textarea
                  name="texto_mail_origen"
                  rows={4}
                  value={formData.texto_mail_origen}
                  onChange={handleFormChange}
                  placeholder="Estimados, solicitamos para el área la compra de los siguientes insumos..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none"
                />
                <p className="text-[11px] text-slate-500">
                  El texto del correo quedará guardado para respaldo y auditoría institucional.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Tabla de Renglones / Ítems */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-700" />
                2. Detalle de Bienes o Servicios Solicitados (Renglones)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ingresa cada uno de los ítems con sus cantidades y precios estimados de referencia.
              </p>
            </div>

            <button
              type="button"
              onClick={addItemRow}
              className="self-start sm:self-center flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Agregar Renglón
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">Nº</th>
                  <th className="py-2.5 px-3">Descripción y Especificaciones *</th>
                  <th className="py-2.5 px-3 w-24">Cantidad</th>
                  <th className="py-2.5 px-3 w-28">Unidad</th>
                  <th className="py-2.5 px-3 w-36">Precio Unit. Estimado</th>
                  <th className="py-2.5 px-3 w-36 text-right">Precio Total Estimado</th>
                  <th className="py-2.5 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2 px-3 text-center font-bold text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={item.descripcion}
                        onChange={(e) => handleItemChange(idx, 'descripcion', e.target.value)}
                        placeholder="Ej. Balanza analítica digital precisión 0.1mg"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 text-xs text-slate-800 font-medium"
                        required
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        value={item.cantidad_solicitada}
                        onChange={(e) => handleItemChange(idx, 'cantidad_solicitada', e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-600 text-center text-xs font-bold"
                        required
                      />
                    </td>
                    <td className="py-2 px-3">
                      <select
                        value={item.unidad_medida}
                        onChange={(e) => handleItemChange(idx, 'unidad_medida', e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-600 text-xs"
                      >
                        <option value="Unidad">Unidad</option>
                        <option value="Litro">Litro</option>
                        <option value="Kg">Kg</option>
                        <option value="Gramos">Gramos</option>
                        <option value="Caja">Caja</option>
                        <option value="Pack">Pack</option>
                        <option value="Frasco">Frasco</option>
                        <option value="Metro">Metro</option>
                        <option value="Servicio">Servicio</option>
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-slate-400 font-bold text-xs">$</span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={item.precio_estimado_unitario}
                          onChange={(e) => handleItemChange(idx, 'precio_estimado_unitario', e.target.value)}
                          placeholder="0"
                          className="w-full pl-6 pr-2 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-600 text-right text-xs font-semibold"
                        />
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">
                      {formatCurrency(item.precio_estimado_total)}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        disabled={items.length === 1}
                        title="Eliminar renglón"
                        className="text-slate-400 hover:text-rose-600 disabled:opacity-30 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50/90 font-bold border-t-2 border-slate-200">
                <tr>
                  <td colSpan={5} className="py-3 px-4 text-right text-slate-700 uppercase tracking-wider text-xs">
                    Total Estimado de la Solicitud:
                  </td>
                  <td className="py-3 px-3 text-right text-base text-emerald-800 font-black">
                    {formatCurrency(grandTotalEstimado)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Section 3: Proveedores Sugeridos (Opcional según doc FICA) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-700" />
                3. Datos de Proveedores Sugeridos (Opcional)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                En caso de que lo considere necesario, indique proveedores para contactar en el procedimiento de compra.
              </p>
            </div>

            <button
              type="button"
              onClick={addVendorRow}
              className="self-start sm:self-center flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar Proveedor
            </button>
          </div>

          {vendors.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">
              No se han agregado proveedores sugeridos. Haz clic en "Agregar Proveedor" si deseas indicar referencias de contacto.
            </p>
          ) : (
            <div className="space-y-3">
              {vendors.map((vendor, vIdx) => (
                <div key={vIdx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-5 gap-2 relative">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Nombre / Razón Social</label>
                    <input
                      type="text"
                      value={vendor.nombre}
                      onChange={(e) => handleVendorChange(vIdx, 'nombre', e.target.value)}
                      placeholder="Empresa S.A."
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">CUIT</label>
                    <input
                      type="text"
                      value={vendor.cuit}
                      onChange={(e) => handleVendorChange(vIdx, 'cuit', e.target.value)}
                      placeholder="30-12345678-9"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Dirección</label>
                    <input
                      type="text"
                      value={vendor.direccion}
                      onChange={(e) => handleVendorChange(vIdx, 'direccion', e.target.value)}
                      placeholder="Calle y número"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Teléfono</label>
                    <input
                      type="text"
                      value={vendor.telefono}
                      onChange={(e) => handleVendorChange(vIdx, 'telefono', e.target.value)}
                      placeholder="2664-000000"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">E-mail</label>
                      <input
                        type="email"
                        value={vendor.email}
                        onChange={(e) => handleVendorChange(vIdx, 'email', e.target.value)}
                        placeholder="contacto@proveedor.com"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeVendorRow(vIdx)}
                      className="mt-4 p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Eliminar proveedor"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          {editingRequest && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-6 py-3 border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors text-sm"
            >
              Cancelar
            </button>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-sm flex items-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-300" />
            {isSubmitting ? 'Guardando solicitud...' : (editingRequest ? 'Guardar Cambios' : 'Registrar Solicitud')}
          </button>
        </div>

      </form>
    </div>
  );
}
