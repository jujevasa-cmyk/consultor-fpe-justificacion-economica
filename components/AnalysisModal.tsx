import React, { useState, useEffect } from 'react';
import { X, Bot, RefreshCw } from 'lucide-react';
import { TrainingAction, JustificationInput, JustificationResult } from '../types';
import { generateConsultantReport } from '../services/geminiService';

interface AnalysisModalProps {
  action: TrainingAction;
  input: JustificationInput;
  result: JustificationResult;
  onClose: () => void;
}

export const AnalysisModal: React.FC<AnalysisModalProps> = ({ action, input, result, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<string>("");

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      const text = await generateConsultantReport(action, input, result);
      setReport(text);
      setLoading(false);
    };
    fetchReport();
  }, [action, input, result]);

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6" />
            <h2 className="text-lg font-bold">Consultor IA - Informe de Justificación</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 min-h-[300px]">
           {loading ? (
             <div className="flex flex-col items-center justify-center h-64 gap-4 text-indigo-600">
                <RefreshCw className="w-10 h-10 animate-spin" />
                <p className="font-medium">Analizando datos y normativas...</p>
             </div>
           ) : (
             <div className="prose prose-sm max-w-none text-slate-700">
                <p className="whitespace-pre-line leading-relaxed">{report}</p>
             </div>
           )}
        </div>

        <div className="p-4 bg-gray-50 border-t text-right">
           <button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
             Cerrar Informe
           </button>
        </div>
      </div>
    </div>
  );
};