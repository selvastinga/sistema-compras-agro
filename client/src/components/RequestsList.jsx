import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  Printer, 
  Edit3, 
  Trash2, 
  ShoppingBag, 
  CheckCircle2, 
  Clock, 
  Tag, 
  Layers, 
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  Building,
  User,
  ExternalLink
} from 'lucide-react';
import { api } from '../api';

export default function RequestsList({ 
  requests, 
  areas, 
  rubros, 
  selectedYear, 
  onRefresh, 
  onEditRequest, 
  onPrintOfficial, 
  onOpenPurchaseModal,
  currentUser,
  onOpenAuthModal
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState('');
  const [selectedRubroFilter, setSelectedRubroFilter] = useState('');
  const [selectedModalityFilter, setSelectedModalityFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [expandedRequestId, setExpandedRequestId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter requests
  const filteredRequests = requests.filter(req => {
    if (selectedAreaFilter && req.area_id !== parseInt(selectedAreaFilter, 10)) return false;
    if (selectedRubroFilter && req.rubro_id !== parseInt(selectedRubroFilter, 10)) return false;
    if (selectedModalityFilter && req.modality !== selectedModalityFilter) return false;
    if (selectedStatusFilter && req.estado !== selectedStatusFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const codeMatch = req.code?.toLowerCase().includes(term);
      const nameMatch = req.solicitante_nombre?.toLowerCase().includes(term);
      const justMatch = req.justificacion?.toLowerCase().includes(term);
      const areaMatch = req.area_name?.toLowerCase().includes(term);
      const rubroMatch = req.rubro_name?.toLowerCase().includes(term);
      return codeMatch || nameMatch || justMatch || areaMatch || rubroMatch;
    }
    return true;
  });

  const handleDelete = async (id, code) => {
    if (!currentUser) {
      onOpenAuthModal();
      return;
    }
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la solicitud ${code}? Esta acción no se puede deshacer.`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await api.deleteRequest(id);
      onRefresh();
    } catch (err) {
      alert('Error al eliminar la solicitud: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleExpand = async (id) => {
    if (expandedRequestId === id) {
      setExpandedRequestId(null);
    } else {
      setExpandedRequestId(id);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Comprado':
        return <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full"><CheckCircle2 className="w-3.5 h-3.5" /> Comprado</span>;
      case 'Parcialmente Comprado':
        return <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full"><ShoppingBag className="w-3.5 h-3.5" /> Parcial</span>;
      case 'Cancelado':
        return <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full"><AlertCircle className="w-3.5 h-3.5" /> Cancelado</span>;
      default:
        return <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full"><Clock className="w-3.5 h-3.5" /> Pendiente</span>;
    }
  };

  return (
    <div className="space-y-5 pb-16 animate-in fade-in duration-200">
      
      {/* Top Filter Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Listado de Pedidos y Solicitudes ({selectedYear})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Explora, filtra, imprime la ficha oficial o registra las compras efectivas de cada pedido.
            </p>
          </div>
          <div className="text-xs font-semibold text-slate-600">
            Mostrando <strong className="text-emerald-800 font-bold">{filteredRequests.length}</strong> de {requests.length} solicitudes
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código, detalle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 outline-none"
            />
          </div>

          {/* Area Filter */}
          <div>
            <select
              value={selectedAreaFilter}
              onChange={(e) => setSelectedAreaFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 outline-none"
            >
              <option value="">Todas las Áreas</option>
              {areas.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* Rubro Filter */}
          <div>
            <select
              value={selectedRubroFilter}
              onChange={(e) => setSelectedRubroFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 outline-none"
            >
              <option value="">Todos los Rubros</option>
              {rubros.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          {/* Modality Filter */}
          <div>
            <select
              value={selectedModalityFilter}
              onChange={(e) => setSelectedModalityFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 outline-none"
            >
              <option value="">Todas las Modalidades</option>
              <option value="Compra directa">Compra directa</option>
              <option value="Licitación">Licitación</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 outline-none"
            >
              <option value="">Todos los Estados</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Parcialmente Comprado">Parcialmente Comprado</option>
              <option value="Comprado">Comprado</option>
            </select>
          </div>

        </div>
      </div>

      {/* Requests Table / Cards */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80">
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No se encontraron pedidos</h3>
          <p className="text-xs text-slate-500 mt-1">
            Intenta cambiar los filtros seleccionados o carga una nueva solicitud.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => {
            const isExpanded = expandedRequestId === req.id;
            return (
              <div 
                key={req.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all overflow-hidden"
              >
                {/* Main Card Header */}
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Left info */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-black text-xs text-emerald-900 bg-emerald-100/80 px-2.5 py-0.5 rounded-md">
                        {req.code}
                      </span>
                      {getStatusBadge(req.estado)}
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {req.modality}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1 ml-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {req.fecha_solicitud}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-700 font-medium">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <span 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: req.area_color || '#10B981' }} 
                        />
                        {req.area_name}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Tag className="w-3.5 h-3.5 text-slate-400" />
                        {req.rubro_name}
                      </div>
                      {req.solicitante_nombre && (
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {req.solicitante_nombre}
                        </div>
                      )}
                    </div>

                    {req.justificacion && (
                      <p className="text-xs text-slate-500 italic">
                        "{req.justificacion}"
                      </p>
                    )}
                  </div>

                  {/* Right numbers & actions */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center justify-between lg:justify-end gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    
                    {/* Amounts */}
                    <div className="text-left lg:text-right pr-2">
                      <div className="text-[11px] text-slate-400 uppercase font-bold">Total Estimado</div>
                      <div className="text-sm font-bold text-slate-800">
                        {formatCurrency(req.total_estimado)}
                      </div>
                      {req.total_comprado > 0 && (
                        <div className="text-xs font-black text-emerald-700">
                          Gastado: {formatCurrency(req.total_comprado)}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5">
                      {/* Register Purchase Button */}
                      <button
                        onClick={() => currentUser ? onOpenPurchaseModal(req.id) : onOpenAuthModal()}
                        title="Registrar Compra / Cargar Gasto"
                        className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-xs transition-colors"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Cargar Compra</span>
                      </button>

                      {/* Print Official Ficha (Always available for everyone) */}
                      <button
                        onClick={() => onPrintOfficial(req.id)}
                        title="Ver / Imprimir Ficha Oficial FICA"
                        className="p-2 text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg border border-slate-200 transition-colors"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => currentUser ? onEditRequest(req.id) : onOpenAuthModal()}
                        title="Editar pedido"
                        className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(req.id, req.code)}
                        title="Eliminar pedido"
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {/* Toggle Details */}
                      <button
                        onClick={() => toggleExpand(req.id)}
                        title="Ver ítems del pedido"
                        className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                  </div>

                </div>

                {/* Expanded Items Drawer */}
                {isExpanded && (
                  <ExpandedRequestDetails requestId={req.id} onOpenPurchaseModal={onOpenPurchaseModal} />
                )}

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

// Sub-component to load detailed items
function ExpandedRequestDetails({ requestId, onOpenPurchaseModal }) {
  const [details, setDetails] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    api.getRequest(requestId).then(data => {
      setDetails(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [requestId]);

  if (loading) {
    return <div className="p-4 bg-slate-50 text-xs text-slate-500 text-center">Cargando renglones...</div>;
  }

  if (!details) return null;

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  return (
    <div className="p-4 bg-slate-50/80 border-t border-slate-200/80 space-y-4 text-xs">
      
      {/* Renglones Table */}
      <div>
        <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2 flex items-center justify-between">
          <span>Renglones Solicitados ({details.items?.length || 0})</span>
        </h4>

        <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2 px-3 w-10 text-center">Nº</th>
                <th className="py-2 px-3">Descripción</th>
                <th className="py-2 px-3 text-center w-20">Cant. Sol.</th>
                <th className="py-2 px-3 text-right w-28">P. Unit. Estimado</th>
                <th className="py-2 px-3 text-right w-28">Total Estimado</th>
                <th className="py-2 px-3 text-center w-24">Estado</th>
                <th className="py-2 px-3 text-right w-28">P. Real Pagado</th>
                <th className="py-2 px-3 w-36">Comprobante / Prov.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {details.items?.map((item) => (
                <tr key={item.id} className={item.estado_item === 'Comprado' ? 'bg-emerald-50/40' : ''}>
                  <td className="py-2 px-3 text-center font-bold text-slate-500">{item.renglon_numero}</td>
                  <td className="py-2 px-3 font-medium text-slate-800">{item.descripcion}</td>
                  <td className="py-2 px-3 text-center font-bold">{item.cantidad_solicitada} {item.unidad_medida}</td>
                  <td className="py-2 px-3 text-right text-slate-600">{formatCurrency(item.precio_estimado_unitario)}</td>
                  <td className="py-2 px-3 text-right font-bold text-slate-800">{formatCurrency(item.precio_estimado_total)}</td>
                  <td className="py-2 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      item.estado_item === 'Comprado' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {item.estado_item}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-black text-emerald-800">
                    {item.estado_item === 'Comprado' ? formatCurrency(item.precio_real_total) : '-'}
                  </td>
                  <td className="py-2 px-3 text-slate-600 truncate max-w-[140px]" title={`${item.numero_comprobante || ''} - ${item.proveedor_adjudicado || ''}`}>
                    {item.numero_comprobante || item.proveedor_adjudicado ? (
                      <div>
                        <div className="font-semibold text-slate-800">{item.numero_comprobante || 'S/N'}</div>
                        <div className="text-[10px] text-slate-500 truncate">{item.proveedor_adjudicado}</div>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Pendiente de compra</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suggested Vendors & Email reference */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {details.vendors && details.vendors.length > 0 && (
          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <h5 className="font-bold text-slate-700 text-[11px] uppercase mb-1">Proveedores Sugeridos:</h5>
            <ul className="space-y-1 text-slate-600">
              {details.vendors.map((v, i) => (
                <li key={i} className="flex items-center justify-between border-b border-slate-100 pb-1">
                  <strong>{v.nombre}</strong>
                  <span className="text-slate-500">{v.cuit || v.telefono || v.email || ''}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {details.texto_mail_origen && (
          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <h5 className="font-bold text-slate-700 text-[11px] uppercase mb-1">Texto Original del Correo Recibido:</h5>
            <p className="text-slate-600 whitespace-pre-wrap font-mono text-[11px] bg-slate-50 p-2 rounded max-h-24 overflow-y-auto">
              {details.texto_mail_origen}
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
