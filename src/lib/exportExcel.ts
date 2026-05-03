// Export Excel utility - uses CSV with BOM and tab separator for perfect Excel compatibility

export type ExcelColumn = {
  key: string
  label: string
  width?: number
  format?: 'text' | 'number' | 'date' | 'time' | 'hours'
}

export async function exportExcel(
  data: Record<string, any>[],
  columns: ExcelColumn[],
  filename: string
) {
  const SEP = '\t' // Tab separator — Excel deschide perfect fără probleme cu virgule în date

  const header = columns.map(c => c.label).join(SEP)

  const rows = data.map(row =>
    columns.map(col => {
      const val = row[col.key]
      if (val === null || val === undefined) return ''
      if (col.format === 'hours' && typeof val === 'number') return Number(val).toFixed(2).replace('.', ',')
      if (col.format === 'number') return typeof val === 'number' ? String(val) : String(parseFloat(val) || 0)
      return String(val).replace(/\t/g, ' ').replace(/\n/g, ' ')
    }).join(SEP)
  )

  const csv = [header, ...rows].join('\n')
  // BOM pentru UTF-8 — Excel îl recunoaște automat
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/tab-separated-values;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.xls` // .xls ca să se deschidă direct în Excel
  a.click()
  URL.revokeObjectURL(url)
}

export const TASKS_COLUMNS: ExcelColumn[] = [
  { key: 'task_date', label: 'Data', width: 12 },
  { key: 'task_number', label: '#', width: 5, format: 'number' },
  { key: 'user_name', label: 'Angajat', width: 20 },
  { key: 'project_abbr', label: 'Proiect', width: 20 },
  { key: 'bauteil_name', label: 'Bauteil', width: 15 },
  { key: 'sch_bew_gen', label: 'SCH/BEW/GEN', width: 14 },
  { key: 'plan_number', label: 'Nr. Plan', width: 12 },
  { key: 'floor', label: 'Etaj', width: 8 },
  { key: 'plan_description', label: 'Descriere Plan', width: 30 },
  { key: 'status', label: 'Status', width: 12 },
  { key: 'tip_plan', label: 'Tip Plan', width: 10 },
  { key: 'time_start', label: 'Inceput', width: 9 },
  { key: 'time_pause', label: 'Pauza', width: 9 },
  { key: 'time_end', label: 'Terminat', width: 9 },
  { key: 'hours_worked', label: 'Ore', width: 8, format: 'hours' },
  { key: 'correction_date', label: 'Data Corectie', width: 14 },
  { key: 'verified', label: 'Verificat', width: 10 },
  { key: 'notes', label: 'Observatii', width: 25 },
]

export const SUMMARY_COLUMNS: ExcelColumn[] = [
  { key: 'full_name', label: 'Angajat', width: 25 },
  { key: 'username', label: 'Username', width: 15 },
  { key: 'hours', label: 'Ore totale', width: 12, format: 'hours' },
  { key: 'days', label: 'Zile lucrate', width: 14, format: 'number' },
  { key: 'NOU', label: 'NOU', width: 10, format: 'number' },
  { key: 'C_DE', label: 'C_DE', width: 10, format: 'number' },
  { key: 'C_LMT', label: 'C_LMT', width: 10, format: 'number' },
  { key: 'FREI', label: 'FREI', width: 10, format: 'number' },
  { key: 'NTR', label: 'NTR', width: 10, format: 'number' },
  { key: 'MKT', label: 'MKT', width: 10, format: 'number' },
  { key: 'terminated', label: 'Total terminate', width: 16, format: 'number' },
]

export function flattenTask(t: any): Record<string, any> {
  return {
    task_date: t.task_date || '',
    task_number: t.task_number || '',
    user_name: t.profile?.full_name || '',
    project_abbr: t.project?.abbreviation || '',
    bauteil_name: t.bauteil?.name || '',
    sch_bew_gen: t.sch_bew_gen || '',
    plan_number: t.plan_number || '',
    floor: t.floor || '',
    plan_description: t.plan_description || '',
    status: ({ IN_LUCRU:'In lucru', PAUZA:'Pauza', TERMINAT:'Terminat' } as any)[t.status] || t.status || '',
    tip_plan: t.tip_plan || '',
    time_start: t.time_start?.slice(0,5) || '',
    time_pause: t.time_pause?.slice(0,5) || '',
    time_end: t.time_end?.slice(0,5) || '',
    hours_worked: t.hours_worked ? parseFloat(Number(t.hours_worked).toFixed(2)) : 0,
    correction_date: t.correction_date || '',
    verified: t.verified ? 'DA' : '',
    notes: t.notes || '',
  }
}