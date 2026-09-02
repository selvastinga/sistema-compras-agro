import React, { useState, useEffect } from 'react';
import { Printer, ArrowLeft, Building2, CheckCircle2, Download } from 'lucide-react';
import { api } from '../api';

export default function OfficialFichaPrint({ requestId, onBack }) {
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!requestId) return;
    setLoading(true);
    api.getRequest(requestId).then(data => {
      setRequest(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [requestId]);

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700 mx-auto mb-2"></div>
        Generando ficha oficial para impresión...
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-8 text-center text-slate-500">
        No se encontró la solicitud.
        <button onClick={onBack} className="block mx-auto mt-4 px-4 py-2 bg-emerald-700 text-white rounded-lg">
          Volver
        </button>
      </div>
    );
  }

  const grandTotal = request.items?.reduce((sum, it) => sum + (it.precio_estimado_total || 0), 0) || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      
      {/* Action Bar (Hidden when printing) */}
      <div className="no-print bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-slate-700 hover:text-emerald-800 font-bold text-xs px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Listado
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow transition-all"
          >
            <Printer className="w-4 h-4" />
            Imprimir / Guardar como PDF
          </button>
        </div>
      </div>

      {/* Official Sheet Document Container (A4 layout) */}
      <div className="bg-white p-8 md:p-12 rounded-xl shadow-lg border border-slate-200 print-page text-slate-900 font-sans">
        
        {/* Header Institution */}
        <div className="border-b-2 border-slate-900 pb-4 mb-6 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase font-bold tracking-widest text-slate-600">
              Universidad Nacional de San Luis
            </div>
            <div className="text-sm font-black uppercase tracking-wider text-slate-800">
              Facultad de Ingeniería y Ciencias Agropecuarias (FICA)
            </div>
            <div className="text-xs font-bold text-emerald-900">
              Departamento de Ciencias Agropecuarias
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-slate-500">CÓDIGO DE SOLICITUD</div>
            <div className="text-lg font-black font-mono text-emerald-900">{request.code}</div>
            <div className="text-xs text-slate-600 font-medium">Ejercicio: {request.year}</div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center my-6">
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-wide text-slate-900 underline underline-offset-4">
            FICHA DE SOLICITUD DE BIENES Y SERVICIOS
          </h1>
          <p className="text-xs text-slate-500 mt-1 uppercase font-semibold">
            Modalidad: <strong>{request.modality}</strong> | Fecha: <strong>{request.fecha_solicitud}</strong>
          </p>
        </div>

        {/* DATOS GENERALES TABLE */}
        <div className="mb-6">
          <div className="bg-slate-800 text-white font-bold text-xs uppercase px-3 py-1.5 rounded-t">
            DATOS GENERALES
          </div>
          <table className="w-full border border-slate-400 text-xs">
            <tbody>
              <tr className="border-b border-slate-300">
                <td className="bg-slate-100 font-bold p-2 w-1/3 border-r border-slate-300">Departamento:</td>
                <td className="p-2 font-semibold">Departamento de Ciencias Agropecuarias</td>
              </tr>
              <tr className="border-b border-slate-300">
                <td className="bg-slate-100 font-bold p-2 border-r border-slate-300">Área Solicitante:</td>
                <td className="p-2 font-semibold text-emerald-900">{request.area_name}</td>
              </tr>
              <tr className="border-b border-slate-300">
                <td className="bg-slate-100 font-bold p-2 border-r border-slate-300">Rubro:</td>
                <td className="p-2 font-semibold">{request.rubro_name}</td>
              </tr>
              <tr className="border-b border-slate-300">
                <td className="bg-slate-100 font-bold p-2 border-r border-slate-300">Solicitante / Responsable:</td>
                <td className="p-2 font-semibold">{request.solicitante_nombre || 'No especificado'} {request.solicitante_email ? `(${request.solicitante_email})` : ''}</td>
              </tr>
              <tr>
                <td className="bg-slate-100 font-bold p-2 border-r border-slate-300">Destino / Justificación:</td>
                <td className="p-2 italic">{request.justificacion || 'Sin justificación especificada'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* RENGLONES SOLICITADOS TABLE */}
        <div className="mb-6">
          <div className="bg-slate-800 text-white font-bold text-xs uppercase px-3 py-1.5 rounded-t">
            DETALLE DE BIENES Y SERVICIOS SOLICITADOS
          </div>
          <table className="w-full border border-slate-400 text-xs">
            <thead className="bg-slate-200 font-bold border-b border-slate-400">
              <tr>
                <th className="p-2 border-r border-slate-300 text-center w-12">Nº Reng.</th>
                <th className="p-2 border-r border-slate-300 text-left">Descripción y Especificaciones Técnicas</th>
                <th className="p-2 border-r border-slate-300 text-center w-24">Cantidad</th>
                <th className="p-2 border-r border-slate-300 text-right w-32">Precio Estimado Unitario</th>
                <th className="p-2 text-right w-36">Precio Estimado Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {request.items?.map((it, idx) => (
                <tr key={it.id || idx}>
                  <td className="p-2 border-r border-slate-300 text-center font-bold">{it.renglon_numero || idx + 1}</td>
                  <td className="p-2 border-r border-slate-300 font-medium">{it.descripcion}</td>
                  <td className="p-2 border-r border-slate-300 text-center font-bold">{it.cantidad_solicitada} {it.unidad_medida}</td>
                  <td className="p-2 border-r border-slate-300 text-right">{formatCurrency(it.precio_estimado_unitario)}</td>
                  <td className="p-2 text-right font-bold">{formatCurrency(it.precio_estimado_total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-slate-400 bg-slate-100 font-black">
              <tr>
                <td colSpan={4} className="p-2.5 text-right uppercase tracking-wider">
                  Total Estimado de la Solicitud:
                </td>
                <td className="p-2.5 text-right text-sm text-emerald-950 font-black">
                  {formatCurrency(grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* PROVEEDORES SUGERIDOS TABLE */}
        <div className="mb-8">
          <div className="bg-slate-800 text-white font-bold text-xs uppercase px-3 py-1.5 rounded-t">
            DATOS DE PROVEEDORES SUGERIDOS (PARA CONTACTO EN EL PROCEDIMIENTO DE COMPRA)
          </div>
          {request.vendors && request.vendors.length > 0 ? (
            <table className="w-full border border-slate-400 text-xs">
              <thead className="bg-slate-200 font-bold border-b border-slate-400">
                <tr>
                  <th className="p-2 border-r border-slate-300 text-left">Nombre / Razón Social</th>
                  <th className="p-2 border-r border-slate-300 text-left">Dirección</th>
                  <th className="p-2 border-r border-slate-300 text-left">CUIT</th>
                  <th className="p-2 border-r border-slate-300 text-left">Teléfono</th>
                  <th className="p-2 text-left">E-mail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {request.vendors.map((v, i) => (
                  <tr key={i}>
                    <td className="p-2 border-r border-slate-300 font-bold">{v.nombre}</td>
                    <td className="p-2 border-r border-slate-300">{v.direccion || '-'}</td>
                    <td className="p-2 border-r border-slate-300 font-mono">{v.cuit || '-'}</td>
                    <td className="p-2 border-r border-slate-300">{v.telefono || '-'}</td>
                    <td className="p-2">{v.email || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-3 border border-slate-400 text-xs text-slate-500 italic">
              No se indicaron proveedores sugeridos particulares para esta solicitud.
            </div>
          )}
        </div>

        {/* SIGNATURES SECTION */}
        <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-12 text-center text-xs">
          <div>
            <div className="border-b border-slate-400 w-48 mx-auto mb-2 h-12"></div>
            <div className="font-bold uppercase text-slate-800">Firma del Solicitante</div>
            <div className="text-slate-500">{request.solicitante_nombre || 'Docente / Responsable de Área'}</div>
          </div>
          <div>
            <div className="border-b border-slate-400 w-48 mx-auto mb-2 h-12"></div>
            <div className="font-bold uppercase text-slate-800">Firma y Sello</div>
            <div className="text-slate-500">Dirección Depto. Ciencias Agropecuarias</div>
          </div>
        </div>

      </div>

    </div>
  );
}
