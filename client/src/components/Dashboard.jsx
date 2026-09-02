import React from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Wallet, 
  Clock, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  PieChart as PieIcon, 
  BarChart3, 
  ArrowUpRight,
  Sparkles
} from 'lucide-react';

export default function Dashboard({ 
  stats, 
  selectedYear, 
  onNavigateTab, 
  onFilterRequests 
}) {
  if (!stats) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700 mr-3"></div>
        Cargando estadísticas y panel de control...
      </div>
    );
  }

  const { summary, by_area, by_rubro, by_modality, by_status } = stats;

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const formatNumber = (val) => {
    return new Intl.NumberFormat('es-AR').format(val || 0);
  };

  // Find max rubro spent for relative bar widths
  const maxRubroTotal = Math.max(...by_rubro.map(r => Math.max(r.total_gastado, r.total_estimado)), 1);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* Top Banner with Year Highlight */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-emerald-700/60 border border-emerald-500/40 text-emerald-200 text-xs font-semibold px-3 py-1 rounded-full mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Ejercicio Presupuestario {selectedYear}
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Resumen General de Compras y Presupuesto
          </h2>
          <p className="text-emerald-100 text-sm mt-1 max-w-2xl">
            Control en tiempo real de fondos asignados, gastos efectuados por área y rubro, y disponibilidad presupuestaria departamental.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateTab('new-request')}
            className="bg-white hover:bg-emerald-50 text-emerald-900 font-bold px-4 py-2.5 rounded-xl shadow transition-all hover:scale-105 text-sm flex items-center gap-2"
          >
            <ArrowUpRight className="w-4 h-4 text-emerald-700" />
            Cargar Nuevo Pedido
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Presupuesto Total */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Presupuesto Inicial
            </span>
            <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">
              {formatCurrency(summary.initial_budget)}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Fondo Anual Departamental
            </p>
          </div>
        </div>

        {/* Total Gastado / Comprado */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Gastado
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-700">
              {formatCurrency(summary.total_spent)}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(summary.execution_rate, 100)}%` }}
                />
              </div>
              <span className="text-xs font-bold text-emerald-800 whitespace-nowrap">
                {summary.execution_rate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Saldo Restante Departamental */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Saldo Disponible
            </span>
            <div className={`p-2 rounded-xl ${summary.remaining_budget >= 0 ? 'bg-teal-50 text-teal-700' : 'bg-rose-50 text-rose-700'}`}>
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-black ${summary.remaining_budget >= 0 ? 'text-teal-700' : 'text-rose-600'}`}>
              {formatCurrency(summary.remaining_budget)}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {summary.initial_budget > 0 
                ? `${((summary.remaining_budget / summary.initial_budget) * 100).toFixed(1)}% disponible del total`
                : 'Sin presupuesto asignado'}
            </p>
          </div>
        </div>

        {/* Pendiente en Trámite */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Estimado Pendiente
            </span>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-600">
              {formatCurrency(summary.total_pending_estimated)}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              En pedidos sin comprar aún
            </p>
          </div>
        </div>

      </div>

      {/* Main Grid: Status by Area & Status by Rubro */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Areas Breakdown Cards & Budget Usage */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-700" />
                  Estado y Presupuesto por Área Solicitante
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Seguimiento del porcentaje asignado, gasto ejecutado y saldo libre de cada área.
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('settings')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                Ajustar Porcentajes
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {by_area.map((area) => {
                const executionPct = area.allocated_amount > 0 
                  ? (area.total_gastado / area.allocated_amount) * 100 
                  : 0;

                let badgeColor = 'bg-emerald-100 text-emerald-800';
                let barColor = 'bg-emerald-600';
                if (executionPct > 85) {
                  badgeColor = 'bg-rose-100 text-rose-800';
                  barColor = 'bg-rose-600';
                } else if (executionPct > 60) {
                  badgeColor = 'bg-amber-100 text-amber-800';
                  barColor = 'bg-amber-600';
                }

                return (
                  <div 
                    key={area.area_id}
                    className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span 
                          className="w-3.5 h-3.5 rounded-full shrink-0" 
                          style={{ backgroundColor: area.area_color || '#10B981' }} 
                        />
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">
                            {area.area_name}
                          </h4>
                          <span className="text-xs text-slate-500">
                            {area.total_pedidos} pedido(s) cargado(s)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center text-right">
                        <div>
                          <div className="text-xs text-slate-500 font-medium">
                            Asignado ({area.percentage}%): <strong className="text-slate-700">{formatCurrency(area.allocated_amount)}</strong>
                          </div>
                          <div className="text-xs text-slate-500 font-medium">
                            Gastado: <strong className="text-emerald-700">{formatCurrency(area.total_gastado)}</strong>
                          </div>
                        </div>
                        <div className="pl-3 border-l border-slate-200">
                          <div className="text-xs text-slate-500">Saldo Libre</div>
                          <div className={`text-sm font-black ${area.remaining_balance >= 0 ? 'text-teal-700' : 'text-rose-600'}`}>
                            {formatCurrency(area.remaining_balance)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                        <span>Consumo del fondo asignado</span>
                        <span className="font-bold">{executionPct.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`${barColor} h-2 rounded-full transition-all duration-500`}
                          style={{ width: `${Math.min(executionPct, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Rubros & Modality Breakdown */}
        <div className="space-y-6">
          
          {/* Rubros Breakdown */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-md font-bold text-slate-900 flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-emerald-700" />
                Gastos y Pedidos por Rubro
              </h3>
            </div>

            <div className="mt-4 space-y-3.5">
              {by_rubro.map((rubro) => {
                const pct = maxRubroTotal > 0 ? ((rubro.total_gastado + rubro.total_estimado) / maxRubroTotal) * 100 : 0;
                return (
                  <div key={rubro.rubro_id} className="text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <span 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: rubro.rubro_color || '#6366F1' }}
                        />
                        {rubro.rubro_name}
                      </div>
                      <span className="font-black text-slate-900">
                        {formatCurrency(rubro.total_gastado)}
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-2 rounded-full" 
                        style={{ 
                          width: `${Math.max(pct, 4)}%`,
                          backgroundColor: rubro.rubro_color || '#6366F1'
                        }}
                      />
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                      <span>{rubro.total_pedidos} pedidos ({rubro.total_items} ítems)</span>
                      {rubro.total_estimado > 0 && (
                        <span className="text-amber-600 font-medium">
                          + {formatCurrency(rubro.total_estimado)} pendiente
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modalidad de Compra (Licitación vs Compra Directa) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-md font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-700" />
                Modalidades de Compra
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              {by_modality.map((m) => (
                <div 
                  key={m.modality}
                  className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-center"
                >
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    {m.modality}
                  </span>
                  <div className="text-xl font-black text-slate-900 mt-1">
                    {m.count}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {formatCurrency(m.total_gastado)}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
