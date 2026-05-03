// PDF Export - foloseste HTML to PDF via print dialog
// Genereaza un HTML formatat care se poate printa/salva ca PDF

export interface PDFReportData {
  month: string
  year: number
  companyName: string
  generatedAt: string
  userReports: {
    userId: string
    userName: string
    totalHours: number
    workDays: number
    tipCounts: Record<string, number>
    projects: { abbr: string; name: string; hours: number; tasks: number }[]
    tasks: any[]
  }[]
  projectSummary: {
    abbr: string; name: string; beneficiary: string
    totalHours: number; users: string[]
    tipCounts: Record<string, number>
  }[]
}

export function generatePDFReport(data: PDFReportData) {
  const MONTHS_RO = ['Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie','Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie']
  const monthName = MONTHS_RO[data.month ? parseInt(data.month)-1 : new Date().getMonth()]

  const html = `<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="UTF-8">
<title>Raport ${monthName} ${data.year} - ${data.companyName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 10pt; color: #1a2236; background: white; }
  .page { max-width: 210mm; margin: 0 auto; padding: 15mm; }
  h1 { font-size: 18pt; color: #1e3a5f; margin-bottom: 4px; }
  h2 { font-size: 13pt; color: #2563eb; margin: 20px 0 10px; border-bottom: 2px solid #2563eb; padding-bottom: 4px; }
  h3 { font-size: 11pt; color: #1e3a5f; margin: 14px 0 8px; }
  .subtitle { font-size: 10pt; color: #64748b; margin-bottom: 20px; }
  .meta { display: flex; justify-content: space-between; font-size: 9pt; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 9pt; }
  th { background: #2563eb; color: white; padding: 6px 8px; text-align: left; font-weight: 600; }
  th.right { text-align: right; }
  td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
  td.right { text-align: right; font-family: monospace; }
  tr:nth-child(even) td { background: #f0f4ff; }
  tr:last-child td { border-bottom: 2px solid #2563eb; font-weight: 700; background: #eff6ff !important; }
  .user-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; margin-bottom: 20px; }
  .user-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .user-name { font-size: 13pt; font-weight: 700; color: #1e3a5f; }
  .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 10px; }
  .stat-box { background: #f0f4ff; border-radius: 6px; padding: 8px 10px; text-align: center; }
  .stat-val { font-size: 14pt; font-weight: 700; color: #2563eb; }
  .stat-lbl { font-size: 8pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
  .tip-row { display: flex; gap: 8px; margin-bottom: 10px; }
  .tip-box { padding: 3px 10px; border-radius: 20px; font-size: 9pt; font-weight: 700; }
  .tip-NOU { background: #dbeafe; color: #1d4ed8; }
  .tip-C_DE { background: #f3e8ff; color: #7e22ce; }
  .tip-C_LMT { background: #ffedd5; color: #c2410c; }
  .tip-FREI { background: #dcfce7; color: #15803d; }
  .tip-NTR { background: #f1f5f9; color: #475569; }
  .tip-MKT { background: #fee2e2; color: #b91c1c; }
  .page-break { page-break-before: always; }
  .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 8pt; color: #94a3b8; text-align: center; }
  @media print {
    body { font-size: 9pt; }
    .page { padding: 10mm; }
    .page-break { page-break-before: always; }
  }
</style>
</head>
<body>
<div class="page">
  <h1>📐 ${data.companyName}</h1>
  <div class="subtitle">Raport lunar — ${monthName} ${data.year}</div>
  <div class="meta">
    <span>Generat: ${data.generatedAt}</span>
    <span>${data.userReports.length} angajați · ${data.userReports.reduce((s,u)=>s+u.totalHours,0).toFixed(1)}h total</span>
  </div>

  <!-- SUMAR GENERAL -->
  <h2>📊 Sumar general — ${monthName} ${data.year}</h2>
  <table>
    <thead><tr><th>Angajat</th><th class="right">Ore</th><th class="right">Zile</th><th class="right">NOU</th><th class="right">C_DE</th><th class="right">C_LMT</th><th class="right">FREI</th><th class="right">Total term.</th></tr></thead>
    <tbody>
      ${data.userReports.map(u => `
      <tr>
        <td>${u.userName}</td>
        <td class="right">${u.totalHours.toFixed(2)}h</td>
        <td class="right">${u.workDays}</td>
        <td class="right">${u.tipCounts['NOU']||0}</td>
        <td class="right">${u.tipCounts['C_DE']||0}</td>
        <td class="right">${u.tipCounts['C_LMT']||0}</td>
        <td class="right">${u.tipCounts['FREI']||0}</td>
        <td class="right">${Object.values(u.tipCounts).reduce((a:any,b:any)=>a+b,0)}</td>
      </tr>`).join('')}
      <tr>
        <td><strong>TOTAL ECHIPĂ</strong></td>
        <td class="right">${data.userReports.reduce((s,u)=>s+u.totalHours,0).toFixed(2)}h</td>
        <td class="right">${data.userReports.reduce((s,u)=>s+u.workDays,0)}</td>
        <td class="right">${data.userReports.reduce((s,u)=>s+(u.tipCounts['NOU']||0),0)}</td>
        <td class="right">${data.userReports.reduce((s,u)=>s+(u.tipCounts['C_DE']||0),0)}</td>
        <td class="right">${data.userReports.reduce((s,u)=>s+(u.tipCounts['C_LMT']||0),0)}</td>
        <td class="right">${data.userReports.reduce((s,u)=>s+(u.tipCounts['FREI']||0),0)}</td>
        <td class="right">${data.userReports.reduce((s,u)=>s+Object.values(u.tipCounts).reduce((a:any,b:any)=>a+b,0),0)}</td>
      </tr>
    </tbody>
  </table>

  <!-- ORE PE PROIECT -->
  <h2>📁 Total ore pe proiect — toți angajații</h2>
  <table>
    <thead><tr><th>Proiect</th><th>Beneficiar</th><th class="right">Total ore</th><th>Angajați</th><th class="right">NOU</th><th class="right">C_DE</th><th class="right">C_LMT</th></tr></thead>
    <tbody>
      ${data.projectSummary.sort((a,b)=>b.totalHours-a.totalHours).map(p => `
      <tr>
        <td><strong>${p.abbr}</strong><br><small style="color:#64748b">${p.name}</small></td>
        <td>${p.beneficiary||'—'}</td>
        <td class="right">${p.totalHours.toFixed(2)}h</td>
        <td>${p.users.join(', ')}</td>
        <td class="right">${p.tipCounts['NOU']||0}</td>
        <td class="right">${p.tipCounts['C_DE']||0}</td>
        <td class="right">${p.tipCounts['C_LMT']||0}</td>
      </tr>`).join('')}
      <tr>
        <td><strong>TOTAL</strong></td><td></td>
        <td class="right">${data.projectSummary.reduce((s,p)=>s+p.totalHours,0).toFixed(2)}h</td>
        <td></td><td></td><td></td><td></td>
      </tr>
    </tbody>
  </table>

  <!-- DETALIU PER ANGAJAT -->
  ${data.userReports.map((u, ui) => `
  <div class="${ui>0?'page-break':''}">
    <h2>👤 ${u.userName}</h2>
    <div class="stats-row">
      <div class="stat-box"><div class="stat-val">${u.totalHours.toFixed(1)}h</div><div class="stat-lbl">Total ore</div></div>
      <div class="stat-box"><div class="stat-val">${u.workDays}</div><div class="stat-lbl">Zile lucrate</div></div>
      <div class="stat-box"><div class="stat-val">${u.tipCounts['NOU']||0}</div><div class="stat-lbl">Planuri NOU</div></div>
      <div class="stat-box"><div class="stat-val">${Object.values(u.tipCounts).reduce((a:any,b:any)=>a+b,0)}</div><div class="stat-lbl">Total terminate</div></div>
    </div>
    <div class="tip-row">
      ${Object.entries(u.tipCounts).filter(([,v])=>v>0).map(([k,v])=>`<span class="tip-box tip-${k}">${k}: ${v}</span>`).join('')}
    </div>
    <h3>Ore pe proiect</h3>
    <table>
      <thead><tr><th>Proiect</th><th class="right">Ore</th><th class="right">Taskuri</th></tr></thead>
      <tbody>
        ${u.projects.sort((a,b)=>b.hours-a.hours).map(p=>`
        <tr><td>${p.abbr}</td><td class="right">${p.hours.toFixed(2)}h</td><td class="right">${p.tasks}</td></tr>`).join('')}
        <tr><td><strong>Total</strong></td><td class="right"><strong>${u.totalHours.toFixed(2)}h</strong></td><td class="right"><strong>${u.projects.reduce((s,p)=>s+p.tasks,0)}</strong></td></tr>
      </tbody>
    </table>
  </div>`).join('')}

  <div class="footer">
    PlanTracker · ${data.companyName} · Generat automat în ${data.generatedAt}
  </div>
</div>
</body>
</html>`

  // Open in new window and trigger print
  const w = window.open('', '_blank')
  if (w) {
    w.document.write(html)
    w.document.close()
    setTimeout(() => { w.focus(); w.print() }, 800)
  }
}
