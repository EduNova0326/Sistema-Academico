const LETTER_DEFAULTS = [
  { label: 'A', min: 90, max: 100 },
  { label: 'B', min: 80, max: 89.99 },
  { label: 'C', min: 70, max: 79.99 },
  { label: 'D', min: 60, max: 69.99 },
  { label: 'F', min: 0, max: 59.99 },
]

const numericScale = ({
  id,
  name,
  description,
  is_default,
  max_value,
  passing_score,
  excellence_score,
  precision = 1,
}) => ({
  id,
  name,
  description,
  is_default,
  mode: 'numeric',
  max_value,
  passing_score,
  excellence_score,
  precision,
})

export const DEFAULT_GRADE_SCALES = [
  numericScale({
    id: 'scale_100',
    name: 'Escala 0-100',
    description: 'Aprobatorio >= 60 | Excelente >= 90',
    is_default: true,
    max_value: 100,
    passing_score: 60,
    excellence_score: 90,
  }),
  numericScale({
    id: 'scale_5',
    name: 'Escala 1-5',
    description: 'Aprobatorio >= 3.0 | Excelente >= 4.5',
    is_default: false,
    max_value: 5,
    passing_score: 3,
    excellence_score: 4.5,
  }),
  {
    id: 'scale_letters',
    name: 'Letras (A-F)',
    description: 'A (90-100), B (80-89), C (70-79), D (60-69), F (<60)',
    is_default: false,
    mode: 'letters',
    max_value: 100,
    passing_score: 60,
    excellence_score: 90,
    precision: 0,
    letter_ranges: LETTER_DEFAULTS,
  },
  numericScale({
    id: 'scale_10',
    name: 'Escala 0-10',
    description: 'Aprobatorio >= 6.0 | Excelente >= 9.0',
    is_default: false,
    max_value: 10,
    passing_score: 6,
    excellence_score: 9,
  }),
]

const sanitizeNumber = (value, fallback) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const buildDescription = (scale) => {
  if (scale.mode === 'letters') {
    const ranges = Array.isArray(scale.letter_ranges) && scale.letter_ranges.length > 0
      ? scale.letter_ranges
      : LETTER_DEFAULTS
    return ranges.map((range) => `${range.label} (${range.min}-${Math.round(range.max)})`).join(', ')
  }

  return `Aprobatorio >= ${scale.passing_score} | Excelente >= ${scale.excellence_score}`
}

export const generateScaleId = () => `scale_custom_${Date.now()}`

export const normalizeScale = (scale = {}, index = 0) => {
  const fallback = DEFAULT_GRADE_SCALES[index] || DEFAULT_GRADE_SCALES[0]
  const legacyId = scale?.id || fallback.id
  const inferredMode = scale?.mode || (legacyId === 'scale_letters' ? 'letters' : 'numeric')
  const maxValue = inferredMode === 'numeric'
    ? sanitizeNumber(scale.max_value, legacyId === 'scale_5' ? 5 : legacyId === 'scale_10' ? 10 : 100)
    : 100
  const passingScore = sanitizeNumber(
    scale.passing_score,
    legacyId === 'scale_5' ? 3 : legacyId === 'scale_10' ? 6 : 60
  )
  const excellenceScore = sanitizeNumber(
    scale.excellence_score,
    legacyId === 'scale_5' ? 4.5 : legacyId === 'scale_10' ? 9 : 90
  )
  const normalized = {
    id: legacyId,
    name: String(scale?.name || fallback.name || 'Escala personalizada').trim(),
    description: String(scale?.description || '').trim(),
    is_default: !!scale?.is_default,
    mode: inferredMode,
    max_value: maxValue,
    passing_score: passingScore,
    excellence_score: excellenceScore,
    precision: Math.max(0, Math.min(2, sanitizeNumber(scale.precision, inferredMode === 'numeric' ? 1 : 0))),
    letter_ranges: inferredMode === 'letters'
      ? (Array.isArray(scale.letter_ranges) && scale.letter_ranges.length > 0
          ? scale.letter_ranges.map((range) => ({
              label: String(range.label || '').trim() || 'A',
              min: sanitizeNumber(range.min, 0),
              max: sanitizeNumber(range.max, 100),
            }))
          : LETTER_DEFAULTS)
      : [],
  }

  if (!normalized.description) {
    normalized.description = buildDescription(normalized)
  }

  return normalized
}

export const ensureDefaultGradeScale = (scales) => {
  const nextScales = Array.isArray(scales) && scales.length > 0
    ? scales.map((scale, index) => normalizeScale(scale, index))
    : DEFAULT_GRADE_SCALES.map((scale, index) => normalizeScale(scale, index))

  if (!nextScales.some((scale) => scale.is_default)) {
    nextScales[0] = { ...nextScales[0], is_default: true }
  }

  return nextScales
}

export const getDefaultGradeScale = (scales) => {
  const normalized = ensureDefaultGradeScale(scales)
  return normalized.find((scale) => scale.is_default) || normalized[0]
}

export const convertRawHundredToScale = (rawValue, scale) => {
  const numeric = Math.max(0, Math.min(100, Number(rawValue) || 0))
  const normalized = normalizeScale(scale)

  if (normalized.mode === 'letters') {
    const match = normalized.letter_ranges.find((range) => numeric >= range.min && numeric <= range.max)
    return match?.label || normalized.letter_ranges.at(-1)?.label || 'F'
  }

  const converted = (numeric / 100) * normalized.max_value
  return Number(converted.toFixed(normalized.precision))
}

export const formatGradeForScale = (rawValue, scale) => {
  const normalized = normalizeScale(scale)
  const converted = convertRawHundredToScale(rawValue, normalized)

  if (normalized.mode === 'letters') return String(converted)
  return Number(converted).toFixed(normalized.precision)
}

export const getScaleDisplayLabel = (scale) => {
  const normalized = normalizeScale(scale)
  if (normalized.mode === 'letters') return normalized.name
  return `${normalized.name} (0-${normalized.max_value})`
}

export const getPerformanceMeta = (rawValue, scale) => {
  const numeric = Math.max(0, Math.min(100, Number(rawValue) || 0))
  const normalized = normalizeScale(scale)
  const passingRaw = normalized.mode === 'numeric'
    ? (Number(normalized.passing_score) / Number(normalized.max_value || 100)) * 100
    : Number(normalized.passing_score || 60)
  const excellenceRaw = normalized.mode === 'numeric'
    ? (Number(normalized.excellence_score) / Number(normalized.max_value || 100)) * 100
    : Number(normalized.excellence_score || 90)

  if (numeric >= excellenceRaw) return { label: 'Excelente', cls: 'active', color: 'var(--success)' }
  if (numeric >= passingRaw) return { label: 'Aprobado', cls: 'active', color: 'var(--success)' }
  if (numeric >= Math.max(passingRaw - 10, 0)) return { label: 'En riesgo', cls: 'pending', color: 'var(--warning)' }
  return { label: 'Reprobado', cls: 'danger', color: 'var(--danger)' }
}

export const buildScaleDraft = () => ({
  id: generateScaleId(),
  name: 'Nueva escala',
  description: '',
  is_default: false,
  mode: 'numeric',
  max_value: 20,
  passing_score: 12,
  excellence_score: 18,
  precision: 1,
  letter_ranges: LETTER_DEFAULTS,
})
