'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase, Task, MONTHS_RO } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'

const TIP_BADGE: Record<string, string> = { NOU:'badge-nou',C_DE:'badge-cde',C_LMT:'badge-clmt',FREI:'badge-frei',NTR:'badge-ntr',MKT:'badge-mkt',MKT_45:'badge-mkt' }
const STATUS_BADGE: Record<string, string> = { IN_LUCRU:'badge-inlucru',PAUZA:'badge-pauza',TERMINAT:'badge-terminat' }
const STATUS_LABEL: Record<string, string> = { IN_LUCRU:'In lucru',PAUZA:'Pauza',TERMINAT:'Terminat' }
const SCH_BADGE: Record<string, string> = { SCH:'badge-sch',BEW:'badge-bew',GENERALITATI:'badge-gen' }

export default function Dashboard() {
  const { profile } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const today = format(new Date(), 'yyyy-MM-dd')
  const currentMonth = format(new Date(), 'yyyy-MM')
  const [monthStats, setMonthStats] = useState({ total_hours:0, terminated:0, new_plans:0, working_days:0 })

  useEffect(() => {
    if (!profile) return
    supabase.from('tasks').select('*, project:projects(name,abbreviation), bauteil:bauteile(name)')
      .eq('user_id', profile.id).eq('task_date', today).order('task_number')
      .then(({ data }) => { setTasks(data || []); setLoading(false) })
    supabase.from('tasks').select('hours_worked,status,tip_plan,task_date')
      .eq('user_id', profile.id).like('month', currentMonth)
      .then(({ data }) => {
        if (!data) return
        const hours = data.reduce((s, t) => s + (t.hours_worked || 0), 0)
        const terminated = data.filter(t => t.status === 'TERMINAT').length
        const new_plans = data.filter(t => t.tip_plan === 'NOU' && t.status === 'TERMINAT').length
        const days = new Set(data.map(t => t.task_date)).size
        setMonthStats({ total_hours: hours, terminated, new_plans, working_days: days })
      })
  }, [profile])

  const month = new Date().getMonth()

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-wrap">
        <div className="topbar">
          <div>
            <div style={{ fontSize:18, fontWeight:700, letterSpacing:'-0.02em', color:'var(--text)' }}>
              Bună ziua, {profile?.full_name?.split(' ')[0]} 👋
            </div>
            <div style={{ color:'var(--text2)', marginTop:4, fontSize:12 }}>
              {format(new Date(), "EEEE, d MMMM yyyy", { locale: ro })}
            </div>
          </div>
          <Link href="/tasks" className="btn btn-primary">📋 Planuri lunare</Link>
        </div>

        <div className="page-content">
          {/* Stats */}
          <div className="stats-grid">
            {[
              { label:'Ore luna', value:`${monthStats.total_hours.toFixed(1)}h`, sub:MONTHS_RO[month], color:'var(--acc)' },
              { label:'Terminate', value:monthStats.terminated, sub:'planuri', color:'var(--green)' },
              { label:'Planuri NOU', value:monthStats.new_plans, sub:'NOU terminat', color:'var(--purple)' },
              { label:'Zile lucrate', value:monthStats.working_days, sub:MONTHS_RO[month], color:'var(--yellow)' },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="stat-card">
                <p className="stat-label">{label}</p>
                <p className="stat-value" style={{ color }}>{value}</p>
                <p className="stat-sub">{sub}</p>
              </div>
            ))}
          </div>

          {/* Today's tasks */}
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Planuri de azi</div>
                <div className="card-sub">{tasks.length} înregistrări · {today}</div>
              </div>
              <Link href="/tasks" className="btn btn-ghost btn-sm">Foaie lunară →</Link>
            </div>

            {loading ? (
              <div style={{ padding:40, textAlign:'center', color:'var(--text3)' }}>Se încarcă...</div>
            ) : tasks.length === 0 ? (
              <div style={{ padding:48, textAlign:'center' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
                <p style={{ color:'var(--text2)', marginBottom:16 }}>Niciun plan înregistrat azi</p>
                <Link href="/tasks" className="btn btn-primary">Mergi la foaia lunară</Link>
              </div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table>
                  <thead><tr><th>#</th><th>Proiect</th><th>Tip</th><th>Nr. Plan</th><th>Descriere</th><th>Status</th><th>Ore</th></tr></thead>
                  <tbody>
                    {tasks.map(task => (
                      <tr key={task.id}>
                        <td style={{ fontFamily:'var(--mono)', color:'var(--text3)', fontSize:11 }}>{task.task_number}</td>
                        <td>
                          <div style={{ fontWeight:600, color:'var(--text)' }}>{task.project?.abbreviation || '—'}</div>
                          {task.bauteil && <div style={{ fontSize:10, color:'var(--text3)' }}>{task.bauteil.name}</div>}
                        </td>
                        <td>{task.tip_plan && <span className={`badge ${TIP_BADGE[task.tip_plan]}`}>{task.tip_plan}</span>}</td>
                        <td style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text)' }}>{task.plan_number || '—'}</td>
                        <td style={{ maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--text)' }}>{task.plan_description || '—'}</td>
                        <td><span className={`badge ${STATUS_BADGE[task.status]}`}>{STATUS_LABEL[task.status]}</span></td>
                        <td style={{ fontFamily:'var(--mono)', color:'var(--acc)', fontWeight:600 }}>{task.hours_worked ? `${Number(task.hours_worked).toFixed(2)}h` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
