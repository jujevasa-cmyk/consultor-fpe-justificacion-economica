import React, { useState, useMemo, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { CostEditor } from './components/CostEditor';
import { AnalysisModal } from './components/AnalysisModal';
import { TrainingAction, JustificationInput, JustificationResult, SituacionAccion } from './types';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { LayoutDashboard, Building2, FileSpreadsheet, Edit2, BrainCircuit, AlertTriangle, CheckCircle2, AlertCircle, Clock, PlayCircle, XCircle, Wallet, Trash2, Calendar, User, Users, School, Download, Save, TrendingUp, TrendingDown, Banknote, ChevronDown, ChevronUp, BarChart3, GraduationCap, ArrowRight, ArrowLeftRight, Landmark, Coins, PiggyBank, FileText, LogOut, HardDriveDownload, Filter, Search, X } from 'lucide-react';
import { calculateJustification, formatCurrency } from './utils/logic';
import * as XLSX from 'xlsx';

interface CompanyStats {
  concedido: number;
  financiableReal: number;
  reconocido: number;
  expedientes: Set<string>;
}

const STORAGE_KEY_DATA = 'fp_consultant_data_v1';
const STORAGE_KEY_INPUTS = 'fp_consultant_inputs_v1';

const App: React.FC = () => {
  // Initialize state from localStorage if available
  const [data, setData] = useState<TrainingAction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DATA);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error loading data from storage", e);
      return [];
    }
  });

  const [inputs, setInputs] = useState<Record<string, JustificationInput>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_INPUTS);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Error loading inputs from storage", e);
      return {};
    }
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  // UI State for Collapsible Expedientes
  const [collapsedExpedientes, setCollapsedExpedientes] = useState<Set<string>>(new Set());

  // Filters State
  const [filterEmpresa, setFilterEmpresa] = useState<string>('ALL'); // New for Dashboard
  const [filterExpediente, setFilterExpediente] = useState<string>('ALL');
  const [filterSituacion, setFilterSituacion] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal states
  const [editingAction, setEditingAction] = useState<TrainingAction | null>(null);
  const [analyzingAction, setAnalyzingAction] = useState<{action: TrainingAction, input: JustificationInput, result: JustificationResult} | null>(null);
  
  // Exit Confirmation State
  const [showExitModal, setShowExitModal] = useState(false);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_INPUTS, JSON.stringify(inputs));
  }, [inputs]);

  // Reset filters when tab changes
  useEffect(() => {
    setFilterEmpresa('ALL');
    setFilterExpediente('ALL');
    setFilterSituacion('ALL');
    setSearchTerm('');
  }, [activeTab]);

  // Browser Close Protection (Native)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only warn if there is data loaded
      if (data.length > 0) {
        e.preventDefault();
        e.returnValue = ''; // Standard way to trigger browser confirmation
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [data]);

  const handleDataLoaded = (loadedData: TrainingAction[], loadedInputs?: Record<string, JustificationInput>) => {
    setData(loadedData);

    if (loadedInputs && Object.keys(loadedInputs).length > 0) {
        setInputs(prev => ({
            ...prev,
            ...loadedInputs
        }));
        alert(`Copia de seguridad restaurada con éxito.\nDatos cargados: ${loadedData.length}\nJustificaciones recuperadas: ${Object.keys(loadedInputs).length}`);
    } else {
        const previousInputsCount = Object.keys(inputs).length;
        const preservedCount = loadedData.filter(d => inputs[d.id]).length;
        
        if (preservedCount > 0) {
             alert(`Base de datos actualizada.\nSe mantienen ${preservedCount} justificaciones previas.`);
        }
    }

    setActiveTab('dashboard');
  };

  const handleResetData = () => {
    if (window.confirm('¿Estás seguro de que deseas eliminar la base de datos actual y todas las justificaciones? Esta acción no se puede deshacer.')) {
      setData([]);
      setInputs({});
      localStorage.removeItem(STORAGE_KEY_DATA);
      localStorage.removeItem(STORAGE_KEY_INPUTS);
    }
  };

  const handleExportExcel = () => {
    // Flatten the data structure for Excel
    const exportData = validData.map(action => {
        const input = inputs[action.id];
        const result = input ? calculateJustification(action, input) : null;

        const alumFinal = input?.alumnosFinalizados ?? 0;
        const situacion = input?.situacion || 'PENDIENTE';

        return {
            "ID": action.id, 
            "Expediente": action.expediente,
            "Empresa": action.empresa,
            "Centro": action.centro,
            "Nº Acción": action.codigoAccion,
            "Denominación": action.denominacion,
            "Situación": situacion,
            "Fecha Inicio": action.fechaInicio || '',
            "Fecha Fin": action.fechaFin || '',
            // If user edited dates, export them, else blank
            "Fecha Inicio Real": input?.fechaInicioReal || '', 
            "Fecha Fin Real": input?.fechaFinReal || '',
            "Profesor": action.profesor || '',
            "Horas": action.horas,
            "Módulo (€/h)": action.moduloEconomico,
            "Alumnos Concedidos": action.alumnosConcedidos,
            "Alumnos Finalizados": input ? alumFinal : (action.alumnosConcedidos || ''),
            "Importe Concedido": action.importeMaximoConcedido,
            "Importe Financiable Real": result?.importeFinanciableReal || 0,
            
            "A1. Personal": input?.costesDirectos.personalFormador || 0,
            "A2. Material Didáctico": input?.costesDirectos.materialDidactico || 0,
            "A3. Medios/Amortización": input?.costesDirectos.mediosDidacticos || 0,
            "A4. Alquiler Aulas": input?.costesDirectos.alquilerAulas || 0,
            "A5. Alquiler Equipos": input?.costesDirectos.alquilerEquipos || 0,
            "A6. Seguros": input?.costesDirectos.seguros || 0,
            "A7. Publicidad": input?.costesDirectos.publicidad || 0,
            "A8. Captación": input?.costesDirectos.captacion || 0,
            "A9. Otros Costes Directos": input?.costesDirectos.otros || 0,
            "TOTAL COSTES DIRECTOS": result?.totalCostesDirectos || 0,

            "B9. Indirectos Justificados": input?.costesIndirectos || 0,
            "Límite Indirectos (10%)": result?.limiteCostesIndirectos || 0,
            "B9. Indirectos Reconocidos": result?.costeIndirectoReconocido || 0,
            
            "TOTAL RECONOCIDO": result?.totalCostesReconocidos || 0,
            "DESVIACIÓN": result?.desviacion || 0,
            "ESTADO": result?.estado || "PENDIENTE",

            "Importe Pagado": input?.importePagado || 0,
            "Pendiente de Pago": result?.pendientePago || 0,
            "Notas": input?.notas || ''
        };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wscols = Object.keys(exportData[0] || {}).map(k => ({ wch: k.length + 5 }));
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Justificación FP");

    XLSX.writeFile(wb, `Informe_Justificacion_FP_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleSaveCost = (input: JustificationInput) => {
    setInputs(prev => ({
      ...prev,
      [input.actionId]: input
    }));
  };

  const toggleExpediente = (exp: string) => {
    setCollapsedExpedientes(prev => {
        const newSet = new Set(prev);
        if (newSet.has(exp)) {
            newSet.delete(exp);
        } else {
            newSet.add(exp);
        }
        return newSet;
    });
  };
  
  const handleExitAndDownload = () => {
    handleExportExcel();
    setShowExitModal(false);
    // In a real app we might redirect, but here we just ensure data is downloaded
    alert("Copia de seguridad descargada. Ya puedes cerrar la pestaña con seguridad.");
  };

  // --- Derived Data & Aggregations ---

  const validData = useMemo(() => {
    return data.filter(d => {
        const emp = d.empresa?.trim().toUpperCase();
        return emp && emp !== 'ALUM.' && emp !== 'ALUM' && emp !== 'EMPRESA';
    });
  }, [data]);

  const uniqueEmpresas = useMemo(() => Array.from(new Set(validData.map(d => d.empresa))).sort(), [validData]);
  
  // Lists for Filters
  const availableExpedientes = useMemo(() => {
      let filtered = validData;
      // If a company is selected (in Dashboard or Tab), filter expedientes
      const activeCompany = activeTab !== 'dashboard' ? activeTab : (filterEmpresa !== 'ALL' ? filterEmpresa : null);
      if (activeCompany) {
          filtered = filtered.filter(d => d.empresa === activeCompany);
      }
      return Array.from(new Set(filtered.map(d => d.expediente))).sort();
  }, [validData, activeTab, filterEmpresa]);

  const dashboardStats = useMemo(() => {
    let totalConcedido = 0;
    let totalFinanciableReal = 0;
    let totalReconocido = 0;
    let totalAlumnosConcedidos = 0;
    let totalAlumnosFinalizados = 0; 
    let accionesJustificadas = 0;

    const empresaStats: Record<string, CompanyStats> = {};

    // Filter data for Dashboard stats
    const dashboardFilteredData = validData.filter(d => {
        const matchEmp = filterEmpresa === 'ALL' || d.empresa === filterEmpresa;
        const matchExp = filterExpediente === 'ALL' || d.expediente === filterExpediente;
        const input = inputs[d.id];
        const status = input?.situacion || 'PENDIENTE';
        const matchSit = filterSituacion === 'ALL' || status === filterSituacion;
        const matchText = searchTerm === '' || 
                          d.denominacion.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          d.codigoAccion.toLowerCase().includes(searchTerm.toLowerCase());
        return matchEmp && matchExp && matchSit && matchText;
    });

    dashboardFilteredData.forEach(action => {
      if (!empresaStats[action.empresa]) {
        empresaStats[action.empresa] = { concedido: 0, financiableReal: 0, reconocido: 0, expedientes: new Set() };
      }
      empresaStats[action.empresa].expedientes.add(action.expediente);
      empresaStats[action.empresa].concedido += action.importeMaximoConcedido;

      totalConcedido += action.importeMaximoConcedido;
      totalAlumnosConcedidos += action.alumnosConcedidos;

      const input = inputs[action.id];
      if (input) {
        accionesJustificadas++;
        const res = calculateJustification(action, input);
        
        totalFinanciableReal += res.importeFinanciableReal;
        totalReconocido += res.totalCostesReconocidos;
        totalAlumnosFinalizados += input.alumnosFinalizados;

        empresaStats[action.empresa].financiableReal += res.importeFinanciableReal;
        empresaStats[action.empresa].reconocido += res.totalCostesReconocidos;

      } else {
        totalFinanciableReal += action.importeMaximoConcedido;
        totalAlumnosFinalizados += action.alumnosConcedidos;
        
        empresaStats[action.empresa].financiableReal += action.importeMaximoConcedido;
      }
    });

    const alumnoRetentionRate = totalAlumnosConcedidos > 0 ? (totalAlumnosFinalizados / totalAlumnosConcedidos) * 100 : 0;

    return { 
      totalConcedido, 
      totalFinanciableReal, 
      totalReconocido, 
      accionesJustificadas, 
      totalActions: dashboardFilteredData.length,
      alumnoRetentionRate,
      empresaStats
    };
  }, [validData, inputs, filterEmpresa, filterExpediente, filterSituacion, searchTerm]);

  const chartData = [
    { name: 'Reconocido', value: dashboardStats.totalReconocido, color: '#4F46E5' },
    { name: 'Pendiente/Pérdida', value: Math.max(0, dashboardStats.totalFinanciableReal - dashboardStats.totalReconocido), color: '#E5E7EB' }
  ];

  // Helper Renders
  const renderStatusBadge = (status?: JustificationResult['estado']) => {
    if (!status) return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">PENDIENTE</span>;
    switch(status) {
        case 'OK': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5"/> OK</span>;
        case 'AJUSTE_INDIRECTOS': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200"><AlertTriangle className="w-3.5 h-3.5"/> AJUSTE 10%</span>;
        case 'EXCEDIDO': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200"><AlertCircle className="w-3.5 h-3.5"/> EXCEDIDO</span>;
        case 'AJUSTE_Y_EXCEDIDO': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-200 text-rose-900 border border-rose-300"><AlertCircle className="w-3.5 h-3.5"/> CRÍTICO</span>;
    }
  };

  const renderSituacionBadge = (situacion?: SituacionAccion) => {
    const state = situacion || 'PENDIENTE';
    switch(state) {
        case 'FINALIZADO': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200 tracking-wide"><CheckCircle2 className="w-3 h-3"/> Finalizado</span>;
        case 'EJECUCION': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200 tracking-wide"><PlayCircle className="w-3 h-3"/> Ejecución</span>;
        case 'NO_EJECUTABLE': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-500 border border-gray-200 line-through decoration-gray-400 tracking-wide"><XCircle className="w-3 h-3"/> N/A</span>;
        default: return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200 tracking-wide"><Clock className="w-3 h-3"/> Pendiente</span>;
    }
  };

  const renderTable = (actions: TrainingAction[]) => (
    <div className="overflow-x-auto border-t border-gray-200 animate-in fade-in slide-in-from-top-2 duration-200">
        <table className="min-w-full divide-y divide-gray-200">
            <thead>
                <tr className="bg-gray-50/80">
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider w-64">Acción Formativa / Centro</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fechas / Situación</th>
                    <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Alumnos</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Directos</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Indirectos</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50/30 border-l border-indigo-100">Max. Financiable</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold text-teal-700 uppercase tracking-wider bg-teal-50/30 border-l border-teal-100">Pagado</th>
                    <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
                {actions.map((action, idx) => {
                    const input = inputs[action.id];
                    let result: JustificationResult | null = null;
                    if (input) result = calculateJustification(action, input);

                    // Logic: If NO_EJECUTABLE, effectiveStudents is 0 for visual table purposes too
                    let effectiveStudents = input?.alumnosFinalizados ?? action.alumnosConcedidos;
                    if (input?.situacion === 'NO_EJECUTABLE') effectiveStudents = 0;

                    const computedMax = effectiveStudents * action.horas * action.moduloEconomico;
                    
                    const totalJustificado = result ? result.costeTotalJustificado : 0;
                    const totalPagado = input?.importePagado || 0;
                    const percentPaid = totalJustificado > 0 ? (totalPagado / totalJustificado) * 100 : 0;

                    return (
                        <tr key={action.id} className={`hover:bg-slate-50/80 transition-colors group ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                            {/* AF / Centro / Prof */}
                            <td className="px-4 py-4">
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-[10px] font-bold text-indigo-700 px-1.5 py-0.5 bg-indigo-50 rounded border border-indigo-100 shadow-sm">{action.codigoAccion}</span>
                                        <span className="text-xs font-semibold text-slate-800 line-clamp-1" title={action.denominacion}>{action.denominacion}</span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                        <div className="flex items-center gap-1" title="Centro/Escuela">
                                            <School className="w-3 h-3 text-slate-400" />
                                            <span className="truncate max-w-[100px]">{action.centro || '-'}</span>
                                        </div>
                                        <div className="flex items-center gap-1" title="Profesor">
                                            <User className="w-3 h-3 text-slate-400" />
                                            <span className="truncate max-w-[100px]">{action.profesor || '-'}</span>
                                        </div>
                                    </div>
                                </div>
                            </td>

                            {/* Fechas / Situación */}
                            <td className="px-4 py-4">
                                <div className="flex flex-col gap-2">
                                    <div>{renderSituacionBadge(input?.situacion)}</div>
                                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                        <Calendar className="w-3 h-3 text-slate-400" />
                                        <span className="font-medium text-slate-600">
                                            {/* Prioritize Real Date if edited, else original */}
                                            {input?.fechaInicioReal || action.fechaInicio || '--/--'} - {input?.fechaFinReal || action.fechaFin || '--/--'}
                                        </span>
                                    </div>
                                </div>
                            </td>

                            {/* Alumnos */}
                            <td className="px-4 py-4 text-center">
                                <div className="flex flex-col items-center justify-center">
                                    <div className="flex items-baseline gap-1 bg-slate-100 px-2 py-1 rounded-md">
                                        <span className={`text-sm font-bold ${effectiveStudents < action.alumnosConcedidos ? 'text-amber-600' : 'text-slate-800'}`}>
                                            {effectiveStudents}
                                        </span>
                                        <span className="text-[10px] text-slate-400">/ {action.alumnosConcedidos}</span>
                                    </div>
                                    {effectiveStudents < action.alumnosConcedidos && (
                                        <span className="text-[9px] text-amber-600 font-bold mt-1 bg-amber-50 px-1.5 py-0.5 rounded">Baja Alumnos</span>
                                    )}
                                </div>
                            </td>

                            {/* Costes Directos */}
                            <td className="px-4 py-4 text-right">
                                {result ? (
                                    <span className="text-xs font-medium text-slate-700 block bg-slate-100/50 px-2 py-1 rounded">
                                        {formatCurrency(result.totalCostesDirectos)}
                                    </span>
                                ) : <span className="text-slate-300 text-xs">-</span>}
                            </td>

                            {/* Costes Indirectos */}
                            <td className="px-4 py-4 text-right">
                                {result ? (
                                    <div className="flex flex-col items-end">
                                        <span className={`text-xs font-medium px-2 py-1 rounded ${result.estado.includes('AJUSTE') ? 'text-amber-700 bg-amber-50' : 'text-slate-700 bg-slate-100/50'}`}>
                                            {formatCurrency(result.costeIndirectoReconocido)}
                                        </span>
                                        {result.totalCostesIndirectosJustificados > result.limiteCostesIndirectos && (
                                            <span className="text-[9px] text-amber-500 line-through mt-0.5" title="Solicitado original">
                                                {formatCurrency(result.totalCostesIndirectosJustificados)}
                                            </span>
                                        )}
                                    </div>
                                ) : <span className="text-slate-300 text-xs">-</span>}
                            </td>

                            {/* Cómputo Total Justificable (Formula) */}
                            <td className="px-4 py-4 text-right bg-indigo-50/30 border-l border-indigo-100">
                                <div className="flex flex-col items-end">
                                    <span className="text-sm font-bold text-indigo-700" title={`Alumnos (${effectiveStudents}) x Horas (${action.horas}) x Módulo (${action.moduloEconomico})`}>
                                        {formatCurrency(computedMax)}
                                    </span>
                                    <span className="text-[9px] text-indigo-400 mt-0.5">
                                        {effectiveStudents} alum x {action.horas}h x {action.moduloEconomico}€
                                    </span>
                                </div>
                            </td>

                            {/* Estado Pagos */}
                            <td className="px-4 py-4 text-right bg-teal-50/20 border-l border-teal-100">
                                {result ? (
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs font-bold text-teal-700">{formatCurrency(totalPagado)}</span>
                                        {totalJustificado > 0 && (
                                            <div className="w-20 h-2 bg-gray-200 rounded-full mt-1.5 overflow-hidden shadow-inner">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-500 ${percentPaid >= 100 ? 'bg-teal-500' : 'bg-amber-400'}`} 
                                                    style={{ width: `${Math.min(100, percentPaid)}%` }}
                                                ></div>
                                            </div>
                                        )}
                                        {result.pendientePago > 0 && (
                                            <span className="text-[9px] text-amber-600 font-bold mt-1 bg-amber-50 px-1 rounded">Pend: {formatCurrency(result.pendientePago)}</span>
                                        )}
                                    </div>
                                ) : <span className="text-slate-300 text-xs">-</span>}
                            </td>

                            {/* Estado Eco */}
                            <td className="px-4 py-4 text-center">
                                {renderStatusBadge(result?.estado)}
                                {result && result.desviacion < 0 && (
                                    <div className="text-[10px] text-rose-600 font-bold mt-1 bg-rose-50 px-2 py-0.5 rounded-md inline-block">
                                        {formatCurrency(result.desviacion)}
                                    </div>
                                )}
                            </td>

                            {/* Acciones */}
                            <td className="px-4 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setEditingAction(action)} className="p-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200 shadow-sm transition-colors" title="Editar / Imputar"><Edit2 className="w-4 h-4" /></button>
                                    {result && input && (
                                        <button onClick={() => setAnalyzingAction({ action, input, result: result! })} className="p-1.5 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-md border border-purple-200 shadow-sm transition-colors" title="Consultar IA"><BrainCircuit className="w-4 h-4" /></button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 px-6 shadow-sm h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-2 rounded-lg text-white shadow-md shadow-indigo-200">
            <LayoutDashboard size={22} />
          </div>
          <div>
             <h1 className="text-lg font-bold text-slate-800 leading-none">Consultor FP€</h1>
             <span className="text-xs text-indigo-600 font-semibold tracking-wide">Gestión Experta de Subvenciones</span>
          </div>
        </div>
        
        {/* Navigation Tabs & Actions */}
        {validData.length > 0 && (
            <div className="flex items-center gap-6 h-full">
                 <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-[calc(100vw-360px)] py-3">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap flex items-center gap-2 ${
                            activeTab === 'dashboard' 
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                            : 'bg-white text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'
                        }`}
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                    </button>
                    {uniqueEmpresas.map(emp => (
                        <button
                            key={emp}
                            onClick={() => setActiveTab(emp)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap flex items-center gap-2 ${
                                activeTab === emp
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                                : 'bg-white text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'
                            }`}
                        >
                            <Building2 className="w-4 h-4" />
                            {emp}
                        </button>
                    ))}
                 </div>
                 
                 <div className="h-8 w-px bg-gray-200"></div>
                 
                 <div className="flex gap-2">
                    <button 
                        onClick={handleExportExcel}
                        className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex-shrink-0 border border-emerald-200 shadow-sm"
                        title="Descargar Informe Excel (.xlsx)"
                    >
                        <FileSpreadsheet className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={handleResetData}
                        className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex-shrink-0 border border-transparent hover:border-rose-200"
                        title="Borrar Base de Datos (Reiniciar)"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => setShowExitModal(true)}
                        className="flex items-center gap-2 px-3 py-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200 shadow-sm font-medium text-sm"
                        title="Salir y Guardar"
                    >
                        <LogOut className="w-4 h-4" /> Salir
                    </button>
                 </div>
            </div>
        )}
      </header>

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-6 space-y-8">
        {validData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 animate-in fade-in slide-in-from-bottom-4">
             <div className="max-w-md w-full text-center">
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
                    <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FileSpreadsheet className="w-10 h-10 text-indigo-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Comienza tu Justificación</h2>
                    <p className="text-slate-500 mb-8">Sube tu archivo CSV o Excel para comenzar el análisis financiero de tus expedientes de FP.</p>
                    <FileUpload onDataLoaded={handleDataLoaded} />
                </div>
             </div>
          </div>
        ) : (
          <>
            {/* --- DASHBOARD TAB --- */}
            {activeTab === 'dashboard' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    
                     {/* FILTER BAR FOR DASHBOARD */}
                     <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2 text-slate-500 text-sm font-bold uppercase tracking-wider">
                            <Filter className="w-4 h-4" />
                            <span>Filtros Globales:</span>
                        </div>
                        
                        {/* Company Filter */}
                        <div className="relative">
                            <select 
                                className="bg-gray-50 border border-gray-300 text-slate-700 text-sm rounded-md focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 pr-8 min-w-[200px]"
                                value={filterEmpresa}
                                onChange={(e) => {
                                    setFilterEmpresa(e.target.value);
                                    setFilterExpediente('ALL'); // Reset expediente when company changes
                                }}
                            >
                                <option value="ALL">Todas las Empresas</option>
                                {uniqueEmpresas.map(emp => (
                                    <option key={emp} value={emp}>{emp}</option>
                                ))}
                            </select>
                        </div>

                        {/* Expediente Filter */}
                        <div className="relative">
                             <select 
                                className="bg-gray-50 border border-gray-300 text-slate-700 text-sm rounded-md focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 pr-8 min-w-[200px]"
                                value={filterExpediente}
                                onChange={(e) => setFilterExpediente(e.target.value)}
                            >
                                <option value="ALL">Todos los Expedientes</option>
                                {availableExpedientes.map(exp => (
                                    <option key={exp} value={exp}>{exp}</option>
                                ))}
                            </select>
                        </div>

                        {/* Situation Filter */}
                        <div className="relative">
                             <select 
                                className="bg-gray-50 border border-gray-300 text-slate-700 text-sm rounded-md focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 pr-8"
                                value={filterSituacion}
                                onChange={(e) => setFilterSituacion(e.target.value)}
                            >
                                <option value="ALL">Todas las Situaciones</option>
                                <option value="PENDIENTE">Pendiente</option>
                                <option value="EJECUCION">En Ejecución</option>
                                <option value="FINALIZADO">Finalizado</option>
                                <option value="NO_EJECUTABLE">Anulado / No Ejec.</option>
                            </select>
                        </div>

                        {/* Text Search */}
                        <div className="relative flex-1 min-w-[200px]">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <Search className="w-4 h-4 text-gray-400" />
                            </div>
                            <input 
                                type="text" 
                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 p-2.5" 
                                placeholder="Buscar por Nombre o Código..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button 
                                    onClick={() => setSearchTerm('')}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                     </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-50 to-transparent rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100"><Landmark className="w-6 h-6" /></div>
                                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider bg-indigo-50/50 px-2 py-1 rounded">Presupuesto</span>
                                </div>
                                <h3 className="text-3xl font-bold text-slate-800 mb-1">{formatCurrency(dashboardStats.totalConcedido)}</h3>
                                <p className="text-sm text-slate-400 font-medium">Total Concedido (Filtrado)</p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                             <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-50 to-transparent rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100"><CheckCircle2 className="w-6 h-6" /></div>
                                    <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider bg-emerald-50/50 px-2 py-1 rounded">Ejecución</span>
                                </div>
                                <h3 className="text-3xl font-bold text-slate-800 mb-1">{formatCurrency(dashboardStats.totalReconocido)}</h3>
                                <div className="flex items-center gap-2">
                                     <div className="w-full bg-emerald-100 rounded-full h-1.5 flex-1 max-w-[100px]">
                                        <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${dashboardStats.totalFinanciableReal > 0 ? (dashboardStats.totalReconocido / dashboardStats.totalFinanciableReal) * 100 : 0}%` }}></div>
                                     </div>
                                     <span className="text-xs font-bold text-emerald-700">{dashboardStats.totalFinanciableReal > 0 ? ((dashboardStats.totalReconocido / dashboardStats.totalFinanciableReal) * 100).toFixed(1) : 0}%</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                             <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-50 to-transparent rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 border border-blue-100"><GraduationCap className="w-6 h-6" /></div>
                                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider bg-blue-50/50 px-2 py-1 rounded">Alumnos</span>
                                </div>
                                <h3 className="text-3xl font-bold text-slate-800 mb-1">{dashboardStats.alumnoRetentionRate.toFixed(1)}%</h3>
                                <p className="text-sm text-slate-400 font-medium">Tasa de Finalización</p>
                            </div>
                        </div>

                         <div className="bg-white p-6 rounded-2xl border border-violet-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                             <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-violet-50 to-transparent rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="p-2.5 bg-violet-50 rounded-xl text-violet-600 border border-violet-100"><FileSpreadsheet className="w-6 h-6" /></div>
                                    <span className="text-xs font-bold text-violet-400 uppercase tracking-wider bg-violet-50/50 px-2 py-1 rounded">Progreso</span>
                                </div>
                                <h3 className="text-3xl font-bold text-slate-800 mb-1">{dashboardStats.accionesJustificadas} <span className="text-lg font-medium text-slate-300">/ {dashboardStats.totalActions}</span></h3>
                                <p className="text-sm text-slate-400 font-medium">Acciones Justificadas</p>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Company Summary Table */}
                        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-indigo-500" /> Rendimiento por Empresa
                                </h3>
                                <span className="text-xs text-slate-500 font-medium">{Object.keys(dashboardStats.empresaStats).length} empresas mostradas</span>
                            </div>
                            <div className="overflow-x-auto flex-1">
                                <table className="min-w-full divide-y divide-gray-100">
                                    <thead>
                                        <tr className="bg-gray-50/30">
                                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Empresa</th>
                                            <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Expedientes</th>
                                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Concedido</th>
                                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Reconocido</th>
                                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">% Ejec.</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {Object.entries(dashboardStats.empresaStats).map(([name, stats]: [string, CompanyStats]) => (
                                            <tr key={name} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 text-sm font-semibold text-slate-700">{name}</td>
                                                <td className="px-6 py-4 text-center text-sm text-slate-500">
                                                    <span className="bg-slate-100 px-2 py-1 rounded-md font-medium">{stats.expedientes.size}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right text-sm text-slate-500">{formatCurrency(stats.concedido)}</td>
                                                <td className="px-6 py-4 text-right text-sm font-bold text-indigo-700">{formatCurrency(stats.reconocido)}</td>
                                                <td className="px-6 py-4 text-right text-sm text-slate-600">
                                                    <span className={`px-2 py-1 rounded font-bold text-xs ${stats.financiableReal > 0 && stats.reconocido/stats.financiableReal < 0.7 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                        {stats.financiableReal > 0 ? ((stats.reconocido / stats.financiableReal) * 100).toFixed(1) : 0}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {Object.keys(dashboardStats.empresaStats).length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-sm">
                                                    No hay datos que coincidan con los filtros seleccionados.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Chart */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col items-center justify-center">
                             <h3 className="text-sm font-bold text-slate-400 uppercase mb-6 self-start flex items-center gap-2">
                                <PieChart className="w-4 h-4" /> Distribución Global
                             </h3>
                             <div className="w-full h-[250px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie 
                                            data={chartData} 
                                            cx="50%" 
                                            cy="50%" 
                                            innerRadius={70} 
                                            outerRadius={90} 
                                            dataKey="value"
                                            paddingAngle={4}
                                            cornerRadius={6}
                                        >
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                            ))}
                                        </Pie>
                                        <Cell fill="#4F46E5" />
                                        <Cell fill="#F3F4F6" />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-3xl font-bold text-slate-800">
                                        {dashboardStats.totalFinanciableReal > 0 ? ((dashboardStats.totalReconocido / dashboardStats.totalFinanciableReal) * 100).toFixed(0) : 0}%
                                    </span>
                                    <span className="text-xs text-slate-400 font-medium uppercase mt-1">Recuperado</span>
                                </div>
                             </div>
                             <div className="flex w-full justify-between items-center mt-6 px-4">
                                <div className="text-left">
                                    <p className="text-xs text-slate-400 uppercase font-bold">Objetivo</p>
                                    <p className="text-lg font-bold text-slate-800">{formatCurrency(dashboardStats.totalFinanciableReal)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-indigo-400 uppercase font-bold">Conseguido</p>
                                    <p className="text-lg font-bold text-indigo-600">{formatCurrency(dashboardStats.totalReconocido)}</p>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- COMPANY TABS --- */}
            {activeTab !== 'dashboard' && (
                <div className="animate-in fade-in duration-300 space-y-8">
                    {/* COMPANY SUMMARY HEADER (Calculated on RAW data to show Big Picture) */}
                    {(() => {
                        // Raw Company Data
                        const companyData = validData.filter(d => d.empresa === activeTab);
                        const allExpedients = Array.from(new Set(companyData.map(d => d.expediente))).sort();

                        // -- FILTER LOGIC --
                        const filteredActions = companyData.filter(action => {
                            const input = inputs[action.id];
                            const status = input?.situacion || 'PENDIENTE';
                            
                            const matchExp = filterExpediente === 'ALL' || action.expediente === filterExpediente;
                            const matchSit = filterSituacion === 'ALL' || status === filterSituacion;
                            const matchText = searchTerm === '' || 
                                              action.denominacion.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                              action.codigoAccion.toLowerCase().includes(searchTerm.toLowerCase());
                            return matchExp && matchSit && matchText;
                        });

                        const visibleExpedients = Array.from(new Set(filteredActions.map(d => d.expediente))).sort();

                        // Summary Totals (Based on RAW data for the header)
                        const companyTotals = companyData.reduce((acc, action) => {
                             const input = inputs[action.id];
                             const result = input ? calculateJustification(action, input) : null;
                             
                             acc.concedido += action.importeMaximoConcedido;
                             acc.justificado += result ? result.totalCostesReconocidos : 0;
                             
                             acc.pagado += input ? (input.importePagado || 0) : 0;
                             acc.pendiente += result ? result.pendientePago : 0;

                             acc.alumnosConc += action.alumnosConcedidos;
                             // Correctly count finalized students (if status is NO_EJECUTABLE, count is 0)
                             let finalStudents = action.alumnosConcedidos;
                             if (input) {
                                 if (input.situacion === 'NO_EJECUTABLE') {
                                     finalStudents = 0;
                                 } else {
                                     finalStudents = input.alumnosFinalizados;
                                 }
                             }
                             acc.alumnosFin += finalStudents;

                             return acc;
                        }, {
                            concedido: 0,
                            justificado: 0,
                            pagado: 0,
                            pendiente: 0,
                            alumnosConc: 0,
                            alumnosFin: 0
                        });
                        
                        const retention = companyTotals.alumnosConc > 0 
                            ? (companyTotals.alumnosFin / companyTotals.alumnosConc) * 100 
                            : 0;

                        const totalAnticipo = companyTotals.concedido * 0.70;
                        const totalLiquidacion = companyTotals.justificado - totalAnticipo;
                        const saldoCaja = totalAnticipo - companyTotals.pagado;

                        return (
                          <>
                            {/* NEW: Company Aggregate Summary Panel */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-1 mb-6">
                                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-xl flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                                            <Building2 className="w-7 h-7" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-800">{activeTab}</h2>
                                            <p className="text-sm text-slate-500">Resumen Ejecutivo y Estado de Situación</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="text-right px-4 border-r border-gray-200">
                                            <p className="text-xs text-slate-400 font-bold uppercase">Expedientes Activos</p>
                                            <p className="text-xl font-bold text-slate-800">{allExpedients.length}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-400 font-bold uppercase">Acciones Totales</p>
                                            <p className="text-xl font-bold text-slate-800">{companyData.length}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                                    {/* Column 1: Economic Status */}
                                    <div className="p-6 bg-gradient-to-b from-white to-gray-50/30">
                                        <h4 className="text-xs font-bold text-indigo-900 uppercase flex items-center gap-2 mb-4 bg-indigo-50 w-fit px-2 py-1 rounded">
                                            <BarChart3 className="w-3.5 h-3.5" /> Ejecución Eco
                                        </h4>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-end">
                                                <span className="text-sm text-slate-500">Concedido</span>
                                                <span className="font-bold text-slate-800">{formatCurrency(companyTotals.concedido)}</span>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <span className="text-sm text-slate-500">Justificado</span>
                                                <span className="font-bold text-indigo-700 text-lg">{formatCurrency(companyTotals.justificado)}</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div 
                                                    className="bg-indigo-600 h-2 rounded-full transition-all duration-700" 
                                                    style={{ width: `${Math.min(100, (companyTotals.justificado / companyTotals.concedido) * 100)}%` }}
                                                ></div>
                                            </div>
                                            <div className="text-xs font-semibold text-right text-indigo-600">
                                                {((companyTotals.justificado / companyTotals.concedido) * 100).toFixed(1)}% Ejecutado
                                            </div>
                                        </div>
                                    </div>

                                    {/* Column 2: Administration Settlement */}
                                    <div className="p-6 bg-gradient-to-b from-white to-violet-50/10">
                                        <h4 className="text-xs font-bold text-violet-900 uppercase flex items-center gap-2 mb-4 bg-violet-50 w-fit px-2 py-1 rounded">
                                            <Landmark className="w-3.5 h-3.5" /> Liquidación Admin
                                        </h4>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <p className="text-xs font-semibold text-slate-500">Anticipo (70%)</p>
                                                <p className="text-sm font-bold text-blue-600">{formatCurrency(totalAnticipo)}</p>
                                            </div>
                                            <div className={`p-3 rounded-lg border ${totalLiquidacion >= 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-orange-50 border-orange-100'}`}>
                                                 <div className="flex justify-between items-center mb-1">
                                                    <span className={`text-[10px] font-bold uppercase ${totalLiquidacion >= 0 ? 'text-indigo-800' : 'text-orange-800'}`}>
                                                        {totalLiquidacion >= 0 ? 'A Cobrar' : 'A Devolver'}
                                                    </span>
                                                    {totalLiquidacion >= 0 ? <TrendingUp className="w-4 h-4 text-indigo-600" /> : <TrendingDown className="w-4 h-4 text-orange-600" />}
                                                 </div>
                                                 <p className={`text-xl font-bold tracking-tight ${totalLiquidacion >= 0 ? 'text-indigo-700' : 'text-orange-700'}`}>
                                                    {formatCurrency(Math.abs(totalLiquidacion))}
                                                 </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Column 3: Treasury Status */}
                                    <div className="p-6 bg-gradient-to-b from-white to-emerald-50/10">
                                        <h4 className="text-xs font-bold text-emerald-900 uppercase flex items-center gap-2 mb-4 bg-emerald-50 w-fit px-2 py-1 rounded">
                                            <Wallet className="w-3.5 h-3.5" /> Tesorería Real
                                        </h4>
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Pagado</p>
                                                    <p className="text-sm font-bold text-teal-700">{formatCurrency(companyTotals.pagado)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Deuda Pend.</p>
                                                    <p className={`text-sm font-bold ${companyTotals.pendiente > 0 ? 'text-rose-600' : 'text-gray-400'}`}>
                                                        {formatCurrency(companyTotals.pendiente)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="pt-3 border-t border-gray-100">
                                                <div className="flex justify-between items-center mb-1">
                                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Caja (Liquidez)</p>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${saldoCaja >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                        {saldoCaja >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                        {saldoCaja >= 0 ? 'Positivo' : 'Déficit'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <PiggyBank className={`w-6 h-6 ${saldoCaja >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
                                                    <p className={`text-2xl font-bold ${saldoCaja >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {formatCurrency(saldoCaja)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Column 4: Students Status */}
                                    <div className="p-6 bg-gradient-to-b from-white to-blue-50/10">
                                        <h4 className="text-xs font-bold text-blue-900 uppercase flex items-center gap-2 mb-4 bg-blue-50 w-fit px-2 py-1 rounded">
                                            <Users className="w-3.5 h-3.5" /> Impacto Alumnos
                                        </h4>
                                        <div className="space-y-4">
                                            <div className="flex justify-between">
                                                 <div>
                                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Concedidos</p>
                                                    <p className="text-xl font-bold text-slate-800">{companyTotals.alumnosConc}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Finalizados</p>
                                                    <p className="text-xl font-bold text-blue-600">{companyTotals.alumnosFin}</p>
                                                </div>
                                            </div>
                                            
                                            <div className={`p-2 rounded flex items-center justify-between text-xs font-bold ${retention < 85 ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                                                <span>Tasa Retención</span>
                                                <span>{retention.toFixed(1)}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* FILTER BAR */}
                            <div className="bg-gray-100 rounded-lg p-3 mb-6 flex flex-wrap items-center gap-4 shadow-inner border border-gray-200">
                                <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold">
                                    <Filter className="w-4 h-4" />
                                    <span>Filtrar Vista:</span>
                                </div>
                                
                                {/* Company Filter (Switches Tab) */}
                                <select 
                                    className="bg-white border border-gray-300 text-slate-700 text-sm rounded-md focus:ring-indigo-500 focus:border-indigo-500 block p-2"
                                    value={activeTab}
                                    onChange={(e) => setActiveTab(e.target.value)}
                                >
                                    {uniqueEmpresas.map(emp => (
                                        <option key={emp} value={emp}>{emp}</option>
                                    ))}
                                </select>

                                {/* Expediente Filter */}
                                <select 
                                    className="bg-white border border-gray-300 text-slate-700 text-sm rounded-md focus:ring-indigo-500 focus:border-indigo-500 block p-2 min-w-[150px]"
                                    value={filterExpediente}
                                    onChange={(e) => setFilterExpediente(e.target.value)}
                                >
                                    <option value="ALL">Todos los Expedientes</option>
                                    {allExpedients.map(exp => (
                                        <option key={exp} value={exp}>{exp}</option>
                                    ))}
                                </select>

                                {/* Situation Filter */}
                                <select 
                                    className="bg-white border border-gray-300 text-slate-700 text-sm rounded-md focus:ring-indigo-500 focus:border-indigo-500 block p-2"
                                    value={filterSituacion}
                                    onChange={(e) => setFilterSituacion(e.target.value)}
                                >
                                    <option value="ALL">Todas las Situaciones</option>
                                    <option value="PENDIENTE">Pendiente</option>
                                    <option value="EJECUCION">En Ejecución</option>
                                    <option value="FINALIZADO">Finalizado</option>
                                    <option value="NO_EJECUTABLE">Anulado / No Ejec.</option>
                                </select>

                                {/* Text Search */}
                                <div className="relative flex-1 min-w-[200px]">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                        <Search className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <input 
                                        type="text" 
                                        className="bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 p-2" 
                                        placeholder="Buscar por Nombre o Código..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    {searchTerm && (
                                        <button 
                                            onClick={() => setSearchTerm('')}
                                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Expedientes Loop (Filtered) */}
                            <div className="space-y-6">
                            {visibleExpedients.length === 0 ? (
                                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                                    <p className="text-slate-400">No se encontraron acciones formativas con los filtros actuales.</p>
                                </div>
                            ) : (
                                visibleExpedients.map((exp: string) => {
                                    // Filter actions within this Expediente based on global filters
                                    const expData = filteredActions.filter(d => d.expediente === exp);
                                    
                                    // Recalculate Totals for the header (based on FILTERED visible actions, or all for this exp?)
                                    // Usually headers show the context of the displayed items.
                                    
                                    const totalConcedido = expData.reduce((acc, curr) => acc + curr.importeMaximoConcedido, 0);
                                    // Note: If we filter, Concedido might drop visually, which is correct for "What am I looking at?"
                                    
                                    const anticipo = totalConcedido * 0.70;

                                    let totalReconocido = 0;
                                    let totalPagado = 0;
                                    let totalPendientePago = 0;

                                    expData.forEach(d => {
                                        const input = inputs[d.id];
                                        if(input) {
                                            const res = calculateJustification(d, input);
                                            totalReconocido += res.totalCostesReconocidos;
                                            totalPagado += input.importePagado || 0;
                                            totalPendientePago += res.pendientePago;
                                        }
                                    });

                                    const saldoTesoreria = anticipo - totalPagado;
                                    const liquidacionAdmin = totalReconocido - anticipo;
                                    const isCollapsed = collapsedExpedientes.has(exp);

                                    return (
                                        <div key={exp} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300">
                                            <div 
                                                className="bg-white p-1 cursor-pointer hover:bg-slate-50 transition-colors"
                                                onClick={() => toggleExpediente(exp)}
                                            >
                                                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    <div className="flex items-center gap-4">
                                                        <button className={`p-2 rounded-full border transition-all ${isCollapsed ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-indigo-50 text-indigo-600 border-indigo-200'}`}>
                                                            {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                                                        </button>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <FileText className="w-4 h-4 text-slate-400" />
                                                                <h2 className="text-lg font-bold text-slate-800">{exp}</h2>
                                                            </div>
                                                            <p className="text-xs text-slate-400 mt-0.5 ml-6">Expediente Oficial</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                         <div className="text-right hidden sm:block">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Total Concedido</p>
                                                            <p className="text-sm font-bold text-slate-700">{formatCurrency(totalConcedido)}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[10px] font-bold text-indigo-400 uppercase">Justificado</p>
                                                            <p className="text-xl font-bold text-indigo-700">{formatCurrency(totalReconocido)}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Financial Plan Cards */}
                                                <div className="px-4 pb-4">
                                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                                        {/* 1. Concedido */}
                                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col relative overflow-hidden">
                                                           <div className="absolute right-0 top-0 p-1 opacity-10"><Landmark className="w-12 h-12" /></div>
                                                           <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">Concedido</span>
                                                           <div className="text-base font-bold text-slate-700">{formatCurrency(totalConcedido)}</div>
                                                           <div className="w-full h-1 bg-slate-200 mt-auto rounded-full"></div>
                                                        </div>

                                                        {/* 2. Anticipo */}
                                                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex flex-col relative overflow-hidden">
                                                            <div className="absolute right-0 top-0 p-1 opacity-10"><Coins className="w-12 h-12 text-blue-600" /></div>
                                                           <span className="text-[10px] font-bold text-blue-500 uppercase mb-1">Anticipo (70%)</span>
                                                           <div className="text-base font-bold text-blue-700">{formatCurrency(anticipo)}</div>
                                                           <div className="w-full h-1 bg-blue-200 mt-auto rounded-full"></div>
                                                        </div>

                                                        {/* 3. Liquidación Admin */}
                                                        <div className={`p-3 rounded-lg border flex flex-col relative overflow-hidden ${liquidacionAdmin >= 0 ? 'bg-violet-50 border-violet-100' : 'bg-orange-50 border-orange-100'}`}>
                                                            <div className="absolute right-0 top-0 p-1 opacity-10">
                                                                {liquidacionAdmin >= 0 ? <TrendingUp className="w-12 h-12 text-violet-600"/> : <TrendingDown className="w-12 h-12 text-orange-600"/>}
                                                            </div>
                                                           <span className={`text-[10px] font-bold uppercase mb-1 ${liquidacionAdmin >= 0 ? 'text-violet-600' : 'text-orange-600'}`}>
                                                              {liquidacionAdmin >= 0 ? 'A Cobrar (Liq.)' : 'A Devolver'}
                                                           </span>
                                                           <div className={`text-base font-bold ${liquidacionAdmin >= 0 ? 'text-violet-700' : 'text-orange-700'}`}>
                                                              {formatCurrency(Math.abs(liquidacionAdmin))}
                                                           </div>
                                                           <div className={`w-full h-1 mt-auto rounded-full ${liquidacionAdmin >= 0 ? 'bg-violet-200' : 'bg-orange-200'}`}></div>
                                                        </div>

                                                        {/* 4. Pagos Realizados */}
                                                        <div className="bg-teal-50 p-3 rounded-lg border border-teal-100 flex flex-col relative overflow-hidden">
                                                            <div className="absolute right-0 top-0 p-1 opacity-10"><Banknote className="w-12 h-12 text-teal-600" /></div>
                                                            <span className="text-[10px] font-bold text-teal-600 uppercase mb-1">Pagado</span>
                                                            <div className="text-base font-bold text-teal-800">{formatCurrency(totalPagado)}</div>
                                                            <div className="w-full h-1 bg-teal-200 mt-auto rounded-full mb-1"></div>
                                                            {totalPendientePago > 0 && <div className="text-[9px] text-amber-600 font-bold bg-white/50 px-1 rounded w-fit">Pend: {formatCurrency(totalPendientePago)}</div>}
                                                        </div>

                                                        {/* 5. Saldo Tesorería */}
                                                        <div className={`p-3 rounded-lg border flex flex-col relative overflow-hidden ${saldoTesoreria >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                                                             <div className="absolute right-0 top-0 p-1 opacity-10"><PiggyBank className={`w-12 h-12 ${saldoTesoreria >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} /></div>
                                                             <span className={`text-[10px] font-bold uppercase mb-1 ${saldoTesoreria >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>Caja (Tesorería)</span>
                                                             <div className={`text-base font-bold ${saldoTesoreria >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatCurrency(saldoTesoreria)}</div>
                                                             <div className={`w-full h-1 mt-auto rounded-full ${saldoTesoreria >= 0 ? 'bg-emerald-200' : 'bg-rose-200'}`}></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'}`}>
                                               {!isCollapsed && renderTable(expData)}
                                            </div>
                                            
                                            {isCollapsed && (
                                                <div 
                                                    className="bg-gray-50 p-2 text-center text-xs text-slate-400 font-medium cursor-pointer hover:text-indigo-600 hover:bg-gray-100 border-t border-gray-100"
                                                    onClick={() => toggleExpediente(exp)}
                                                >
                                                    Mostrar detalle de {expData.length} acciones formativas...
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                            </div>
                          </>
                        );
                    })()}
                </div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      {editingAction && (
        <CostEditor 
          action={editingAction}
          existingInput={inputs[editingAction.id]}
          onSave={handleSaveCost}
          onClose={() => setEditingAction(null)}
        />
      )}

      {analyzingAction && (
        <AnalysisModal 
          action={analyzingAction.action}
          input={analyzingAction.input}
          result={analyzingAction.result}
          onClose={() => setAnalyzingAction(null)}
        />
      )}

      {/* SAFE EXIT MODAL */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 text-center">
                    <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <HardDriveDownload className="w-8 h-8 text-amber-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">¿Quieres guardar antes de salir?</h3>
                    <p className="text-slate-500 mb-6">
                        Si cierras ahora sin exportar, tus datos se mantendrán en este navegador, pero te recomendamos descargar una copia de seguridad en Excel por seguridad.
                    </p>
                    
                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={handleExitAndDownload}
                            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-md flex items-center justify-center gap-2 transition-colors"
                        >
                            <Download className="w-5 h-5" /> Sí, Descargar Copia Excel
                        </button>
                        <button 
                            onClick={() => { setShowExitModal(false); alert("Has cerrado sesión. Puedes cerrar la pestaña del navegador."); }}
                            className="w-full py-3 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-slate-700 rounded-lg font-medium transition-colors"
                        >
                            No, solo cerrar
                        </button>
                    </div>
                    
                    <button onClick={() => setShowExitModal(false)} className="mt-4 text-sm text-slate-400 hover:text-slate-600 underline">
                        Cancelar y volver
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default App;