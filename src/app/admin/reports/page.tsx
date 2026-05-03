'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase, Profile, Project, MONTHS_RO } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { exportExcel, TASKS_COLUMNS, SUMMARY_COLUMNS, flattenTask } from '@/lib/exportExcel'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const TIP_BADGE: Record<string,string> = { NOU:'badge-nou',C_DE:'badge-cde',C_LMT:'badge-clmt',FREI:'badge-frei',NTR:'badge-ntr',MKT:'badge-mkt',MKT_45:'badge-mkt' }
const STATUS_BADGE: Record<string,string> = { IN_LUCRU:'badge-inlucru',PAUZA:'badge-pauza',TERMINAT:'badge-terminat' }
const STATUS_LABEL: Record<string,string> = { IN_LUCRU:'In lucru',PAUZA:'Pauza',TERMINAT:'Terminat' }
const USER_COLORS = ['#3b82f6','#22c55e','#a855f7','#f97316','#ef4444','#eab308','#14b8a6']
const MONTHS_SHORT = ['Ian','Feb','Mar','Apr','Mai','Iun','Iul','Aug','Sep','Oct','Nov','Dec']

export default function AdminReportsPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [view, setView] = useState<'overview'|'tasks'>('overview')
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(), month:'', userId:'', projectId:'', status:'', tipPlan:'',
  })

  useEffect(() => {
    supabase.from('profiles').select('*').eq('role','user').order('full_name').then(({data}) => setUsers(data||[]))
    supabase.from('projects').select('*').eq('active',true).order('name').then(({data}) => setProjects(data||[]))
  }, [])

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('tasks')
      .select('*, profile:profiles(full_name,username), project:projects(name,abbreviation), bauteil:bauteile(name)')
      .gte('task_date',`${filters.year}-01-01`).lte('task_date',`${filters.year}-12-31`)
      .order('task_date',{ascending:false}).order('task_number')
    if (filters.month) query = query.like('month',`${filters.year}-${filters.month.padStart(2,'0')}`)
    if (filters.userId) query = query.eq('user_id',filters.userId)
    if (filters.projectId) query = query.eq('project_id',filters.projectId)
    if (filters.status) query = query.eq('status',filters.status)
    if (filters.tipPlan) query = query.eq('tip_plan',filters.tipPlan)
    const {data} = await query
    setTasks(data||[])
    setLoading(false)
  }, [filters])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  // Export Excel - Tasks
  async function exportTasksExcel() {
    setExporting(true)
    const rows = tasks.map(flattenTask)
    const yr = filters.year
    const mo = filters.month ? `_${MONTHS_RO[parseInt(filters.month)-1]}` : ''
    await exportExcel(rows, TASKS_COLUMNS, `PlanTracker_Taskuri_${yr}${mo}`)
    setExporting(false)
  }

  // Export Excel - Summary per user
  async function exportSummaryExcel() {
    setExporting(true)
    const rows = userSummary.map(u => ({
      full_name: u.full_name,
      username: `@${u.username}`,
      hours: u.hours,
      days: u.days,
      NOU: u.tipCounts['NOU']||0,
      C_DE: u.tipCounts['C_DE']||0,
      C_LMT: u.tipCounts['C_LMT']||0,
      FREI: u.tipCounts['FREI']||0,
      NTR: u.tipCounts['NTR']||0,
      MKT: u.tipCounts['MKT']||0,
      terminated: u.taskCount,
    }))
    await exportExcel(rows, SUMMARY_COLUMNS, `PlanTracker_Sumar_${filters.year}`)
    setExporting(false)
  }

  const totalHours = tasks.reduce((s,t) => s+(t.hours_worked||0), 0)
  const terminated = tasks.filter(t => t.status==='TERMINAT').length
  const nouTerminated = tasks.filter(t => t.tip_plan==='NOU' && t.status==='TERMINAT').length

  const chartData = MONTHS_SHORT.map((name,idx) => {
    const monthStr = `${filters.year}-${String(idx+1).padStart(2,'0')}`
    const row:any = {month:name}
    users.forEach(u => { row[u.username] = tasks.filter(t=>t.user_id===u.id&&t.month===monthStr).reduce((s:number,t:any)=>s+(t.hours_worked||0),0) })
    return row
  })

  const userSummary = users.map(u => {
    const uTasks = tasks.filter(t=>t.user_id===u.id)
    const hours = uTasks.reduce((s,t)=>s+(t.hours_worked||0),0)
    const tipCounts:Record<string,number> = {NOU:0,C_DE:0,C_LMT:0,FREI:0,NTR:0,MKT:0}
    uTasks.filter(t=>t.status==='TERMINAT'&&t.tip_plan).forEach(t=>{if(tipCounts[t.tip_plan]!==undefined)tipCounts[t.tip_plan]++})
    return {...u, hours, days:new Set(uTasks.map(t=>t.task_date)).size, taskCount:uTasks.length, tipCounts}
  })

  function setFilter(k:string,v:string){setFilters(f=>({...f,[k]:v}))}

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-wrap">
        <div className="topbar">
          <div>
            <div style={{fontSize:16,fontWeight:700,letterSpacing:'-0.02em',color:'var(--text)'}}>Rapoarte centralizate</div>
            <div style={{fontSize:11,color:'var(--text2)'}}>Evidența globală a tuturor angajaților</div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button className={`btn ${view==='overview'?'btn-primary':'btn-ghost'}`} onClick={()=>setView('overview')}>Sumar</button>
            <button className={`btn ${view==='tasks'?'btn-primary':'btn-ghost'}`} onClick={()=>setView('tasks')}>Toate taskurile</button>
            <div style={{width:1,background:'var(--border)',margin:'0 4px'}}/>
            <button className="btn btn-success" onClick={exportSummaryExcel} disabled={exporting} title="Export sumar per angajat">
              {exporting?'⏳':'📊'} Sumar Excel
            </button>
            <button className="btn btn-success" onClick={exportTasksExcel} disabled={exporting} title="Export toate taskurile">
              {exporting?'⏳':'📋'} Taskuri Excel
            </button>
          </div>
        </div>
        <div className="page-content">
          {/* Filters */}
          <div className="card" style={{padding:'12px 16px',marginBottom:16}}>
            <div className="filter-row">
              <span style={{fontSize:11,color:'var(--text2)'}}>Filtre:</span>
              <select className="select" value={filters.year} onChange={e=>setFilter('year',e.target.value)}>
                {[2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
              </select>
              <select className="select" value={filters.month} onChange={e=>setFilter('month',e.target.value)}>
                <option value="">Toate lunile</option>
                {MONTHS_RO.map((m,i)=><option key={i} value={String(i+1).padStart(2,'0')}>{m}</option>)}
              </select>
              <select className="select" value={filters.userId} onChange={e=>setFilter('userId',e.target.value)}>
                <option value="">Toți angajații</option>
                {users.map(u=><option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
              <select className="select" value={filters.projectId} onChange={e=>setFilter('projectId',e.target.value)}>
                <option value="">Toate proiectele</option>
                {projects.map(p=><option key={p.id} value={p.id}>{p.abbreviation}</option>)}
              </select>
              <select className="select" value={filters.tipPlan} onChange={e=>setFilter('tipPlan',e.target.value)}>
                <option value="">Toate tipurile</option>
                {['NOU','C_DE','C_LMT','FREI','NTR','MKT'].map(t=><option key={t} value={t}>{t}</option>)}
              </select>
              {(filters.month||filters.userId||filters.projectId||filters.tipPlan||filters.status)&&(
                <button className="btn btn-ghost btn-sm" onClick={()=>setFilters(f=>({...f,month:'',userId:'',projectId:'',status:'',tipPlan:''}))}>✕ Reset</button>
              )}
            </div>
          </div>

          {view==='overview' ? (
            <>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
                {[{label:'Taskuri',value:tasks.length},{label:'Total ore',value:`${totalHours.toFixed(1)}h`},{label:'Terminate',value:terminated},{label:'NOU terminate',value:nouTerminated}].map(({label,value})=>(
                  <div key={label} className="stat-card" style={{padding:'14px 18px'}}>
                    <p className="stat-label">{label}</p>
                    <p className="stat-value" style={{fontSize:22}}>{value}</p>
                  </div>
                ))}
              </div>

              <div className="card" style={{marginBottom:16}}>
                <div className="card-head">
                  <div className="card-title">Sumar per angajat</div>
                  <button className="btn btn-success btn-sm" onClick={exportSummaryExcel} disabled={exporting}>📊 Export Excel</button>
                </div>
                <div style={{overflowX:'auto'}}>
                  <table>
                    <thead><tr><th>Angajat</th><th>Ore</th><th>Zile</th><th>NOU✓</th><th>C_DE✓</th><th>C_LMT✓</th><th>FREI✓</th><th>NTR✓</th><th>MKT✓</th></tr></thead>
                    <tbody>
                      {userSummary.map(u=>(
                        <tr key={u.id}>
                          <td><div style={{fontWeight:700,color:'var(--text)'}}>{u.full_name}</div><div style={{fontSize:10,color:'var(--text3)',fontFamily:'var(--mono)'}}>@{u.username}</div></td>
                          <td style={{fontFamily:'var(--mono)',fontWeight:700,color:'var(--acc)'}}>{u.hours.toFixed(1)}h</td>
                          <td style={{fontFamily:'var(--mono)'}}>{u.days}</td>
                          {['NOU','C_DE','C_LMT','FREI','NTR','MKT'].map(k=>(
                            <td key={k}><span className={`badge badge-${k.toLowerCase().replace('_','')}`}>{u.tipCounts[k]||0}</span></td>
                          ))}
                        </tr>
                      ))}
                      <tr style={{background:'rgba(59,130,246,0.05)'}}>
                        <td style={{fontWeight:700,color:'var(--text2)'}}>TOTAL</td>
                        <td style={{fontFamily:'var(--mono)',fontWeight:700,color:'var(--acc)'}}>{totalHours.toFixed(1)}h</td>
                        <td style={{fontFamily:'var(--mono)'}}>{new Set(tasks.map(t=>t.task_date)).size}</td>
                        {['NOU','C_DE','C_LMT','FREI','NTR','MKT'].map(k=>(
                          <td key={k}><span className={`badge badge-${k.toLowerCase().replace('_','')}`}>{tasks.filter(t=>t.tip_plan===k&&t.status==='TERMINAT').length}</span></td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {!filters.month && !filters.userId && (
                <div className="card" style={{padding:24}}>
                  <h2 style={{fontSize:13,fontWeight:700,marginBottom:16,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'.06em'}}>Ore pe angajat / lună — {filters.year}</h2>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={chartData} barSize={10}>
                      <XAxis dataKey="month" tick={{fill:'var(--text3)',fontSize:11}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fill:'var(--text3)',fontSize:11}} axisLine={false} tickLine={false} unit="h"/>
                      <Tooltip contentStyle={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text)'}} formatter={(v:any)=>[`${Number(v).toFixed(1)}h`]}/>
                      <Legend wrapperStyle={{fontSize:11,color:'var(--text2)'}}/>
                      {users.map((u,i)=><Bar key={u.id} dataKey={u.username} fill={USER_COLORS[i%USER_COLORS.length]} radius={[3,3,0,0]}/>)}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          ) : (
            <div className="card">
              <div className="card-head">
                <div><div className="card-title">{tasks.length} taskuri</div></div>
                <button className="btn btn-success btn-sm" onClick={exportTasksExcel} disabled={exporting}>📋 Export Excel</button>
              </div>
              {loading ? (
                <div style={{padding:60,textAlign:'center',color:'var(--text3)'}}>Se încarcă...</div>
              ) : (
                <div style={{overflowX:'auto'}}>
                  <table>
                    <thead><tr><th>Data</th><th>Angajat</th><th>Proiect</th><th>Bauteil</th><th>SCH/BEW</th><th>Nr. Plan</th><th>Etaj</th><th>Descriere</th><th>Status</th><th>Tip</th><th>Ore</th></tr></thead>
                    <tbody>
                      {tasks.slice(0,300).map(t=>(
                        <tr key={t.id}>
                          <td style={{fontFamily:'var(--mono)',fontSize:11,whiteSpace:'nowrap'}}>{t.task_date}</td>
                          <td style={{fontSize:11,color:'var(--text)'}}>{t.profile?.full_name}</td>
                          <td><div style={{fontWeight:600,fontSize:11,color:'var(--text)'}}>{t.project?.abbreviation||'—'}</div></td>
                          <td style={{fontSize:11,color:'var(--text2)'}}>{t.bauteil?.name||'—'}</td>
                          <td style={{fontSize:11}}>{t.sch_bew_gen||'—'}</td>
                          <td style={{fontFamily:'var(--mono)',fontSize:11}}>{t.plan_number||'—'}</td>
                          <td style={{fontSize:11}}>{t.floor||'—'}</td>
                          <td style={{maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:11,color:'var(--text)'}}>{t.plan_description||'—'}</td>
                          <td><span className={`badge ${STATUS_BADGE[t.status]}`}>{STATUS_LABEL[t.status]}</span></td>
                          <td>{t.tip_plan&&<span className={`badge ${TIP_BADGE[t.tip_plan]||'badge-gray'}`}>{t.tip_plan}</span>}</td>
                          <td style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--acc)'}}>{t.hours_worked?`${Number(t.hours_worked).toFixed(2)}h`:'—'}</td>
                        </tr>
                      ))}
                      {tasks.length>300&&<tr><td colSpan={11} style={{textAlign:'center',padding:16,color:'var(--text3)',fontSize:11}}>Afișate primele 300. Exportă Excel pentru toate.</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
