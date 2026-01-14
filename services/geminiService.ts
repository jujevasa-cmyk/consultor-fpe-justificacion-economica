import { GoogleGenAI } from "@google/genai";
import { TrainingAction, JustificationInput, JustificationResult } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const generateConsultantReport = async (
  action: TrainingAction,
  input: JustificationInput,
  result: JustificationResult
): Promise<string> => {
  const client = getClient();
  if (!client) return "Error: API Key no configurada.";

  const systemInstruction = `
    Rol: Eres un Asistente Experto en Justificación Económica de la Formación Profesional para el Empleo (FP€) en España.
    
    Misión: Analizar la justificación económica de una acción formativa, validar límites presupuestarios y explicar desviaciones.
    
    Reglas de Negocio Clave:
    1. Importe Financiable Real = Horas * Alumnos Finalizados * Módulo Económico.
    2. Regla del 10% (Costes Indirectos): El Límite Máximo Indirecto (LMI) es el 10% del Coste Total Justificado (Directos + Indirectos INPUT). Si el indirecto imputado supera el LMI, se recorta al LMI.
    
    Tono: Profesional, técnico, preciso y resolutivo (como un auditor).
  `;

  const prompt = `
    Genera un informe ejecutivo de justificación para la siguiente acción:

    DATOS DE LA ACCIÓN:
    - Expediente: ${action.expediente}
    - Acción: ${action.codigoAccion} - ${action.denominacion}
    - Horas: ${action.horas}
    - Alumnos (Concedidos/Finalizados): ${action.alumnosConcedidos} / ${input.alumnosFinalizados}
    - Módulo: ${action.moduloEconomico} €/h
    
    DATOS ECONÓMICOS:
    - Total Costes Directos: ${result.totalCostesDirectos.toFixed(2)} €
    - Coste Indirecto Solicitado: ${result.totalCostesIndirectosJustificados.toFixed(2)} €
    - Límite Indirectos (10% CTJ): ${result.limiteCostesIndirectos.toFixed(2)} €
    
    RESULTADO LIQUIDACIÓN:
    - Importe Máximo Financiable (Real): ${result.importeFinanciableReal.toFixed(2)} €
    - Coste Indirecto Reconocido: ${result.costeIndirectoReconocido.toFixed(2)} €
    - Total Costes Reconocidos: ${result.totalCostesReconocidos.toFixed(2)} €
    - Desviación (Financiable - Reconocido): ${result.desviacion.toFixed(2)} € (Negativo = Exceso de Gasto)
    - Estado: ${result.estado}

    Estructura del Informe (Texto plano, máx 150 palabras):
    1. ALUMNOS: Valida si la bajada de alumnos (si la hay) ha reducido el importe máximo financiable.
    2. INDIRECTOS: Confirma si se ha aplicado la regla del 10% para recortar el gasto indirecto (comparando Solicitado vs Límite).
    3. CONCLUSIÓN: Estado final (OK/Excedido). Si hay desviación negativa, indica cuánto gasto no es subvencionable.
  `;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3, // Low temperature for factual/technical consistency
      },
    });
    return response.text || "No se pudo generar el análisis.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error al conectar con el servicio de análisis inteligente.";
  }
};