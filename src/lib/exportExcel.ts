// Export utility - tab-separated values pentru Excel perfect

export type ExcelColumn = {
  key: string
  label: string
  format?: 'text' | 'number' | 'date' | 'time' | 'hours'
}

export async function exportExcel(
  data: Record<string, any>[],
  columns: ExcelColumn[],
  filename: string
) {
  const SEP = '\t'
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
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/tab-separated-values;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.xls`
  a.click()
  URL.revokeObjectURL(url)
}

export const TASKS_COLUMNS: ExcelColumn[] = [
  { key:'task_date', label:'Data' },
  { key:'task_number', label:'#', format:'number' },
  { key:'user_name', label:'Angajat' },
  { key:'project_abbr', label:'Proiect' },
  { key:'bauteil_name', label:'Bauteil' },
  { key:'sch_bew_gen', label:'SCH/BEW/GEN' },
  { key:'plan_number', label:'Nr. Plan' },
  { key:'floor', label:'Etaj' },
  { key:'plan_description', label:'Descriere Plan' },
  { key:'status', label:'Status' },
  { key:'tip_plan', label:'Tip Plan' },
  { key:'time_start', label:'Inceput' },
  { key:'time_pause', label:'Pauza' },
  { key:'time_end', label:'Terminat' },
  { key:'hours_worked', label:'Ore', format:'hours' },
  { key:'correction_date', label:'Data Corectie' },
  { key:'verified', label:'Verificat' },
  { key:'notes', label:'Observatii' },
]

export const SUMMARY_COLUMNS: ExcelColumn[] = [
  { key:'full_name', label:'Angajat' },
  { key:'username', label:'Username' },
  { key:'hours', label:'Ore totale', format:'hours' },
  { key:'days', label:'Zile lucrate', format:'number' },
  { key:'NOU', label:'NOU', format:'number' },
  { key:'C_DE', label:'C_DE', format:'number' },
  { key:'C_LMT', label:'C_LMT', format:'number' },
  { key:'FREI', label:'FREI', format:'number' },
  { key:'NTR', label:'NTR', format:'number' },
  { key:'MKT', label:'MKT', format:'number' },
  { key:'terminated', label:'Total terminate', format:'number' },
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
    status: ({IN_LUCRU:'In lucru',PAUZA:'Pauza',TERMINAT:'Terminat'} as any)[t.status] || t.status || '',
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
