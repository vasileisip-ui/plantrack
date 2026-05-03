'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase, Profile, MONTHS_RO } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'
import { format } from 'date-fns'

export default function AdminPage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ users:0, projects:0, total_hours:0, nou_this_month:0 })
  const [userStats, setUserStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const currentMonth = format(new Date(), 'yyyy-MM')
  const monthName = MONTHS_RO[new Date().getMonth()]

  useEffect(() => {
    if (!profile || profile.role !== 'admin') return
    fetchAdminData()
  }, [profile])

  async function fetchAdminData() {
    const [usersRes, projectsRes, tasksRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'user'),
      supabase.from('projects').select('*').eq('active', true),
      supabase.from('tasks').select('user_id,hours_worked,tip_plan,status,month').like('month', currentMonth)
    ])
    const users: Profile[] = usersRes.data || []
    const tasks = tasksRes.data || []
    const total_hours = tasks.reduce((s: number, t: any) => s + (t.hours_worked || 0), 0)
    const nou_this_month = tasks.filter((t: any) => t.tip_plan === 'NOU' && t.status === 'TERMINAT').length
    setStats({ users: users.length, projects: (projectsRes.data || []).length, total_hours, nou_this_month })

    const perUser: Record<string, any> = {}
    users.forEach(u => { perUser[u.id] = { ...u, hours:0, terminated:0, nou:0, cde:0, clmt:0, frei:0 } })
    tasks.forEach((t: any) => {
      if (!perUser[t.user_id]) return
      perUser[t.user_id].hours += t.hours_worked || 0
      if (t.status === 'TERMINAT') {
        perUser[t.user_id].terminated++
        if (t.tip_plan === 'NOU') perUser[t.user_id].nou++
        if (t.tip_plan === 'C_DE') perUser[t.user_id].cde++
        if (t.tip_plan === 'C_LMT') perUser[t.user_id].clmt++
        if (t.tip_plan === 'FREI') perUser[t.user_id].frei++
      }
    })
    setUserStats(Object.values(perUser).sort((a, b) => b.hours - a.hours))
    setLoading(false)
  }

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-wrap">
        <div className="topbar">
          <div>
            <div style={{ fontSize:16, fontWeight:700, letterSpacing:'-0.02em', color:'var(--text)' }}>Panou administrare</div>
            <div style={{ fontSize:11, color:'var(--text2)' }}>Vizualizare generală — {monthName} {new Date().getFullYear()}</div>
          </div>
          <Link href="/admin/reports" className="btn btn-ghost btn-sm">📊 Rapoarte complete</Link>
        </div>

        <div className="page-content">
          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
            {[
              { label:'Utilizatori activi', value:stats.users, color:'var(--acc)', href:'/admin/users', icon:'👥' },
              { label:'Proiecte active', value:stats.projects, color:'var(--purple)', href:'/admin/projects', icon:'📁' },
              { label:'Ore luna curentă', value:`${stats.total_hours.toFixed(0)}h`, color:'var(--green)', href:'/admin/reports', icon:'⏱' },
              { label:'Planuri NOU term.', value:stats.nou_this_month, color:'var(--yellow)', href:'/admin/reports', icon:'⭐' },
            ].map(({ label, value, color, href, icon }) => (
              <Link key={label} href={href} style={{ textDecoration:'none' }}>
                <div className="stat-card" style={{ transition:'border-color .15s' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = color)}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--border)')}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                      <p className="stat-label">{label}</p>
                      <p className="stat-value" style={{ color, fontSize:28 }}>{value}</p>
                    </div>
                    <div style={{ width:36, height:36, borderRadius:9, background:`${color}20`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>{icon}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* User performance table */}
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Performanță utilizatori — {monthName} {new Date().getFullYear()}</div>
                <div className="card-sub">ore lucrate, planuri finalizate pe tipuri</div>
              </div>
            </div>
            {loading ? (
              <div style={{ padding:40, textAlign:'center', color:'var(--text3)' }}>Se încarcă...</div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Angajat</th>
                      <th>Ore lucrate</th>
                      <th>NOU ✓</th>
                      <th>C_DE ✓</th>
                      <th>C_LMT ✓</th>
                      <th>FREI ✓</th>
                      <th>Total term.</th>
                      <th>Progres</th>
                      <th>Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userStats.map(u => {
                      const pct = Math.min(100, (u.hours / (22 * 8)) * 100)
                      return (
                        <tr key={u.id}>
                          <td>
                            <div style={{ fontWeight:700, color:'var(--text)' }}>{u.full_name}</div>
                            <div style={{ fontSize:10, color:'var(--text3)', fontFamily:'var(--mono)' }}>@{u.username}</div>
                          </td>
                          <td style={{ fontFamily:'var(--mono)', fontWeight:700, color:'var(--acc)' }}>{u.hours.toFixed(1)}h</td>
                          <td><span className="badge badge-nou">{u.nou}</span></td>
                          <td><span className="badge badge-cde">{u.cde}</span></td>
                          <td><span className="badge badge-clmt">{u.clmt}</span></td>
                          <td><span className="badge badge-frei">{u.frei}</span></td>
                          <td style={{ fontFamily:'var(--mono)' }}>{u.terminated}</td>
                          <td style={{ minWidth:120 }}>
                            <div className="pbar-wrap">
                              <div className="pbar">
                                <div className="pbar-fill" style={{ width:`${pct}%`, background: pct>80?'var(--green)':pct>50?'var(--yellow)':'var(--red)' }} />
                              </div>
                              <span style={{ fontSize:10, color:'var(--text3)', fontFamily:'var(--mono)', minWidth:32 }}>{pct.toFixed(0)}%</span>
                            </div>
                          </td>
                          <td>
                            <Link href={`/admin/reports?user=${u.id}`} className="btn btn-ghost btn-sm">Detalii</Link>
                          </td>
                        </tr>
                      )
                    })}
                    {userStats.length === 0 && (
                      <tr><td colSpan={9} style={{ textAlign:'center', padding:40, color:'var(--text3)' }}>Niciun task înregistrat în {monthName}</td></tr>
                    )}
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
