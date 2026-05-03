'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase, Profile, MONTHS_RO } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'
import { format } from 'date-fns'
import TaskComments from '@/components/TaskComments'
import TaskHistory from '@/components/TaskHistory'

export default function AdminPage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ users:0, projects:0, total_hours:0, nou_this_month:0 })
  const [userStats, setUserStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const currentMonth = format(new Date(), 'yyyy-MM')
  const monthName = MONTHS_RO[new Date().getMonth()]

  // Modal pentru taskurile unui angajat
  const [showTasksModal, setShowTasksModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [userTasks, setUserTasks] = useState<any[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'comments'|'history'>('comments')
  const [taskMonth, setTaskMonth] = useState(format(new Date(), 'yyyy-MM'))

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

  async function openUserTasks(u: any) {
    setSelectedUser(u)
    setSelectedTask(null)
    setShowTasksModal(true)
    fetchUserTasks(u.id, taskMonth)
  }

  async function fetchUserTasks(userId: string, month: string) {
    setLoadingTasks(true)
    const { data } = await supabase.from('tasks')
      .select('*, project:projects(name,abbreviation), bauteil:bauteile(name)')
      .eq('user_id', userId)
      .like('month', month)
      .order('task_date').order('task_number')
    setUserTasks(data || [])
    setLoadingTasks(false)
  }

  function changeMonth(newMonth: string) {
    setTaskMonth(newMonth)
    setSelectedTask(null)
    if (selectedUser) fetchUserTasks(selectedUser.id, newMonth)
  }

  const TIP_BADGE: Record<string,string> = { NOU:'badge-nou',C_DE:'badge-cde',C_LMT:'badge-clmt',FREI:'badge-frei',NTR:'badge-ntr',MKT:'badge-mkt' }
  const STATUS_BADGE: Record<string,string> = { IN_LUCRU:'badge-inlucru',PAUZA:'badge-pauza',TERMINAT:'badge-terminat' }
  const STATUS_LABEL: Record<string,string> = { IN_LUCRU:'In lucru',PAUZA:'Pauza',TERMINAT:'Terminat' }

  // Group tasks by date
  const tasksByDate: Record<string, any[]> = {}
  userTasks.forEach(t => { if (!tasksByDate[t.task_date]) tasksByDate[t.task_date] = []; tasksByDate[t.task_date].push(t) })

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
                <div className="card-title">Performanță angajați — {monthName} {new Date().getFullYear()}</div>
                <div className="card-sub">Click pe "👁 Taskuri" pentru a vedea și comenta taskurile angajatului</div>
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
                            <button className="btn btn-primary btn-sm" onClick={() => openUserTasks(u)}>
                              👁 Taskuri & Comentarii
                            </button>
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

      {/* MODAL TASKURI ANGAJAT */}
      {showTasksModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowTasksModal(false)}>
          <div className="modal" style={{ maxWidth:'95vw', width:1100, maxHeight:'90vh' }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              <div>
                <span>👤 {selectedUser.full_name}</span>
                <span style={{ fontSize:12, color:'var(--text2)', marginLeft:10 }}>@{selectedUser.username}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                {/* Month selector */}
                <input type="month" className="input" style={{ width:'auto' }} value={taskMonth}
                  onChange={e => changeMonth(e.target.value)} />
                <button className="modal-close" onClick={() => setShowTasksModal(false)}>✕</button>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns: selectedTask ? '1fr 380px' : '1fr', gap:16, maxHeight:'70vh', overflow:'hidden' }}>
              {/* Tasks list */}
              <div style={{ overflowY:'auto' }}>
                {loadingTasks ? (
                  <div style={{ padding:40, textAlign:'center', color:'var(--text3)' }}>Se încarcă...</div>
                ) : userTasks.length === 0 ? (
                  <div style={{ padding:40, textAlign:'center', color:'var(--text3)' }}>
                    <div style={{ fontSize:32, marginBottom:8 }}>📋</div>
                    Niciun task în această lună
                  </div>
                ) : (
                  Object.entries(tasksByDate).sort(([a],[b]) => a.localeCompare(b)).map(([date, dayTasks]) => (
                    <div key={date} style={{ marginBottom:12 }}>
                      <div style={{ padding:'6px 12px', background:'var(--bg3)', borderRadius:'8px 8px 0 0', fontSize:11, fontWeight:700, color:'var(--acc)', display:'flex', justifyContent:'space-between' }}>
                        <span>{new Date(date+'T00:00:00').toLocaleDateString('ro-RO',{weekday:'long',day:'numeric',month:'long'})}</span>
                        <span style={{ color:'var(--green)' }}>{dayTasks.reduce((s,t)=>s+(t.hours_worked||0),0).toFixed(2)}h</span>
                      </div>
                      {dayTasks.map(task => (
                        <div key={task.id} onClick={() => { setSelectedTask(task); setActiveTab('comments') }}
                          style={{
                            padding:'10px 12px', border:'1px solid var(--border)', borderTop:'none',
                            cursor:'pointer', transition:'all 0.12s',
                            background: selectedTask?.id===task.id ? 'rgba(59,130,246,0.1)' : 'var(--bg2)',
                            borderLeft: selectedTask?.id===task.id ? '3px solid var(--acc)' : '3px solid transparent',
                          }}
                          onMouseEnter={e => { if(selectedTask?.id!==task.id) (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.03)' }}
                          onMouseLeave={e => { if(selectedTask?.id!==task.id) (e.currentTarget as HTMLElement).style.background='var(--bg2)' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--text3)' }}>#{task.task_number}</span>
                              <span style={{ fontWeight:700, fontSize:12, color:'var(--text)' }}>{task.project?.abbreviation || '—'}</span>
                              {task.bauteil && <span style={{ fontSize:10, color:'var(--text3)' }}>{task.bauteil.name}</span>}
                            </div>
                            <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                              {task.tip_plan && <span className={`badge ${TIP_BADGE[task.tip_plan]||'badge-gray'}`}>{task.tip_plan}</span>}
                              <span className={`badge ${STATUS_BADGE[task.status]}`}>{STATUS_LABEL[task.status]}</span>
                              {task.hours_worked && <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--acc)', fontWeight:700 }}>{Number(task.hours_worked).toFixed(2)}h</span>}
                            </div>
                          </div>
                          {task.plan_description && (
                            <div style={{ fontSize:11, color:'var(--text2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {task.plan_number && <span style={{ fontFamily:'var(--mono)', marginRight:6 }}>{task.plan_number}</span>}
                              {task.plan_description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>

              {/* Comments & History panel */}
              {selectedTask && (
                <div style={{ borderLeft:'1px solid var(--border)', paddingLeft:16, overflowY:'auto' }}>
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontWeight:700, fontSize:13, color:'var(--text)', marginBottom:4 }}>
                      #{selectedTask.task_number} — {selectedTask.project?.abbreviation || '—'}
                    </div>
                    {selectedTask.plan_description && (
                      <div style={{ fontSize:11, color:'var(--text2)' }}>{selectedTask.plan_description}</div>
                    )}
                  </div>
                  <div className="tab-row" style={{ marginBottom:14 }}>
                    <button className={`tab-btn ${activeTab==='comments'?'active':''}`} onClick={() => setActiveTab('comments')}>💬 Comentarii</button>
                    <button className={`tab-btn ${activeTab==='history'?'active':''}`} onClick={() => setActiveTab('history')}>📋 Istoric</button>
                  </div>
                  {activeTab === 'comments' && <TaskComments taskId={selectedTask.id} />}
                  {activeTab === 'history' && <TaskHistory taskId={selectedTask.id} />}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
