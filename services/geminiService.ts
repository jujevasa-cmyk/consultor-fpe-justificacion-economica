import { TrainingAction, JustificationInput, JustificationResult } from "../types";

export const generateConsultantReport = async (
  action: TrainingAction,
  input: JustificationInput,
  result: JustificationResult
): Promise<string> => {
  const systemInstruction = `
    Rol: Eres un Asistente Experto en Justificación Económica de la Formación Profesional para el Empleo (FPE) en España.

    Misión: Analizar la justificación económica de una acción formativa, validar límites presupuestarios y explicar el cumplimiento de las Reglas de Negocio.

    Reglas de Negocio Clave:
    1. Importe Financiable Real = Horas × Alumnos Finalizados × Módulo Económico.
    2. Regla del 10% (Costes Indirectos): El Límite Máximo Indirecto (LMI) es el 10% del Coste Total Justificado (CTJ).

    Tono: Profesional, técnico, preciso y resolutivo (como un auditor).
  `;

  const prompt = `
    Genera un informe ejecutivo de justificación para la siguiente acción:

    DATOS DE LA ACCIÓN:
    - Código: ${action.code}
    - Denominación: ${action.denomination}
    - Horas: ${action.hours}
    - Alumnos finalizados: ${action.finishedStudents}
    - Módulo económico: ${action.economicModule}€

    DATOS DE LA JUSTIFICACIÓN:
    - Costes Directos: ${input.directCosts}€
    - Costes Indirectos: ${input.indirectCosts}€
    - Coste Total Justificado: ${result.totalJustified}€
    - Importe Financiable Real: ${result.realFinanceable}€
    - Límite Máximo Indirecto: ${result.indirectLimit}€
    - Diferencia (Indirectos - Límite): ${result.difference}€
    - ¿Cumple la regla del 10%? ${result.compliesWithRule ? "SÍ" : "NO"}

    Estructura del informe:
    1. Resumen ejecutivo
    2. Análisis de costes
    3. Validación de la regla del 10%
    4. Importe financiable
    5. Conclusiones y recomendaciones
  `;

  try {
    // Call our Vercel Function proxy instead of Gemini API directly
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: systemInstruction + '\n\n' + prompt,
        model: 'gemini-1.5-flash'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate report');
    }

    const data = await response.json();
    
    // Extract text from Gemini response
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    }
    
    throw new Error('Invalid response format from API');
    
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
};
