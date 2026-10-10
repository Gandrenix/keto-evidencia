import { KETO_INTERVENTION_TERMS, type QueryBlocks } from './query-builder.ts'
import type { Pico } from './schemas.ts'

export interface CasePreset {
  id: 'A' | 'B' | 'C' | 'D'
  title: string
  short: string
  /** Enunciado literal del profesor. */
  vignette: string
  /** Pregunta literal del profesor. */
  teacherQuestion: string
  notices: string[]
  /** PICO sugerido (borrador editable; lo valida el docente). */
  pico: Pico
  blocks: QueryBlocks
  /** Lecturas del curso indicadas por el docente (PMID verificados en PubMed). */
  courseReadings: string[]
}

export const PRESETS: CasePreset[] = [
  {
    id: 'A',
    title: 'Caso A · Obesidad',
    short: 'Obesidad',
    vignette:
      'Mujer de 42 años, IMC de 33 kg/m², sin diabetes. Ha realizado diferentes intervenciones nutricionales con dificultades para mantener la pérdida de peso.',
    teacherQuestion: '¿Una dieta cetogénica produce mayor pérdida de peso sostenible que una dieta hipocalórica convencional?',
    notices: [],
    pico: {
      population: 'Adultos con obesidad (IMC ≥ 30 kg/m²) sin diabetes',
      intervention: 'Dieta cetogénica / muy baja en carbohidratos',
      comparison: 'Dieta hipocalórica convencional (baja en grasa)',
      outcome: 'Pérdida de peso sostenida (≥ 12 meses) y mantenimiento',
      question: '¿Una dieta cetogénica produce mayor pérdida de peso sostenible que una dieta hipocalórica convencional en adultos con obesidad?',
    },
    blocks: {
      population: ['obesity', '"Obesity"[Mesh]', 'overweight'],
      intervention: KETO_INTERVENTION_TERMS,
      comparison: [],
      designs: ['sr', 'ma', 'rct'],
    },
    courseReadings: [],
  },
  {
    id: 'B',
    title: 'Caso B · Diabetes mellitus tipo 2',
    short: 'Diabetes tipo 2',
    vignette:
      'Hombre de 55 años, HbA1c de 8,1 %, tratado con metformina, con sobrepeso y dificultades para alcanzar sus objetivos glucémicos.',
    teacherQuestion: '¿Una intervención cetogénica mejora la HbA1c frente a una alimentación con distribución convencional de carbohidratos?',
    notices: [],
    pico: {
      population: 'Adultos con diabetes mellitus tipo 2 y sobrepeso, tratados con metformina',
      intervention: 'Intervención cetogénica / muy baja en carbohidratos',
      comparison: 'Alimentación con distribución convencional de carbohidratos',
      outcome: 'Cambio en HbA1c',
      question: '¿Una intervención cetogénica mejora la HbA1c frente a una alimentación con distribución convencional de carbohidratos en adultos con DM2?',
    },
    blocks: {
      population: ['"type 2 diabetes"', '"Diabetes Mellitus, Type 2"[Mesh]'],
      intervention: KETO_INTERVENTION_TERMS,
      comparison: [],
      designs: ['sr', 'ma', 'rct'],
    },
    courseReadings: [],
  },
  {
    id: 'C',
    title: 'Caso C · Epilepsia farmacorresistente',
    short: 'Epilepsia',
    vignette: 'Niño de 8 años con epilepsia farmacorresistente, en seguimiento por neurología pediátrica.',
    teacherQuestion: '¿La terapia dietética cetogénica, añadida al tratamiento habitual, reduce la frecuencia de crisis epilépticas?',
    notices: ['Caso para análisis académico; la intervención requiere un equipo especializado.'],
    pico: {
      population: 'Niños con epilepsia farmacorresistente',
      intervention: 'Terapia dietética cetogénica (clásica, MCT, Atkins modificada, bajo índice glucémico) como adyuvante',
      comparison: 'Tratamiento habitual sin dieta cetogénica',
      outcome: 'Frecuencia de crisis (reducción ≥ 50 %) y efectos adversos',
      question: '¿La terapia dietética cetogénica, añadida al tratamiento habitual, reduce la frecuencia de crisis epilépticas en niños con epilepsia farmacorresistente?',
    },
    // Ecuación del profesor: ("ketogenic diet" OR "ketogenic dietary therapy") AND ("drug resistant epilepsy" OR "refractory epilepsy")
    //   AND ("systematic review" OR "randomized controlled trial")
    blocks: {
      population: ['"drug resistant epilepsy"', '"refractory epilepsy"'],
      intervention: ['"ketogenic diet"', '"ketogenic dietary therapy"'],
      comparison: [],
      designs: ['sr', 'rct'],
    },
    courseReadings: ['32588435', '42391224', '42214220'],
  },
  {
    id: 'D',
    title: 'Caso D · MASLD (hígado graso)',
    short: 'MASLD',
    vignette: 'Hombre de 48 años con obesidad central, esteatosis hepática y elevación leve de ALT.',
    teacherQuestion: '¿Una dieta cetogénica reduce la grasa hepática y mejora los desenlaces clínicos frente a otras intervenciones nutricionales?',
    notices: [],
    pico: {
      population: 'Adultos con MASLD/NAFLD, obesidad central y ALT levemente elevada',
      intervention: 'Dieta cetogénica / muy baja en carbohidratos',
      comparison: 'Otras intervenciones nutricionales',
      outcome: 'Grasa hepática intrahepática, ALT/AST y desenlaces clínicos',
      question: '¿Una dieta cetogénica reduce la grasa hepática y mejora los desenlaces clínicos frente a otras intervenciones nutricionales en adultos con MASLD?',
    },
    blocks: {
      population: ['MASLD', 'NAFLD', '"fatty liver"', '"steatotic liver disease"', '"hepatic steatosis"'],
      intervention: [...KETO_INTERVENTION_TERMS, '"low carbohydrate diet"'],
      comparison: [],
      designs: ['sr', 'ma', 'rct'],
    },
    courseReadings: [],
  },
]

export const presetById = (id: string) => PRESETS.find((p) => p.id === id)

