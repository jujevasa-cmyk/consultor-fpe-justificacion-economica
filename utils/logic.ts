import { TrainingAction, JustificationInput, JustificationResult } from '../types';

export const parseCurrency = (val: string): number => {
  if (!val) return 0;
  // Remove currency symbols, handle European format (1.000,00) -> (1000.00)
  let clean = val.replace(/[€\s]/g, '');
  if (clean.includes('.') && clean.includes(',')) {
     clean = clean.replace('.', '').replace(',', '.');
  } else if (clean.includes(',')) {
    clean = clean.replace(',', '.');
  }
  return parseFloat(clean) || 0;
};

export const calculateJustification = (
  action: TrainingAction,
  input: JustificationInput
): JustificationResult => {
  // 1. Calculate Max Financiable Real
  // RULE: If status is NO_EJECUTABLE, students must be treated as 0 for financing purposes.
  let effectiveStudents = input.alumnosFinalizados;
  if (input.situacion === 'NO_EJECUTABLE') {
    effectiveStudents = 0;
  }

  // IMPORTE FINANCIABLE REAL = HORAS x Alumnos Finalizados x Mod/€
  const importeFinanciableReal = action.horas * effectiveStudents * action.moduloEconomico;

  // 2. Sum Direct Costs (A1-A9)
  const totalCostesDirectos = Object.values(input.costesDirectos).reduce((acc, curr) => acc + curr, 0);

  // 3. Indirect Costs Logic (The 10% Rule defined in Prompt)
  // CTJ (Coste Total Justificado INPUT) = Directos + Indirectos (Input)
  const ctj = totalCostesDirectos + input.costesIndirectos;
  
  // LMI (Límite Máximo Indirecto) = CTJ x 0.10
  // Note: This calculates the limit based on the *input* total, not the final recognized total.
  const limiteCostesIndirectos = ctj * 0.10;

  // Validation of B9
  let costeIndirectoReconocido = input.costesIndirectos;
  let indirectAdjusted = false;

  if (input.costesIndirectos > limiteCostesIndirectos) {
    costeIndirectoReconocido = limiteCostesIndirectos;
    indirectAdjusted = true;
  }

  // 4. Total Recognized
  const totalCostesReconocidos = totalCostesDirectos + costeIndirectoReconocido;

  // 5. Deviation and Status
  // Deviation: Positive if we are under the financing limit (Surplus/Savings), 
  // Negative if we spent too much (Deficit/Non-eligible)
  const desviacion = importeFinanciableReal - totalCostesReconocidos;

  let estado: JustificationResult['estado'] = 'OK';
  const exceededBudget = desviacion < -0.01; // tolerance for float rounding

  if (indirectAdjusted && exceededBudget) {
    estado = 'AJUSTE_Y_EXCEDIDO';
  } else if (indirectAdjusted) {
    estado = 'AJUSTE_INDIRECTOS';
  } else if (exceededBudget) {
    estado = 'EXCEDIDO';
  }

  // 6. Treasury
  const pendientePago = Math.max(0, ctj - (input.importePagado || 0));

  return {
    importeFinanciableReal,
    totalCostesDirectos,
    totalCostesIndirectosJustificados: input.costesIndirectos,
    limiteCostesIndirectos,
    costeIndirectoReconocido,
    totalCostesReconocidos,
    costeTotalJustificado: ctj,
    desviacion,
    estado,
    pendientePago
  };
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
};