// Data model representing a row from the CSV
export interface TrainingAction {
  id: string; // generated or from Nº AF
  expediente: string;
  empresa: string;
  centro: string;
  codigoAccion: string;
  denominacion: string;
  horas: number;
  alumnosConcedidos: number;
  moduloEconomico: number;
  importeMaximoConcedido: number;
  // New fields requested
  fechaInicio?: string;
  fechaFin?: string;
  profesor?: string;
}

export type SituacionAccion = 'FINALIZADO' | 'EJECUCION' | 'PENDIENTE' | 'NO_EJECUTABLE';

// User input for a specific justification
export interface JustificationInput {
  actionId: string;
  situacion: SituacionAccion; // New field
  fechaInicioReal?: string; // NEW: Actual Start Date
  fechaFinReal?: string; // NEW: Actual End Date
  alumnosFinalizados: number;
  costesDirectos: {
    personalFormador: number; // A1
    materialDidactico: number; // A2
    mediosDidacticos: number; // A3
    alquilerAulas: number; // A4
    alquilerEquipos: number; // A5
    seguros: number; // A6
    publicidad: number; // A7
    captacion: number; // A8
    otros: number; // A9 NEW
  };
  costesIndirectos: number; // B9
  importePagado: number; // NEW: Amount actually paid for Treasury calculation
  notas?: string; // NEW: Free text notes field
}

// Calculated results for display and validation
export interface JustificationResult {
  importeFinanciableReal: number;
  totalCostesDirectos: number;
  totalCostesIndirectosJustificados: number;
  limiteCostesIndirectos: number; // The 10% threshold calculation
  costeIndirectoReconocido: number;
  totalCostesReconocidos: number;
  costeTotalJustificado: number; // Direct + Indirect (Input)
  desviacion: number; // Positive means under budget, Negative means exceeded
  estado: 'OK' | 'AJUSTE_INDIRECTOS' | 'EXCEDIDO' | 'AJUSTE_Y_EXCEDIDO';
  pendientePago: number; // Justified - Paid
}

export const CATEGORIAS_COSTES = [
  { key: 'personalFormador', label: 'A1. Personal Formador' },
  { key: 'materialDidactico', label: 'A2. Material Didáctico' },
  { key: 'mediosDidacticos', label: 'A3. Medios/Amortización' },
  { key: 'alquilerAulas', label: 'A4. Alquiler Aulas' },
  { key: 'alquilerEquipos', label: 'A5. Alquiler Equipos' },
  { key: 'seguros', label: 'A6. Seguros' },
  { key: 'publicidad', label: 'A7. Publicidad y Difusión' },
  { key: 'captacion', label: 'A8. Captación y Selección' },
  { key: 'otros', label: 'A9. Otros Costes Directos' },
] as const;