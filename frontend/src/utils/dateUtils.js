// Date helpers (local-time) to avoid timezone surprises with toISOString().
// All functions here assume Monday as the first day of the week.

export const pad2 = (n) => String(n).padStart(2, '0')

export const toISODateLocal = (date) => {
  const d = new Date(date)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export const startOfDayLocal = (date = new Date()) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export const startOfMonthLocal = (date = new Date()) => {
  const d = startOfDayLocal(date)
  d.setDate(1)
  return d
}

// Monday=0, Tuesday=1, ... Sunday=6
export const getDayIndexMonday0 = (date = new Date()) => {
  const d = new Date(date)
  return (d.getDay() + 6) % 7
}

export const startOfWeekMondayLocal = (date = new Date()) => {
  const d = startOfDayLocal(date)
  d.setDate(d.getDate() - getDayIndexMonday0(d))
  return d
}

