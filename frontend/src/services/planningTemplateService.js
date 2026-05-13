export const TEMPLATE_TYPE_META = {
  weekly: {
    id: 'weekly',
    label: 'Semanal',
    icon: 'fa-calendar-week',
    color: 'var(--primary)',
    description: 'Plantillas rapidas para el horario semanal.',
  },
  annual_ra: {
    id: 'annual_ra',
    label: 'Institucional RA',
    icon: 'fa-sitemap',
    color: 'var(--secondary)',
    description: 'Matriz institucional de planificacion por resultado de aprendizaje.',
  },
}

export const buildAnnualPlanMeta = (course = '', year = new Date().getFullYear()) => ({
  plan_kind: 'tecnica',
  institution_name: 'Instituto Politecnico Parroquial Santa Ana',
  technical_degree: 'Desarrollo y Administracion de Aplicaciones Informaticas',
  module_name: '',
  module_code: '',
  teacher_name: '',
  uc_name: '',
  uc_code: '',
  start_date: '',
  end_date: '',
  hours_per_week: '',
  template_reference: '',
  course,
  year,
})

export const DEFAULT_ANNUAL_TEMPLATE_STRUCTURE = {
  overview:
    'Plantilla institucional inspirada en la matriz de planificacion por resultado de aprendizaje utilizada por el centro educativo.',
  sections: [
    {
      title: 'Datos generales',
      items: [
        'Institucion educativa',
        'Bachillerato tecnico',
        'Modulo formativo',
        'Codigo del modulo',
        'Docente',
        'Unidad de competencia asociada',
        'Codigo UC',
        'Fecha de inicio y termino',
        'Horas por semana',
      ],
    },
    {
      title: 'Resultado de Aprendizaje',
      items: [
        'Codigo del RA',
        'Titulo o enunciado del RA',
        'Nivel de dominio del RA',
        'Indicador o descripcion general',
      ],
    },
    {
      title: 'Elemento de Capacidad',
      items: [
        'Codigo del EC',
        'Titulo del EC',
        'Nivel de dominio del EC',
        'Periodo o fecha de realizacion',
      ],
    },
    {
      title: 'Actividades y evaluacion',
      items: [
        'Actividades de ensenanza/aprendizaje',
        'Actividades de evaluacion',
        'Instrumentos de evaluacion',
      ],
    },
    {
      title: 'Contenidos a trabajar',
      items: [
        'Contenidos conceptuales',
        'Contenidos procedimentales',
        'Contenidos actitudinales',
      ],
    },
  ],
  planDefaults: {
    module_name: 'Diseno y Desarrollo de Bases de Datos',
    module_code: 'MF_056_3',
    uc_name: 'Disenar y desarrollar bases de datos modelando la arquitectura requerida por las aplicaciones y sistemas de informacion',
    uc_code: 'UC_056_3',
    hours_per_week: 7,
  },
  fieldHints: {
    learning_activities: 'Describe las experiencias de aprendizaje: investigacion, practica guiada, resolucion de problemas, demostraciones o trabajo colaborativo.',
    evaluation_activities: 'Explica como comprobaras el aprendizaje: ejercicios, proyectos, practicas, exposiciones o resolucion de casos.',
    evaluation_instruments: 'Ejemplos: diario reflexivo, portafolio de evidencias, observacion directa, reportes de lectura, practicas en el computador.',
    conceptual_content: 'Conceptos, definiciones, teorias o saberes declarativos.',
    procedural_content: 'Procesos, tecnicas, pasos o habilidades practicas.',
    attitudinal_content: 'Valores, actitudes, disposicion al trabajo, colaboracion y responsabilidad.',
    learningActivities: 'Describe las experiencias de aprendizaje: investigacion, practica guiada, resolucion de problemas, demostraciones o trabajo colaborativo.',
    evaluationActivities: 'Explica como comprobaras el aprendizaje: ejercicios, proyectos, practicas, exposiciones o resolucion de casos.',
    evaluationInstruments: 'Ejemplos: diario reflexivo, portafolio de evidencias, observacion directa, reportes de lectura, practicas en el computador.',
    conceptualContent: 'Conceptos, definiciones, teorias o saberes declarativos.',
    proceduralContent: 'Procesos, tecnicas, pasos o habilidades practicas.',
    attitudinalContent: 'Valores, actitudes, disposicion al trabajo, colaboracion y responsabilidad.',
  },
}

export const DEFAULT_ANNUAL_TEMPLATE = {
  name: 'Matriz Institucional por Resultado de Aprendizaje',
  description:
    'Modelo institucional para planificar por RA y EC, con actividades, evaluacion y contenidos conceptuales, procedimentales y actitudinales.',
  content:
    'Usa esta plantilla para organizar la planificacion anual por resultados de aprendizaje con la misma estructura institucional del centro.',
  icon: TEMPLATE_TYPE_META.annual_ra.icon,
  color: TEMPLATE_TYPE_META.annual_ra.color,
  uses: 0,
  template_type: 'annual_ra',
  structure_json: DEFAULT_ANNUAL_TEMPLATE_STRUCTURE,
  is_system_template: true,
}

export const normalizePlanningTemplate = (row = {}) => ({
  id: row.id,
  // Accept both DB-column keys (name, description, ...) and internal keys (n, d, ...)
  // so we can normalize objects coming from forms before they hit Supabase.
  n: row.name || row.n || '',
  d: row.description || row.d || '',
  content: row.content || '',
  i: row.icon || row.i || 'fa-file-alt',
  c: row.color || row.c || 'var(--primary)',
  uses: Number(row.uses) || 0,
  type: row.template_type || row.type || 'weekly',
  structure: row.structure_json || row.structure || null,
  isSystem: !!row.is_system_template,
})

export const mergePlanMetaWithTemplate = (meta, template) => {
  const defaults = template?.structure?.planDefaults || {}
  return {
    ...meta,
    ...Object.fromEntries(
      Object.entries(defaults).map(([key, value]) => [key, meta?.[key] || value]),
    ),
    template_reference: template?.n || meta?.template_reference || '',
  }
}

export const buildActivitySummary = (row = {}) => {
  return [
    row.learningActivities,
    row.evaluationActivities,
    row.evaluationInstruments,
  ]
    .filter(Boolean)
    .join(' | ')
}
