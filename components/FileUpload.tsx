import React, { useCallback } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { TrainingAction, JustificationInput, SituacionAccion } from '../types';
import { parseCurrency } from '../utils/logic';
import * as XLSX from 'xlsx';

interface FileUploadProps {
  onDataLoaded: (data: TrainingAction[], inputs?: Record<string, JustificationInput>) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded }) => {
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    const reader = new FileReader();

    if (isExcel) {
        // --- EXCEL PARSING (Support for Re-importing the Exported File) ---
        reader.onload = (e) => {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            const parsedActions: TrainingAction[] = [];
            const parsedInputs: Record<string, JustificationInput> = {};

            jsonData.forEach((row: any, idx: number) => {
                // Determine if this is a raw database or a re-import of our own export
                // Our export uses specific keys like "Nº Acción", "A1. Personal", etc.
                
                // Map fields based on Export Headers (App.tsx) or common headers
                const id = row['ID'] || `IMP-${idx}`; // Ideally we export ID, if not generate one
                const expediente = row['Expediente'] || row['EXPTE'];
                const empresa = row['Empresa'] || row['EMPRESA'];
                
                // Skip invalid rows
                if (!empresa || empresa === 'ALUM.' || empresa === 'EMPRESA') return;

                const action: TrainingAction = {
                    id: id,
                    expediente: expediente,
                    empresa: empresa,
                    centro: row['Centro'] || row['CENTRO'] || '',
                    codigoAccion: row['Nº Acción'] || row['AF'] || row['CODIGO'] || '',
                    denominacion: row['Denominación'] || row['DENOMINACION'] || '',
                    horas: parseFloat(row['Horas']) || 0,
                    alumnosConcedidos: parseFloat(row['Alumnos Concedidos']) || parseFloat(row['ALUM']) || 0,
                    moduloEconomico: parseFloat(row['Módulo (€/h)']) || parseFloat(row['MODULO']) || 0,
                    importeMaximoConcedido: parseFloat(row['Importe Concedido']) || parseFloat(row['IMPORTE']) || 0,
                    fechaInicio: row['Fecha Inicio'] || row['F. INICIO'],
                    fechaFin: row['Fecha Fin'] || row['F. FIN'],
                    profesor: row['Profesor'] || row['PROFESOR']
                };
                
                // Generate a consistent ID if not provided, based on Exp + AF to allow merging
                // This ensures re-imports map correctly if the ID wasn't explicitly in the excel
                if (!row['ID'] && action.expediente && action.codigoAccion) {
                    action.id = `${action.expediente}-${action.codigoAccion}`.replace(/\s+/g, '');
                }

                parsedActions.push(action);

                // --- Restore Justification Inputs (if columns exist) ---
                // We check for "A1. Personal" or "Situación" to see if this row has justification data
                if (row['Situación'] || row['A1. Personal'] !== undefined) {
                    const situacion = (row['Situación'] as SituacionAccion) || 'PENDIENTE';
                    const alumnosFinalizados = row['Alumnos Finalizados'] !== undefined ? parseFloat(row['Alumnos Finalizados']) : action.alumnosConcedidos;
                    
                    // Only create input if there is meaningful data or explicit status change
                    const input: JustificationInput = {
                        actionId: action.id,
                        situacion: situacion,
                        alumnosFinalizados: isNaN(alumnosFinalizados) ? action.alumnosConcedidos : alumnosFinalizados,
                        fechaInicioReal: row['Fecha Inicio Real'], // Restore correct dates if edited
                        fechaFinReal: row['Fecha Fin Real'],
                        costesDirectos: {
                            personalFormador: parseFloat(row['A1. Personal']) || 0,
                            materialDidactico: parseFloat(row['A2. Material Didáctico']) || 0,
                            mediosDidacticos: parseFloat(row['A3. Medios/Amortización']) || 0,
                            alquilerAulas: parseFloat(row['A4. Alquiler Aulas']) || 0,
                            alquilerEquipos: parseFloat(row['A5. Alquiler Equipos']) || 0,
                            seguros: parseFloat(row['A6. Seguros']) || 0,
                            publicidad: parseFloat(row['A7. Publicidad']) || 0,
                            captacion: parseFloat(row['A8. Captación']) || 0,
                            otros: parseFloat(row['A9. Otros Costes Directos']) || 0,
                        },
                        costesIndirectos: parseFloat(row['B9. Indirectos Justificados']) || 0,
                        importePagado: parseFloat(row['Importe Pagado']) || 0, // Restore payment data
                        notas: row['Notas'] || '' // Restore notes
                    };
                    parsedInputs[action.id] = input;
                }
            });

            onDataLoaded(parsedActions, parsedInputs);
        };
        reader.readAsArrayBuffer(file);

    } else {
        // --- CSV PARSING (Original Logic) ---
        reader.onload = (e) => {
          const text = e.target?.result as string;
          const lines = text.split('\n');
          const headers = lines[0].split(';').map(h => h.trim().toUpperCase());
          
          const parsedData: TrainingAction[] = lines.slice(1).filter(l => l.trim().length > 0).map((line, idx) => {
            const cols = line.split(';'); 
            const getVal = (idx: number) => cols[idx]?.trim().replace(/"/g, '') || '';
    
            // Helper to find index by header name
            const findCol = (searchTerms: string[], defaultIdx: number) => {
               const idx = headers.findIndex(h => searchTerms.some(term => h.includes(term)));
               return idx >= 0 ? idx : defaultIdx;
            };

            const expediente = getVal(findCol(['EXPTE'], 1));
            const codigo = getVal(findCol(['AF', 'CODIGO'], 4));
    
            return {
              // Generate ID consistent with Excel import logic for stability
              id: (expediente && codigo) ? `${expediente}-${codigo}`.replace(/\s+/g, '') : `GEN-${idx}`,
              expediente: expediente,
              empresa: getVal(findCol(['EMPRESA'], 2)),
              centro: getVal(findCol(['CENTRO', 'ESCUELA'], 3)),
              codigoAccion: codigo, 
              denominacion: getVal(findCol(['DENOMINACION', 'PROGRAMA'], 5)), 
              horas: parseCurrency(getVal(findCol(['HORAS'], 6))), 
              alumnosConcedidos: parseCurrency(getVal(findCol(['ALUM'], 7))), 
              moduloEconomico: parseCurrency(getVal(findCol(['Mod', 'MODULO'], 8))), 
              importeMaximoConcedido: parseCurrency(getVal(findCol(['IMPORTE'], 9))),
              fechaInicio: getVal(findCol(['F. INICIO', 'FECHA INICIO', 'INICIO'], 10)),
              fechaFin: getVal(findCol(['F. FIN', 'FECHA FIN', 'FIN'], 11)),
              profesor: getVal(findCol(['PROFESOR', 'DOCENTE', 'FORMADOR'], 12))
            };
          })
          .filter(d => {
             const emp = d.empresa?.toUpperCase();
             return emp && emp !== 'ALUM.' && emp !== 'ALUM' && emp !== 'EMPRESA';
          });
    
          onDataLoaded(parsedData); // No inputs parsed from basic CSV
        };
        reader.readAsText(file);
    }

  }, [onDataLoaded]);

  return (
    <div className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center hover:bg-slate-50 transition-colors bg-white">
      <input 
        type="file" 
        accept=".csv, .xlsx, .xls" 
        onChange={handleFileUpload} 
        className="hidden" 
        id="csv-upload"
      />
      <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center gap-4">
        <div className="bg-blue-100 p-4 rounded-full">
          <FileSpreadsheet className="w-8 h-8 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Cargar Archivo</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
            Admite <strong>CSV Original</strong> o el <strong>Excel de Informe (.xlsx)</strong> exportado por esta plataforma (para restaurar copia de seguridad).
          </p>
        </div>
        <div className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition shadow-sm font-medium">
          Seleccionar CSV o Excel
        </div>
      </label>
    </div>
  );
};