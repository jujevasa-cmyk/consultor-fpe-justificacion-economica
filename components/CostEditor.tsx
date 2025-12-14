import React, { useState, useEffect } from 'react';
import { X, Save, Calculator, AlertTriangle, Info, Activity, Wallet, CheckCheck, Calendar, Percent, StickyNote, RefreshCw, TrendingDown, TrendingUp, NotebookPen } from 'lucide-react';
import { TrainingAction, JustificationInput, CATEGORIAS_COSTES, JustificationResult, SituacionAccion } from '../types';
import { calculateJustification, formatCurrency } from '../utils/logic';

interface CostEditorProps {
  action: TrainingAction;
  existingInput?: JustificationInput;
  onSave: (input: JustificationInput) => void;
  onClose: () => void;
}

export const CostEditor: React.FC<CostEditorProps> = ({ action, existingInput, onSave, onClose }) => {
  const [situacion, setSituacion] = useState<SituacionAccion>(existingInput?.situacion || 'PENDIENTE');
  
  // Date Fields (stored internally as DD/MM/YYYY strings to match CSV data)
  const [fechaInicio, setFechaInicio] = useState(existingInput?.fechaInicioReal || action.fechaInicio || '');
  const [fechaFin, setFechaFin] = useState(existingInput?.fechaFinReal || action.fechaFin || '');

  const [alumnosFinalizados, setAlumnosFinalizados] = useState(existingInput?.alumnosFinalizados ?? action.alumnosConcedidos);
  const [costesDirectos, setCostesDirectos] = useState(existingInput?.costesDirectos ?? {
    personalFormador: 0, materialDidactico: 0, mediosDidacticos: 0, alquilerAulas: 0,
    alquilerEquipos: 0, seguros: 0, publicidad: 0, captacion: 0, otros: 0
  });
  const [costesIndirectos, setCostesIndirectos] = useState(existingInput?.costesIndirectos ?? 0);
  const [importePagado, setImportePagado] = useState(existingInput?.importePagado ?? 0);
  const [notas, setNotas] = useState(existingInput?.notas || '');

  const [preview, setPreview] = useState<JustificationResult | null>(null);

  // Business Rule: If status is NO_EJECUTABLE, force students to 0
  useEffect(() => {
    if (situacion === 'NO_EJECUTABLE') {
        setAlumnosFinalizados(0);
    }
  }, [situacion]);

  // Live preview calculation
  useEffect(() => {
    const tempInput: JustificationInput = {
        actionId: action.id,
        situacion,
        fechaInicioReal: fechaInicio,
        fechaFinReal: fechaFin,
        alumnosFinalizados,
        costesDirectos,
        costesIndirectos,
        importePagado,
        notas
    };
    setPreview(calculateJustification(action, tempInput));
  }, [situacion, fechaInicio, fechaFin, alumnosFinalizados, costesDirectos, costesIndirectos, importePagado, action, notas]);

  const handleDirectChange = (key: keyof typeof costesDirectos, val: string) => {
    setCostesDirectos(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));
  };

  const setPaymentPercentage = (percent: number) => {
     if (preview) {
         const total = preview.costeTotalJustificado;
         setImportePagado(parseFloat((total * (percent / 100)).toFixed(2)));
     }
  };

  const handleManualPercentChange = (val: string) => {
      const pct = parseFloat(val);
      if (isNaN(pct)) return;
      if (preview && preview.costeTotalJustificado > 0) {
          const newAmount = (preview.costeTotalJustificado * pct) / 100;
          setImportePagado(parseFloat(newAmount.toFixed(2)));
      }
  };

  const fixIndirectCosts = () => {
    if (preview) {
        // Since Limit = (Direct + Indirect) * 0.10
        // We want to find I such that I = 0.10 * (D + I)
        // I = 0.1D + 0.1I  =>  0.9I = 0.1D  =>  I = D / 9
        
        const totalDirectos = preview.totalCostesDirectos;
        const maxIndirectos = totalDirectos / 9;
        setCostesIndirectos(parseFloat(maxIndirectos.toFixed(2)));
    }
  };

  const handleSave = () => {
    onSave({
      actionId: action.id,
      situacion,
      fechaInicioReal: fechaInicio,
      fechaFinReal: fechaFin,
      alumnosFinalizados,
      costesDirectos,
      costesIndirectos,
      importePagado,
      notas
    });
    onClose();
  };

  // --- Date Helpers (European DD/MM/YYYY <-> ISO YYYY-MM-DD) ---
  const toInputDate = (dateStr: string) => {
    if (!dateStr) return '';
    // Check if it's already ISO
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
    
    // Check if it's DD/MM/YYYY
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        const [d, m, y] = parts;
        return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }
    return '';
  };

  const fromInputDate = (isoDate: string) => {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
  };

  // Helper to get current % based on amount
  const currentTotal = preview?.costeTotalJustificado || 0;
  const currentPercent = currentTotal > 0 ? (importePagado / currentTotal) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Justificación Económica</h2>
            <p className="text-sm text-slate-500">{action.denominacion} ({action.codigoAccion})</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Col: Inputs (7/12) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Participant & Status Data */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <Calculator className="w-4 h-4" /> Datos de Ejecución
              </h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-blue-800 mb-1">Situación del Curso</label>
                    <div className="relative">
                        <Activity className="absolute left-2 top-2.5 w-4 h-4 text-blue-500" />
                        <select 
                            value={situacion}
                            onChange={(e) => setSituacion(e.target.value as SituacionAccion)}
                            className="w-full pl-8 bg-white border border-blue-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="PENDIENTE">Pendiente</option>
                            <option value="EJECUCION">En Ejecución</option>
                            <option value="FINALIZADO">Finalizado</option>
                            <option value="NO_EJECUTABLE">No Ejecutable / Anulado</option>
                        </select>
                    </div>
                  </div>
                  
                  {/* Dates with Calendar Type */}
                  <div>
                    <label className="block text-xs text-blue-800 mb-1">Fecha Inicio</label>
                    <div className="relative">
                        <input 
                            type="date" 
                            value={toInputDate(fechaInicio)} 
                            onChange={(e) => setFechaInicio(fromInputDate(e.target.value))}
                            className="w-full bg-white border border-blue-300 rounded p-2 text-sm" 
                        />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-blue-800 mb-1">Fecha Fin</label>
                    <div className="relative">
                        <input 
                            type="date" 
                            value={toInputDate(fechaFin)} 
                            onChange={(e) => setFechaFin(fromInputDate(e.target.value))}
                            className="w-full bg-white border border-blue-300 rounded p-2 text-sm" 
                        />
                    </div>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs text-blue-800 mb-1">Alumnos Concedidos</label>
                   <input type="number" disabled value={action.alumnosConcedidos} className="w-full bg-blue-100/50 border-blue-200 rounded p-2 text-slate-600" />
                </div>
                <div>
                   <label className="block text-xs font-bold text-blue-800 mb-1">Alumnos Finalizados</label>
                   <input 
                    type="number" 
                    value={alumnosFinalizados} 
                    onChange={(e) => setAlumnosFinalizados(parseFloat(e.target.value))}
                    className="w-full bg-white border border-blue-300 rounded p-2 focus:ring-2 focus:ring-blue-500" 
                    disabled={situacion === 'NO_EJECUTABLE'}
                   />
                </div>
              </div>
            </div>

            {/* Direct Costs */}
            <div>
              <h3 className="font-semibold text-slate-800 mb-3 border-b pb-2">Costes Directos (A1-A9)</h3>
              <div className="grid grid-cols-1 gap-y-3">
                {CATEGORIAS_COSTES.map((cat) => (
                    <div key={cat.key} className="flex justify-between items-center bg-gray-50 p-2 rounded hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-200">
                        <label className="text-sm text-slate-600 font-medium">{cat.label}</label>
                        <div className="flex items-center gap-2">
                             <input 
                                type="number" 
                                min="0" 
                                step="0.01"
                                value={costesDirectos[cat.key as keyof typeof costesDirectos] || ''}
                                onChange={(e) => handleDirectChange(cat.key as keyof typeof costesDirectos, e.target.value)}
                                className="w-32 border border-slate-300 rounded px-2 py-1 text-right focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="0.00"
                             />
                             <span className="text-slate-400 text-xs w-4">€</span>
                        </div>
                    </div>
                ))}
              </div>
              {preview && (
                  <div className="mt-2 text-right text-xs font-bold text-slate-500 pr-8">
                      Total Directos: {formatCurrency(preview.totalCostesDirectos)}
                  </div>
              )}
            </div>

            {/* Indirect Costs with AUTO-ADJUST ALERT */}
            <div className={`p-4 rounded-lg border transition-all ${
                preview && preview.totalCostesIndirectosJustificados > preview.limiteCostesIndirectos
                ? 'bg-rose-50 border-rose-200 shadow-sm'
                : 'bg-amber-50 border-amber-100'
            }`}>
               <h3 className={`font-semibold mb-3 flex items-center gap-2 ${
                   preview && preview.totalCostesIndirectosJustificados > preview.limiteCostesIndirectos
                   ? 'text-rose-800' : 'text-amber-900'
               }`}>
                  Costes Indirectos (B9)
                  <Info className="w-4 h-4 opacity-70" title="Sujeto al límite del 10%" />
               </h3>
               
               <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium opacity-80">Gastos de Gestión y Apoyo</label>
                    <div className="flex items-center gap-2">
                         <input 
                            type="number" 
                            min="0"
                            step="0.01"
                            value={costesIndirectos || ''}
                            onChange={(e) => setCostesIndirectos(parseFloat(e.target.value) || 0)}
                            className={`w-32 border rounded px-2 py-1 text-right focus:outline-none focus:ring-1 ${
                                preview && preview.totalCostesIndirectosJustificados > preview.limiteCostesIndirectos
                                ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500 text-rose-700 font-bold'
                                : 'border-amber-300 focus:border-amber-600 focus:ring-amber-600'
                            }`}
                         />
                         <span className="text-slate-400 text-xs w-4">€</span>
                    </div>
               </div>

               {/* ALERT & AUTO-FIX BUTTON */}
               {preview && preview.totalCostesIndirectosJustificados > preview.limiteCostesIndirectos && (
                   <div className="mt-3 bg-white/80 p-3 rounded border border-rose-200 flex items-center justify-between text-xs animate-in slide-in-from-top-1">
                       <div className="flex items-center gap-2 text-rose-700">
                           <AlertTriangle className="w-4 h-4 animate-pulse" />
                           <div className="flex flex-col">
                               <span className="font-bold">¡Exceso del 10%!</span>
                               <span>Máximo permitido: {formatCurrency(preview.limiteCostesIndirectos)}</span>
                           </div>
                       </div>
                       <button 
                         onClick={fixIndirectCosts}
                         className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded shadow-sm transition-colors font-medium"
                         title="Recalcular indirectos para cumplir el 10% exacto"
                       >
                         <RefreshCw className="w-3 h-3" /> Auto-Ajustar
                       </button>
                   </div>
               )}
            </div>
            
            {/* NOTES FIELD */}
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 shadow-sm relative group">
                <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-yellow-200/50 to-transparent rounded-bl-xl pointer-events-none"></div>
                <h3 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2 text-sm">
                    <NotebookPen className="w-4 h-4" /> Cuaderno de Bitácora / Notas
                </h3>
                <textarea
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    className="w-full bg-white/50 border border-yellow-300 rounded-md p-3 text-sm text-slate-700 focus:ring-2 focus:ring-yellow-400 focus:bg-white outline-none resize-y min-h-[80px]"
                    placeholder="Escribe aquí observaciones, recordatorios de facturas pendientes o justificaciones de desviaciones..."
                ></textarea>
            </div>

          </div>

          {/* Right Col: Live Summary (5/12) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 sticky top-0">
                <h3 className="font-bold text-lg text-slate-800 mb-4">Simulación de Liquidación</h3>
                
                {preview && (
                    <div className="space-y-4">
                        {/* 1. Potencial */}
                        <div className="bg-indigo-50 p-3 rounded border border-indigo-100">
                             <div className="flex justify-between text-sm mb-1">
                                <span className="text-indigo-700 font-medium">Máximo Financiable (Real)</span>
                                <span className="font-bold text-indigo-800">{formatCurrency(preview.importeFinanciableReal)}</span>
                            </div>
                            <div className="text-[10px] text-indigo-400 text-right">
                                {alumnosFinalizados} alum. x {action.horas} h x {action.moduloEconomico} €
                            </div>
                        </div>
                        
                        {/* 2. Gastos */}
                        <div className="space-y-2 py-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Total Directos</span>
                                <span>{formatCurrency(preview.totalCostesDirectos)}</span>
                            </div>
                            
                            <div className="flex justify-between text-sm text-slate-600">
                                <span>Indirectos Reconocidos</span>
                                <span>{formatCurrency(preview.costeIndirectoReconocido)}</span>
                            </div>
                            
                            <div className="h-px bg-slate-200 my-1"></div>

                            <div className="flex justify-between text-lg font-bold">
                                <span className="text-slate-800">Total Gastos Justificados</span>
                                <span className="text-slate-800">{formatCurrency(preview.totalCostesReconocidos)}</span>
                            </div>
                        </div>

                        {/* 3. BUDGET DEVIATION HIGHLIGHTER */}
                        <div className={`p-4 rounded-lg border-2 shadow-sm flex flex-col items-center text-center transition-colors ${
                            preview.desviacion > 0.01 
                            ? 'bg-blue-50 border-blue-200 text-blue-800'  // Under budget (Savings)
                            : preview.desviacion < -0.01
                            ? 'bg-rose-50 border-rose-200 text-rose-800'  // Over budget (Loss)
                            : 'bg-emerald-50 border-emerald-200 text-emerald-800' // Perfect
                        }`}>
                             <div className="text-xs font-bold uppercase mb-1 opacity-70">Resultado Presupuestario</div>
                             <div className="text-3xl font-extrabold tracking-tight mb-2">
                                {formatCurrency(Math.abs(preview.desviacion))}
                             </div>
                             <div className="flex items-center gap-1.5 text-sm font-bold bg-white/50 px-3 py-1 rounded-full">
                                 {preview.desviacion > 0.01 ? (
                                     <>
                                        <TrendingUp className="w-4 h-4" />
                                        <span>Falta por gastar</span>
                                     </>
                                 ) : preview.desviacion < -0.01 ? (
                                     <>
                                        <TrendingDown className="w-4 h-4" />
                                        <span>Exceso de Gasto</span>
                                     </>
                                 ) : (
                                     <>
                                        <CheckCheck className="w-4 h-4" />
                                        <span>Cuadrado Perfecto</span>
                                     </>
                                 )}
                             </div>
                        </div>

                        {/* 4. Estado General */}
                        <div className={`text-center text-xs font-bold py-1 px-3 rounded-full w-fit mx-auto ${
                             preview.estado === 'OK' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                            ESTADO NORMATIVO: {preview.estado.replace(/_/g, ' ')}
                        </div>
                    </div>
                )}
            </div>

            {/* Payment / Treasury Section */}
            <div className="bg-teal-50 p-5 rounded-lg border border-teal-200">
               <h3 className="font-semibold text-teal-900 mb-3 flex items-center gap-2">
                  <Wallet className="w-4 h-4" /> Tesorería y Pagos
               </h3>
               
               <div className="space-y-4">
                  <div className="flex gap-4 items-end">
                      <div className="flex-1">
                          <label className="block text-xs font-bold text-teal-800 mb-1">Importe Pagado (€)</label>
                          <input 
                            type="number" 
                            min="0"
                            step="0.01"
                            value={importePagado}
                            onChange={(e) => setImportePagado(parseFloat(e.target.value) || 0)}
                            className="w-full border border-teal-300 rounded px-2 py-2 focus:ring-2 focus:ring-teal-500 outline-none font-bold text-teal-900"
                            placeholder="0.00"
                          />
                      </div>
                      <div className="w-24">
                          <label className="block text-xs font-bold text-teal-800 mb-1">% Pagado</label>
                          <div className="relative">
                              <input 
                                type="number" 
                                min="0"
                                max="100"
                                step="0.01"
                                value={currentPercent > 0 ? parseFloat(currentPercent.toFixed(2)) : ''}
                                onChange={(e) => handleManualPercentChange(e.target.value)}
                                className="w-full border border-teal-300 rounded px-2 py-2 pl-2 focus:ring-2 focus:ring-teal-500 outline-none text-right font-medium text-teal-700"
                                placeholder="0"
                              />
                              <Percent className="absolute right-7 top-2.5 w-3 h-3 text-teal-400 opacity-0" />
                              <span className="absolute right-2 top-2.5 text-xs text-teal-500">%</span>
                          </div>
                      </div>
                  </div>
                      
                  {/* Percentage Buttons Shortcuts */}
                  <div className="flex gap-2">
                         <button 
                            onClick={() => setPaymentPercentage(30)}
                            className="flex-1 bg-white hover:bg-teal-50 text-teal-700 border border-teal-200 rounded py-1 text-xs font-medium"
                         >
                            30%
                         </button>
                         <button 
                            onClick={() => setPaymentPercentage(70)}
                            className="flex-1 bg-white hover:bg-teal-50 text-teal-700 border border-teal-200 rounded py-1 text-xs font-medium"
                            title="Igualar al anticipo (aprox)"
                         >
                            70%
                         </button>
                         <button 
                            onClick={() => setPaymentPercentage(100)}
                            className="flex-1 bg-teal-100 hover:bg-teal-200 text-teal-800 border border-teal-200 rounded py-1 text-xs font-bold"
                            title="Pagado Totalmente"
                         >
                            100%
                         </button>
                  </div>

                  {preview && (
                      <div className="flex justify-between items-center text-sm pt-2 border-t border-teal-200">
                          <span className="text-teal-800">Pendiente de Pago:</span>
                          <span className={`font-bold font-mono ${preview.pendientePago > 0 ? 'text-rose-600' : 'text-teal-700'}`}>
                              {formatCurrency(preview.pendientePago)}
                          </span>
                      </div>
                  )}
               </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:text-slate-800">Cancelar</button>
            <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 shadow-sm flex items-center gap-2">
                <Save className="w-4 h-4" /> Guardar Justificación
            </button>
        </div>
      </div>
    </div>
  );
};