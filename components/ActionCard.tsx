import React from 'react';
import { Edit2, BrainCircuit } from 'lucide-react';
import { TrainingAction, JustificationInput, JustificationResult } from '../types';
import { calculateJustification, formatCurrency } from '../utils/logic';

interface ActionCardProps {
  action: TrainingAction;
  input?: JustificationInput;
  onEdit: (action: TrainingAction) => void;
  onAnalyze: (action: TrainingAction, input: JustificationInput, result: JustificationResult) => void;
}

export const ActionCard: React.FC<ActionCardProps> = ({ action, input, onEdit, onAnalyze }) => {
  let result: JustificationResult | null = null;
  if (input) {
    result = calculateJustification(action, input);
  }

  const getStatusColor = (status: JustificationResult['estado']) => {
    switch(status) {
      case 'OK': return 'text-green-700 bg-green-50 border-green-200';
      case 'AJUSTE_INDIRECTOS': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'EXCEDIDO': return 'text-red-700 bg-red-50 border-red-200';
      case 'AJUSTE_Y_EXCEDIDO': return 'text-red-800 bg-red-100 border-red-300';
      default: return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  const statusInfo = result ? getStatusColor(result.estado) : 'bg-white border-gray-200';

  return (
    <div className={`border rounded-lg p-4 shadow-sm transition hover:shadow-md flex flex-col h-full ${input ? 'border-l-4' : ''} ${result ? statusInfo.split(' ')[2].replace('border', 'border-l') : ''}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">{action.expediente}</div>
          <h3 className="font-semibold text-lg text-slate-800 leading-tight line-clamp-2" title={action.denominacion}>{action.denominacion}</h3>
          <div className="text-sm text-slate-500 mt-1 flex gap-2">
            <span>AF: {action.codigoAccion}</span>
          </div>
        </div>
        {result && (
            <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase text-center min-w-[80px] ${statusInfo}`}>
                {result.estado.replace(/_/g, ' ')}
            </div>
        )}
      </div>

      <div className="flex-1">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4 bg-slate-50 p-2 rounded border border-slate-100">
            {result ? (
                <>
                    <div>
                        <span className="block text-[10px] text-slate-500 uppercase font-semibold">Max. Financiable (Real)</span>
                        <span className="font-medium text-slate-700">{formatCurrency(result.importeFinanciableReal)}</span>
                    </div>
                     <div>
                        <span className="block text-[10px] text-slate-500 uppercase font-semibold">Total Reconocido</span>
                        <span className="font-bold text-indigo-700">{formatCurrency(result.totalCostesReconocidos)}</span>
                    </div>
                    <div className="col-span-2 border-t border-slate-200 pt-2 mt-1 flex justify-between items-center">
                        <span className="text-xs text-slate-500">Desviación:</span>
                        <span className={`font-mono font-bold ${result.desviacion < -0.01 ? 'text-red-600' : 'text-green-600'}`}>
                            {result.desviacion > 0 ? '+' : ''}{formatCurrency(result.desviacion)}
                        </span>
                    </div>
                </>
            ) : (
                <>
                     <div className="col-span-2">
                        <span className="block text-[10px] text-slate-500 uppercase font-semibold">Concedido Inicial</span>
                        <span className="font-medium text-slate-700">{formatCurrency(action.importeMaximoConcedido)}</span>
                    </div>
                    <div className="col-span-2 text-xs text-slate-400 mt-1">
                        Pendiente de justificación
                    </div>
                </>
            )}
        </div>
      </div>

      <div className="flex gap-2 mt-auto">
        <button 
          onClick={() => onEdit(action)}
          className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 py-2 px-3 rounded hover:bg-slate-50 text-sm font-medium transition-colors"
        >
          <Edit2 className="w-4 h-4" />
          {input ? 'Editar' : 'Imputar'}
        </button>
        {input && result && (
           <button
             onClick={() => onAnalyze(action, input, result!)}
             className="flex items-center justify-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 py-2 px-3 rounded hover:bg-indigo-100 transition-colors"
             title="Informe Consultor IA"
           >
             <BrainCircuit className="w-4 h-4" />
           </button>
        )}
      </div>
    </div>
  );
};