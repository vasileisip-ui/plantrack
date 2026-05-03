'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase, MONTHS_RO } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { exportExcel, TASKS_COLUMNS, SUMMARY_COLUMNS, flattenTask } from '@/lib/exportExcel'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const MONTHS_SHORT = ['Ian','Feb','Mar','Apr','Mai','Iun','Iul','Aug','Sep','Oct','Nov','Dec']
const TIP_COLORS:Record<string,string> = {NOU:'#3b82f6',C_DE:'#a855f7',C_LMT:'#f97316',FREI:'#22c55e',NTR:'#64748b',MKT:'#ef4444'}

export default function MyStatsPage() {
  const {profile} = useAuth()
  const [year, setYear] = useState(new Date().getFullYear())
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [tipData, setTipData] = useState<any[]>([])
  const [projectData, setProjectData] = useState<any[]>([])
  const [allTasks, setAllTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => { if(profile) fetchStats() }, [profile, year])

  async function fetchStats() {
    setLoading(true)
    const {data} = await supabase.from('tasks')
      .select('*, task_date, month, hours_worked, status, tip_plan, project:projects(abbreviation,name), bauteil:bauteile(name), profile:profiles(full_name,username)')
      .eq('user_id',profile!.id).gte('task_date',`${year}-01-01`).lte('task_date',`${year}-12-31`)
      .order('task_date').order('task_number')
    if(!data){setLoading(false);return}
    setAllTasks(data)
    const byMonth:Record<number,number> = {}
    for(let i=1;i<=12;i++)byMonth[i]=0
    data.forEach(t=>{const m=parseInt(t.month?.split('-')[1]||'0');if(m)byMonth[m]+=t.hours_worked||0})
    setMonthlyData(Object.entries(byMonth).map(([m,h])=>({month:MONTHS_SHORT[parseInt(m)-1],ore:parseFloat((h as number).toFixed(1))})))
    const tipCount:Record<string,number>={}
    data.filter(t=>t.status==='TERMINAT'&&t.tip_plan).forEach(t=>{tipCount[t.tip_plan!]=(tipCount[t.tip_plan!]||0)+1})
    setTipData(Object.entries(tipCount).map(([name,value])=>({name,value})))
    const projHours:Record<string,number>={}
    data.filter(t=>(t.project as any)?.abbreviation).forEach(t=>{const a=(t.project as any).abbreviation;projHours[a]=(projHours[a]||0)+(t.hours_worked||0)})
    setProjectData(Object.entries(projHours).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([name,value])=>({name,ore:parseFloat((value as number).toFixed(1))})))
    setLoading(false)
  }

  async function exportTasksExcel() {
    setExporting(true)
    const rows = allTasks.map(flattenTask)
    await exportExcel(rows, TASKS_COLUMNS, `PlanTracker_${profile?.username}_${year}`)
    setExporting(false)
  }

  async function exportSummaryExcel() {
    setExporting(true)
    const tipCounts:Record<string,number>={NOU:0,C_DE:0,C_LMT:0,FREI:0,NTR:0,MKT:0}
    allTasks.filter(t=>t.status==='TERMINAT'&&t.tip_plan).forEach(t=>{if(tipCounts[t.tip_plan]!==undefined)tipCounts[t.tip_plan]++})
    const rows = [{
      full_name: profile?.full_name || '',
      username: `@${profile?.username}`,
      hours: allTasks.reduce((s,t)=>s+(t.hours_worked||0),0),
      days: new Set(allTasks.map(t=>t.task_date)).size,
      ...tipCounts,
      terminated: allTasks.filter(t=>t.status==='TERMINAT').length,
    }]
    // Also add monthly breakdown
    const monthlyRows = MONTHS_SHORT.map((m,idx) => {
      const monthStr = `${year}-${String(idx+1).padStart(2,'0')}`
      const monthTasks = allTasks.filter(t=>t.month===monthStr)
      const mc:Record<string,number>={NOU:0,C_DE:0,C_LMT:0,FREI:0,NTR:0,MKT:0}
      monthTasks.filter(t=>t.status==='TERMINAT'&&t.tip_plan).forEach(t=>{if(mc[t.tip_plan]!==undefined)mc[t.tip_plan]++})
      return {
        full_name: m,
        username: '',
        hours: monthTasks.reduce((s,t)=>s+(t.hours_worked||0),0),
        days: new Set(monthTasks.filter(t=>t.hours_worked).map(t=>t.task_date)).size,
        ...mc,
        terminated: monthTasks.filter(t=>t.status==='TERMINAT').length,
      }
    })
    await exportExcel([...rows,...monthlyRows], SUMMARY_COLUMNS, `PlanTracker_Sumar_${profile?.username}_${year}`)
    setExporting(false)
  }

  const totalHours = monthlyData.reduce((s,m)=>s+m.ore,0)
  const totalTerminated = tipData.reduce((s,t)=>s+t.value,0)
  const nouCount = tipData.find(t=>t.name==='NOU')?.value||0

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-wrap">
        <div className="topbar">
          <div>
            <div style={{fontSize:16,fontWeight:700,letterSpacing:'-0.02em',color:'var(--text)'}}>Statistici personale</div>
            <div style={{fontSize:11,color:'var(--text2)'}}>Performanța ta în {year}</div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <div style={{display:'flex',gap:4}}>
              {[2024,2025,2026,2027].map(y=>(
                <button key={y} className={`btn btn-sm ${year===y?'btn-primary':'btn-ghost'}`} onClick={()=>setYear(y)}>{y}</button>
              ))}
            </div>
            <div style={{width:1,background:'var(--border)',margin:'0 4px'}}/>
            <button className="btn btn-success btn-sm" onClick={exportSummaryExcel} disabled={exporting} title="Export sumar lunar">
              {exporting?'⏳':'📊'} Sumar Excel
            </button>
            <button className="btn btn-success btn-sm" onClick={exportTasksExcel} disabled={exporting} title="Export toate taskurile anului">
              {exporting?'⏳':'📋'} Taskuri Excel
            </button>
          </div>
        </div>

        <div className="page-content">
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:20}}>
            {[{label:'Total ore',value:`${totalHours.toFixed(0)}h`,color:'var(--acc)'},{label:'Planuri terminate',value:totalTerminated,color:'var(--green)'},{label:'Planuri NOU',value:nouCount,color:'var(--purple)'}].map(({label,value,color})=>(
              <div key={label} className="stat-card">
                <p className="stat-label">{label}</p>
                <p className="stat-value" style={{color,fontSize:28}}>{value}</p>
              </div>
            ))}
          </div>

          <div className="card" style={{padding:24,marginBottom:16}}>
            <h2 style={{fontSize:13,fontWeight:700,marginBottom:16,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'.06em'}}>Ore lucrate pe luni — {year}</h2>
            {loading?<div style={{height:200,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text3)'}}>Se încarcă...</div>:(
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyData} barSize={22}>
                  <XAxis dataKey="month" tick={{fill:'var(--text3)',fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:'var(--text3)',fontSize:11}} axisLine={false} tickLine={false} unit="h"/>
                  <Tooltip contentStyle={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text)'}} formatter={(v:any)=>[`${v}h`,'Ore']}/>
                  <Bar dataKey="ore" fill="var(--acc)" radius={[5,5,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div className="card" style={{padding:24}}>
              <h2 style={{fontSize:13,fontWeight:700,marginBottom:16,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'.06em'}}>Planuri terminate pe tip</h2>
              {tipData.length===0?<div style={{padding:40,textAlign:'center',color:'var(--text3)'}}>Fără date</div>:(
                <div style={{display:'flex',alignItems:'center',gap:16}}>
                  <ResponsiveContainer width={150} height={150}>
                    <PieChart>
                      <Pie data={tipData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={3}>
                        {tipData.map((_,i)=><Cell key={i} fill={TIP_COLORS[tipData[i].name]||'#64748b'}/>)}
                      </Pie>
                      <Tooltip contentStyle={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text)'}}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{flex:1}}>
                    {tipData.map(t=>(
                      <div key={t.name} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 0',borderBottom:'1px solid var(--border)'}}>
                        <div style={{display:'flex',alignItems:'center',gap:7}}>
                          <div style={{width:10,height:10,borderRadius:'50%',background:TIP_COLORS[t.name]||'#64748b'}}/>
                          <span style={{fontSize:12,fontFamily:'var(--mono)',fontWeight:600,color:'var(--text)'}}>{t.name}</span>
                        </div>
                        <span style={{fontSize:14,fontWeight:700,color:'var(--text)'}}>{t.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="card" style={{padding:24}}>
              <h2 style={{fontSize:13,fontWeight:700,marginBottom:16,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'.06em'}}>Ore pe proiect (top 10)</h2>
              {projectData.length===0?<div style={{padding:40,textAlign:'center',color:'var(--text3)'}}>Fără date</div>:(
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={projectData} layout="vertical" barSize={12}>
                    <XAxis type="number" tick={{fill:'var(--text3)',fontSize:11}} axisLine={false} tickLine={false} unit="h"/>
                    <YAxis dataKey="name" type="category" tick={{fill:'var(--text2)',fontSize:11}} axisLine={false} tickLine={false} width={90}/>
                    <Tooltip contentStyle={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text)'}} formatter={(v:any)=>[`${v}h`,'Ore']}/>
                    <Bar dataKey="ore" fill="var(--purple)" radius={[0,4,4,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
