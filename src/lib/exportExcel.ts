export type ExcelColumn = {
  key: string; label: string
  format?: 'text' | 'number' | 'date' | 'time' | 'hours'
  width?: number
}

function escapeXml(val: any): string {
  if (val === null || val === undefined) return ''
  return String(val).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;')
}

export async function exportExcel(data: Record<string,any>[], columns: ExcelColumn[], filename: string, sheetName = 'Date') {
  const HEADER_BG = '3B82F6'; const HEADER_FG = 'FFFFFF'
  const ROW_BG1 = 'EFF6FF'; const ROW_BG2 = 'FFFFFF'; const BORDER = 'CBD5E1'

  const colsXml = columns.map((c,i) => `<Column ss:Index="${i+1}" ss:Width="${(c.width||15)*7}"/>`).join('\n')

  const headerCells = columns.map(c =>
    `<Cell ss:StyleID="hdr"><Data ss:Type="String">${escapeXml(c.label)}</Data></Cell>`
  ).join('')

  const dataRows = data.map((row, ri) => {
    const s = ri%2===0?'r1':'r2'; const sn = ri%2===0?'r1n':'r2n'
    const cells = columns.map(col => {
      const val = row[col.key]
      if (val===null||val===undefined||val==='') return `<Cell ss:StyleID="${s}"><Data ss:Type="String"></Data></Cell>`
      if (col.format==='number'||col.format==='hours') {
        const num = typeof val==='number'?val:parseFloat(val)||0
        return `<Cell ss:StyleID="${sn}"><Data ss:Type="Number">${num}</Data></Cell>`
      }
      return `<Cell ss:StyleID="${s}"><Data ss:Type="String">${escapeXml(val)}</Data></Cell>`
    }).join('')
    return `<Row ss:Height="16">${cells}</Row>`
  }).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:o="urn:schemas-microsoft-com:office:office">
  <Styles>
    <Style ss:ID="hdr">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#${BORDER}"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#${BORDER}"/></Borders>
      <Font ss:Bold="1" ss:Color="#${HEADER_FG}" ss:Size="10" ss:Name="Arial"/>
      <Interior ss:Color="#${HEADER_BG}" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="r1">
      <Alignment ss:Vertical="Center"/>
      <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#${BORDER}"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#${BORDER}"/></Borders>
      <Font ss:Size="9" ss:Name="Arial"/><Interior ss:Color="#${ROW_BG1}" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="r2">
      <Alignment ss:Vertical="Center"/>
      <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#${BORDER}"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#${BORDER}"/></Borders>
      <Font ss:Size="9" ss:Name="Arial"/><Interior ss:Color="#${ROW_BG2}" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="r1n">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#${BORDER}"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#${BORDER}"/></Borders>
      <Font ss:Size="9" ss:Name="Arial"/><Interior ss:Color="#${ROW_BG1}" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="0.00"/>
    </Style>
    <Style ss:ID="r2n">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#${BORDER}"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#${BORDER}"/></Borders>
      <Font ss:Size="9" ss:Name="Arial"/><Interior ss:Color="#${ROW_BG2}" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="0.00"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="${escapeXml(sheetName)}">
    <Table>${colsXml}<Row ss:Height="22">${headerCells}</Row>${dataRows}</Table>
    <AutoFilter x:Range="R1C1:R1C${columns.length}" xmlns="urn:schemas-microsoft-com:office:excel"/>
    <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
      <FreezePanes/><FrozenNoSplit/>
      <SplitHorizontal>1</SplitHorizontal>
      <TopRowBottomPane>1</TopRowBottomPane>
      <ActivePane>2</ActivePane>
    </WorksheetOptions>
  </Worksheet>
</Workbook>`

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href=url; a.download=`${filename}.xls`; a.click()
  URL.revokeObjectURL(url)
}

export const TASKS_COLUMNS: ExcelColumn[] = [
  { key:'task_date', label:'Data', width:12 },
  { key:'task_number', label:'#', width:5, format:'number' },
  { key:'user_name', label:'Angajat', width:22 },
  { key:'project_abbr', label:'Proiect', width:20 },
  { key:'bauteil_name', label:'Bauteil', width:15 },
  { key:'sch_bew_gen', label:'SCH/BEW/GEN', width:14 },
  { key:'plan_number', label:'Nr. Plan', width:12 },
  { key:'floor', label:'Etaj', width:8 },
  { key:'plan_description', label:'Descriere Plan', width:35 },
  { key:'status', label:'Status', width:12 },
  { key:'tip_plan', label:'Tip Plan', width:10 },
  { key:'time_start', label:'Inceput', width:9 },
  { key:'time_pause', label:'Pauza', width:9 },
  { key:'time_end', label:'Terminat', width:9 },
  { key:'hours_worked', label:'Ore', width:8, format:'hours' },
  { key:'correction_date', label:'Data Corectie', width:14 },
  { key:'verified', label:'Verificat', width:10 },
  { key:'notes', label:'Observatii', width:28 },
]

export const SUMMARY_COLUMNS: ExcelColumn[] = [
  { key:'full_name', label:'Angajat', width:25 },
  { key:'username', label:'Username', width:15 },
  { key:'hours', label:'Ore totale', width:12, format:'hours' },
  { key:'days', label:'Zile lucrate', width:14, format:'number' },
  { key:'NOU', label:'NOU', width:10, format:'number' },
  { key:'C_DE', label:'C_DE', width:10, format:'number' },
  { key:'C_LMT', label:'C_LMT', width:10, format:'number' },
  { key:'FREI', label:'FREI', width:10, format:'number' },
  { key:'NTR', label:'NTR', width:10, format:'number' },
  { key:'MKT', label:'MKT', width:10, format:'number' },
  { key:'terminated', label:'Total terminate', width:16, format:'number' },
]

export const PROJECT_COLUMNS: ExcelColumn[] = [
  { key:'project_abbr', label:'Proiect', width:22 },
  { key:'project_name', label:'Nume complet', width:35 },
  { key:'beneficiary', label:'Beneficiar', width:22 },
  { key:'hours', label:'Total ore', width:12, format:'hours' },
  { key:'angajati', label:'Angajați activi', width:16 },
  { key:'NOU', label:'NOU', width:10, format:'number' },
  { key:'C_DE', label:'C_DE', width:10, format:'number' },
  { key:'C_LMT', label:'C_LMT', width:10, format:'number' },
  { key:'FREI', label:'FREI', width:10, format:'number' },
]

export function flattenTask(t: any): Record<string,any> {
  return {
    task_date: t.task_date||'', task_number: t.task_number||'',
    user_name: t.profile?.full_name||'', project_abbr: t.project?.abbreviation||'',
    bauteil_name: t.bauteil?.name||'', sch_bew_gen: t.sch_bew_gen||'',
    plan_number: t.plan_number||'', floor: t.floor||'',
    plan_description: t.plan_description||'',
    status: ({IN_LUCRU:'In lucru',PAUZA:'Pauza',TERMINAT:'Terminat'} as any)[t.status]||t.status||'',
    tip_plan: t.tip_plan||'',
    time_start: t.time_start?.slice(0,5)||'', time_pause: t.time_pause?.slice(0,5)||'',
    time_end: t.time_end?.slice(0,5)||'',
    hours_worked: t.hours_worked?parseFloat(Number(t.hours_worked).toFixed(2)):0,
    correction_date: t.correction_date||'', verified: t.verified?'DA':'', notes: t.notes||'',
  }
}
