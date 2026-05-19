'use client'
import { useEffect, useState, useCallback } from 'react'
import TaskComments from '@/components/TaskComments'
import TaskHistory from '@/components/TaskHistory'
import { useAuth } from '@/hooks/useAuth'
import { supabase, Task, MONTHS_RO, TIP_BADGE, STATUS_BADGE, STATUS_LABEL, SCH_BADGE } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { format } from 'date-fns'

const DEFAULT_TASKS_PER_DAY = 15
const DAY_NAMES = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm']
const FLOORS = ['','BO','KG','EG','1.OG','2.OG','3.OG','4.OG','5.OG','6.OG','7.OG','8.OG','9.OG','SG','DG','-']
const TIPS = ['','NOU','C_DE','C_LMT','FREI','NTR','MKT','MKT_45','-']
const SCHS = ['','SCH','BEW','GENERALITATI']
const STATUSES = ['IN_LUCRU','PAUZA','TERMINAT']

function getDaysInMonth(year: number, month: number) { return new Date(year, month, 0).getDate() }

function calcHours(start?: string, pause?: string, end?: string): number | null {
  if (!start) return null
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  if (end) { if (pause) return Math.max(0, toMin(pause) - toMin(start)) / 60; return Math.max(0, toMin(end) - toMin(start)) / 60 }
  if (pause) return Math.max(0, toMin(pause) - toMin(start)) / 60
  return null
}

export default function TasksPage() {
  const { profile } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [holidays, setHolidays] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'day'|'month'>('day')
  const [projects, setProjects] = useState<any[]>([])
  const [bauteile, setBauteile] = useState<any[]>([])
  const [descLists, setDescLists] = useState<Record<string, string[]>>({ desc_sch:[], desc_bew:[], desc_gen:[] })
  // inline editing
  const [editingCell, setEditingCell] = useState<string|null>(null) // "dateStr-taskNum"
  const [pendingSave, setPendingSave] = useState<Record<string, any>>({})

  const today = format(new Date(), 'yyyy-MM-dd')
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1
  const monthStr = `${year}-${String(month).padStart(2,'0')}`
  const daysInMonth = getDaysInMonth(year, month)

  useEffect(() => {
    if (!profile) return
    supabase.from('user_projects').select('project:projects(*)').eq('user_id', profile.id)
      .then(({ data }) => setProjects((data?.map((r: any) => r.project) || []).filter(Boolean)))
    supabase.from('holidays').select('holiday_date').eq('year', year)
      .then(({ data }) => setHolidays(new Set((data || []).map((h: any) => h.holiday_date))))
    // Fetch description lists
    supabase.from('list_items').select('list_name,value,order_index').in('list_name',['desc_sch','desc_bew','desc_gen']).eq('active',true).order('order_index')
      .then(({ data }) => {
        const lists: Record<string,string[]> = { desc_sch:[], desc_bew:[], desc_gen:[] }
        ;(data||[]).forEach((item: any) => { lists[item.list_name]?.push(item.value) })
        setDescLists(lists)
      })
  }, [profile, year])

  const fetchTasks = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    const { data } = await supabase.from('tasks')
      .select('*, project:projects(name,abbreviation), bauteil:bauteile(name)')
      .eq('user_id', profile.id).like('month', monthStr)
      .order('task_date').order('task_number')
    setTasks(data || [])
    setLoading(false)
  }, [profile, monthStr])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  // Load bauteile when project changes in pending
  async function loadBauteile(projId: string) {
    if (!projId) return []
    const { data } = await supabase.from('bauteile').select('*').eq('project_id', projId).order('order_index')
    return data || []
  }

  const tasksByDate: Record<string, Task[]> = {}
  tasks.forEach(t => { if (!tasksByDate[t.task_date]) tasksByDate[t.task_date] = []; tasksByDate[t.task_date].push(t) })

  // Summary
  const terminated = tasks.filter(t => t.status === 'TERMINAT')
  const counts: Record<string, number> = { NOU:0, C_LMT:0, C_DE:0, FREI:0, NTR:0, MKT:0 }
  terminated.forEach(t => { if (t.tip_plan && counts[t.tip_plan] !== undefined) counts[t.tip_plan]++ })
  const totalHours = tasks.filter(t => t.hours_worked).reduce((s, t) => s + (t.hours_worked || 0), 0)
  const workDays = new Set(tasks.filter(t => t.hours_worked).map(t => t.task_date)).size

  // Determine which days to show
  const daysToShow = viewMode === 'day'
    ? [parseInt(today.slice(8))]  // only today's day number
    : Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // Auto-scroll to today on mount
  useEffect(() => {
    if (viewMode === 'day') {
      setTimeout(() => {
        const el = document.getElementById(`day-${today}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 300)
    }
  }, [viewMode, today])

  async function saveCell(dateStr: string, taskNum: number, data: any, existingId?: string) {
    if (!profile) { alert('Eroare: utilizatorul nu este autentificat!'); return }
    const hours = calcHours(data.time_start, data.time_pause, data.time_end)
    const payload = {
      user_id: profile.id, task_date: dateStr, task_number: taskNum,
      project_id: data.project_id || null, bauteil_id: data.bauteil_id || null,
      sch_bew_gen: data.sch_bew_gen || null, plan_number: data.plan_number || null,
      floor: data.floor || null, plan_description: data.plan_description || null,
      status: data.status || 'IN_LUCRU', tip_plan: data.tip_plan || null,
      time_start: data.time_start || null, time_pause: data.time_pause || null,
      time_end: data.time_end || null, hours_worked: hours,
      correction_date: data.correction_date || null,
      verified: data.verified || false, notes: data.notes || null,
    }
    let error: any = null
    if (existingId) {
      const res = await supabase.from('tasks').update(payload).eq('id', existingId)
      error = res.error
    } else {
      const res = await supabase.from('tasks').insert(payload)
      error = res.error
    }
    if (error) { alert('Eroare la salvare: ' + error.message); return }
    fetchTasks()
  }

  function getCellKey(dateStr: string, taskNum: number) { return `${dateStr}-${taskNum}` }

  function getCellClasses(task: Task | undefined, colName: string): string {
    if (!task) return ''
    const s = task.status
    if (colName === 'time_start' && s === 'IN_LUCRU') return 'cell-highlight-start'
    if (colName === 'time_pause' && s === 'PAUZA') return 'cell-highlight-pause'
    if (colName === 'time_end' && s === 'TERMINAT') return 'cell-highlight-end'
    if (colName === 'correction_date' && (s === 'IN_LUCRU' || s === 'PAUZA') && task.tip_plan && ['C_DE','C_LMT'].includes(task.tip_plan)) return 'cell-highlight-corectie'
    return ''
  }

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-wrap">
        {/* TOPBAR */}
        <div className="topbar">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth()-1, 1))}>‹</button>
            <div>
              <div style={{ fontSize:16, fontWeight:700, letterSpacing:'-0.02em' }}>{MONTHS_RO[month-1]} {year}</div>
              <div style={{ fontSize:11, color:'var(--text2)' }}>Foaie de lucru lunară</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth()+1, 1))}>›</button>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <div className="view-mode-btns">
              <button className={`vmb ${viewMode==='day'?'active':''}`} onClick={() => setViewMode('day')}>Ziua curentă</button>
              <button className={`vmb ${viewMode==='month'?'active':''}`} onClick={() => setViewMode('month')}>Luna întreagă</button>
            </div>
          </div>
        </div>

        {/* SUMMARY BAR */}
        <div className="summary-bar">
          <span className="sum-name">{profile?.full_name}</span>
          <div className="sum-divider" />
          {Object.entries(counts).map(([k, v]) => (
            <div key={k} className="sum-item">
              <span className="sum-label">{k} ✓</span>
              <span className="sum-val" style={{ color:({NOU:'#3b82f6',C_LMT:'#f97316',C_DE:'#a855f7',FREI:'#22c55e',NTR:'#64748b',MKT:'#ef4444'} as any)[k] }}>{v}</span>
            </div>
          ))}
          <div className="sum-divider" />
          <div className="sum-item"><span className="sum-label">Total ore</span><span className="sum-val" style={{ color:'var(--acc)' }}>{totalHours.toFixed(2)}h</span></div>
          <div className="sum-item"><span className="sum-label">Zile lucrate</span><span className="sum-val" style={{ color:'var(--green)' }}>{workDays}</span></div>
        </div>

        {/* TABLE */}
        <div className="excel-wrap">
          {loading ? (
            <div style={{ padding:60, textAlign:'center', color:'var(--text3)' }}>Se încarcă...</div>
          ) : (
            <table className="excel-table">
              <thead>
                <tr>
                  <th style={{ width:70 }}>Luna / Zi</th>
                  <th style={{ width:36 }}>#</th>
                  <th style={{ width:130 }}>Proiect</th>
                  <th style={{ width:100 }}>Bauteil</th>
                  <th style={{ width:90 }}>SCH/BEW/GEN</th>
                  <th style={{ width:95 }}>Nr. Plan</th>
                  <th style={{ width:65 }}>Etaj</th>
                  <th style={{ minWidth:180 }}>Descriere</th>
                  <th style={{ width:90 }}>Status</th>
                  <th style={{ width:80 }}>Tip Plan</th>
                  <th style={{ width:65 }}>Început</th>
                  <th style={{ width:65 }}>Pauză</th>
                  <th style={{ width:65 }}>Terminat</th>
                  <th style={{ width:58 }}>Ore</th>
                  <th style={{ width:95 }}>Data Corecție</th>
                  <th style={{ width:70 }}>Verificat</th>
                  <th style={{ minWidth:140 }}>Observații</th>
                </tr>
              </thead>
              <tbody>
                {daysToShow.map(d => {
                  const dateStr = `${monthStr}-${String(d).padStart(2,'0')}`
                  const jsDate = new Date(year, month-1, d)
                  const dow = jsDate.getDay()
                  const isWeekend = dow === 0 || dow === 6
                  const isSarb = holidays.has(dateStr)
                  const isToday = dateStr === today
                  const dayTasks = tasksByDate[dateStr] || []
                  const dayHours = dayTasks.filter(t => t.hours_worked).reduce((s, t) => s + (t.hours_worked || 0), 0)
                  const taskMap: Record<number, Task> = {}
                  dayTasks.forEach(t => { taskMap[t.task_number] = t })

                  return [
                    <tr key={`day-${dateStr}`} id={`day-${dateStr}`} className={`day-hdr${isToday?' today':''}`}>
                      <td colSpan={17}>
                        <span style={{ color: isToday ? 'var(--acc)' : isSarb ? 'var(--red)' : isWeekend ? 'var(--text3)' : 'var(--text)', fontFamily:'var(--mono)', fontWeight: isToday ? 800 : 700 }}>
                          {isToday && '📍 '}{DAY_NAMES[dow]} {String(d).padStart(2,'0')}.{String(month).padStart(2,'0')}
                          {isToday && ' — AZI'}
                        </span>
                        {isSarb && <span className="badge badge-red" style={{ marginLeft:8, fontSize:10 }}>🎉 Sărbătoare</span>}
                        {isWeekend && !isSarb && <span className="badge badge-gray" style={{ marginLeft:8, fontSize:10 }}>weekend</span>}
                        {dayHours > 0 && <span style={{ float:'right', fontFamily:'var(--mono)', fontSize:12, color:'var(--green)' }}>{dayHours.toFixed(2)}h</span>}
                      </td>
                    </tr>,
                    ...Array.from({ length: DEFAULT_TASKS_PER_DAY }, (_, ti) => {
                      const taskNum = ti + 1
                      const task = taskMap[taskNum]
                      const cellKey = getCellKey(dateStr, taskNum)
                      const isRowToday = isToday

                      return (
                        <tr key={`${dateStr}-${taskNum}`} className={`task-row${task?' filled':''}${isRowToday?' today-row':''}`}>
                          <td className="c-num">{taskNum === 1 && <span style={{ fontSize:9, color:'var(--text3)' }}>{String(d).padStart(2,'0')}</span>}</td>
                          <td className="c-num" style={{ color:'var(--text2)' }}>{taskNum}</td>

                          {/* Proiect dropdown inline */}
                          <td style={{ padding:'2px 4px' }}>
                            <ProjectCell
                              projects={projects}
                              value={task?.project_id || ''}
                              task={task}
                              dateStr={dateStr}
                              taskNum={taskNum}
                              onSave={saveCell}
                              fetchTasks={fetchTasks}
                              profile={profile}
                              descLists={descLists}
                            />
                          </td>

                          {/* Bauteil */}
                          <td style={{ fontSize:11, color:'var(--text2)', padding:'2px 6px' }}>{task?.bauteil?.name || ''}</td>

                          {/* SCH/BEW/GEN */}
                          <td style={{ textAlign:'center', padding:'2px 4px' }}>
                            {task?.sch_bew_gen && <span className={`badge ${SCH_BADGE[task.sch_bew_gen]}`}>{task.sch_bew_gen}</span>}
                          </td>

                          {/* Nr Plan */}
                          <td style={{ fontFamily:'var(--mono)', fontSize:11, padding:'2px 6px' }}>{task?.plan_number || ''}</td>

                          {/* Etaj */}
                          <td style={{ fontSize:11, textAlign:'center', padding:'2px 4px' }}>{task?.floor || ''}</td>

                          {/* Descriere */}
                          <td style={{ fontSize:12, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', padding:'2px 6px' }}>{task?.plan_description || ''}</td>

                          {/* Status */}
                          <td style={{ textAlign:'center', padding:'2px 4px' }}>
                            {task && <span className={`badge ${STATUS_BADGE[task.status]}`}>{STATUS_LABEL[task.status]}</span>}
                          </td>

                          {/* Tip Plan */}
                          <td style={{ textAlign:'center', padding:'2px 4px' }}>
                            {task?.tip_plan && <span className={`badge ${TIP_BADGE[task.tip_plan] || 'badge-gray'}`}>{task.tip_plan}</span>}
                          </td>

                          {/* Timp - highlight by status */}
                          <td className={`c-time ${getCellClasses(task, 'time_start')}`}>{task?.time_start?.slice(0,5) || '—'}</td>
                          <td className={`c-time ${getCellClasses(task, 'time_pause')}`}>{task?.time_pause?.slice(0,5) || '—'}</td>
                          <td className={`c-time ${getCellClasses(task, 'time_end')}`}>{task?.time_end?.slice(0,5) || '—'}</td>

                          <td className="c-hours">{task?.hours_worked ? `${Number(task.hours_worked).toFixed(2)}h` : '—'}</td>

                          {/* Data corecție - highlight pentru C_DE/C_LMT */}
                          <td className={`${getCellClasses(task, 'correction_date')}`} style={{ fontSize:11, textAlign:'center', color:'var(--text2)' }}>
                            {task?.correction_date ? task.correction_date.slice(5).replace('-','.') : '—'}
                          </td>

                          <td style={{ textAlign:'center' }}>{task?.verified ? <span style={{ color:'var(--green)' }}>✓</span> : <span style={{ color:'var(--text3)' }}>—</span>}</td>
                          <td style={{ fontSize:11, color:'var(--text2)', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{task?.notes || ''}</td>
                        </tr>
                      )
                    })
                  ]
                }).flat()}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ── INLINE PROJECT CELL COMPONENT ──
function ProjectCell({ projects, value, task, dateStr, taskNum, onSave, fetchTasks, profile, descLists }: any) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<any>(null)
  const [bauteile, setBauteile] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [activeModalTab, setActiveModalTab] = useState<'comments'|'history'>('comments')

  function openForm() {
    setForm(task ? {
      project_id: task.project_id || '',
      bauteil_id: task.bauteil_id || '',
      sch_bew_gen: task.sch_bew_gen || '',
      plan_number: task.plan_number || '',
      floor: task.floor || '',
      plan_description: task.plan_description || '',
      status: task.status || 'IN_LUCRU',
      tip_plan: task.tip_plan || '',
      time_start: task.time_start?.slice(0,5) || '',
      time_pause: task.time_pause?.slice(0,5) || '',
      time_end: task.time_end?.slice(0,5) || '',
      correction_date: task.correction_date || '',
      verified: task.verified || false,
      notes: task.notes || '',
    } : {
      project_id:'',bauteil_id:'',sch_bew_gen:'',plan_number:'',floor:'',
      plan_description:'',status:'IN_LUCRU',tip_plan:'',time_start:'',
      time_pause:'',time_end:'',correction_date:'',verified:false,notes:''
    })
    if (task?.project_id) {
      supabase.from('bauteile').select('*').eq('project_id', task.project_id).order('order_index')
        .then(({ data }) => setBauteile(data || []))
    }
    setOpen(true)
  }

  async function handleProjectChange(pid: string) {
    setForm((f: any) => ({ ...f, project_id: pid, bauteil_id: '' }))
    if (pid) {
      const { data } = await supabase.from('bauteile').select('*').eq('project_id', pid).order('order_index')
      setBauteile(data || [])
    } else setBauteile([])
  }

  function calcH(s?: string, p?: string, e?: string) {
    if (!s) return null
    const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
    if (e) { if (p) return Math.max(0, toMin(p) - toMin(s)) / 60; return Math.max(0, toMin(e) - toMin(s)) / 60 }
    if (p) return Math.max(0, toMin(p) - toMin(s)) / 60
    return null
  }

  async function save() {
    setSaving(true)
    await onSave(dateStr, taskNum, form, task?.id)
    setSaving(false); setOpen(false)
  }

  async function deleteTask() {
    if (task) { await supabase.from('tasks').delete().eq('id', task.id); fetchTasks() }
    setOpen(false)
  }

  function setF(k: string, v: any) { setForm((f: any) => ({ ...f, [k]: v })) }

  const computedH = form ? calcH(form.time_start, form.time_pause, form.time_end) : null
  const projName = projects.find((p: any) => p.id === value)?.abbreviation

  return (
    <>
      <div onDoubleClick={openForm} style={{ cursor:'pointer', minHeight:20, fontWeight:700, fontSize:12, padding:'2px 4px', borderRadius:4 }}
        title="Dublu-click pentru a edita"
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.1)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        {projName || ''}
      </div>

      {open && (
        <div className="modal-overlay">
          <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              <span>{task ? 'Editează plan' : 'Plan nou'} — <span style={{ fontFamily:'var(--mono)', color:'var(--acc)', fontSize:13 }}>{dateStr} / #{taskNum}</span></span>
              <button className="modal-close" onClick={() => setOpen(false)}>✕</button>
            </div>

            {form && (
              <>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:12 }}>
                  <div className="form-group">
                    <label className="label">Proiect</label>
                    <select className="select" value={form.project_id} onChange={e => handleProjectChange(e.target.value)}>
                      <option value="">— alege —</option>
                      {projects.map((p: any) => <option key={p.id} value={p.id}>{p.abbreviation}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">Bauteil</label>
                    <select className="select" value={form.bauteil_id} onChange={e => setF('bauteil_id', e.target.value)} disabled={!form.project_id}>
                      <option value="">—</option>
                      {bauteile.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">SCH/BEW/GEN.</label>
                    <select className="select" value={form.sch_bew_gen} onChange={e => setF('sch_bew_gen', e.target.value)}>
                      <option value="">—</option><option>SCH</option><option>BEW</option><option>GENERALITATI</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">Etaj</label>
                    <select className="select" value={form.floor} onChange={e => setF('floor', e.target.value)}>
                      <option value="">—</option>
                      {FLOORS.slice(1).map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">Nr. Plan</label>
                    <input className="input" value={form.plan_number} onChange={e => setF('plan_number', e.target.value)} placeholder="GR-042" />
                  </div>
                  <div className="form-group">
                    <label className="label">Tip Plan</label>
                    <select className="select" value={form.tip_plan} onChange={e => setF('tip_plan', e.target.value)}>
                      <option value="">—</option>
                      {TIPS.slice(1).map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">Status</label>
                    <select className="select" value={form.status} onChange={e => setF('status', e.target.value)}>
                      <option value="IN_LUCRU">In lucru</option>
                      <option value="PAUZA">Pauza</option>
                      <option value="TERMINAT">Terminat</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">Data Corecție</label>
                    <input className="input" type="date" value={form.correction_date} onChange={e => setF('correction_date', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ gridColumn:'1/-1' }}>
                    <label className="label">Descriere Plan</label>
                    {(() => {
                      const listKey = form.sch_bew_gen === 'SCH' ? 'desc_sch' : form.sch_bew_gen === 'BEW' ? 'desc_bew' : form.sch_bew_gen === 'GENERALITATI' ? 'desc_gen' : null
                      const opts = listKey ? (descLists?.[listKey] || []) : []
                      return opts.length > 0 ? (
                        <div style={{ display:'flex', gap:6 }}>
                          <select className="select" style={{ flex:1 }}
                            value={opts.includes(form.plan_description) ? form.plan_description : '__custom__'}
                            onChange={e => { if (e.target.value !== '__custom__') setF('plan_description', e.target.value) }}>
                            <option value="">— alege descriere —</option>
                            {opts.map((o: string) => <option key={o} value={o}>{o}</option>)}
                            <option value="__custom__">✏️ Altă descriere...</option>
                          </select>
                          {(!opts.includes(form.plan_description) || form.plan_description === '') && (
                            <input className="input" style={{ flex:1 }} value={form.plan_description}
                              onChange={e => setF('plan_description', e.target.value)}
                              placeholder="sau scrie manual..." />
                          )}
                        </div>
                      ) : (
                        <input className="input" value={form.plan_description} onChange={e => setF('plan_description', e.target.value)} placeholder="ex: Grundriss Erdgeschoss" />
                      )
                    })()}
                  </div>
                </div>

                <div style={{ background:'var(--bg3)', borderRadius:9, padding:14, marginBottom:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                    <span className="label" style={{ marginBottom:0 }}>⏱ Timp lucrat</span>
                    {computedH !== null && <span style={{ fontFamily:'var(--mono)', fontSize:13, color:'var(--green)', fontWeight:700 }}>= {computedH.toFixed(2)}h</span>}
                  </div>
                  <div className="form-grid-3">
                    {[['time_start','Început',form.status==='IN_LUCRU'],['time_pause','Pauză',form.status==='PAUZA'],['time_end','Terminat',form.status==='TERMINAT']].map(([k,l,hl]) => (
                      <div className="form-group" key={k as string}>
                        <label className="label" style={{ color: hl ? 'var(--acc)' : undefined }}>{l as string} {hl ? '◀' : ''}</label>
                        <input className="input" type="time" value={form[k as string]} onChange={e => setF(k as string, e.target.value)}
                          style={{ borderColor: hl ? 'var(--acc)' : undefined }} />
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:10, marginBottom:12, alignItems:'end' }}>
                  <div className="form-group">
                    <label className="label">Observații</label>
                    <textarea className="input" rows={2} value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="Note..." />
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, paddingBottom:2 }}>
                    <input type="checkbox" id={`v-${dateStr}-${taskNum}`} checked={form.verified} onChange={e => setF('verified', e.target.checked)} style={{ width:15, height:15, accentColor:'var(--acc)' }} />
                    <label htmlFor={`v-${dateStr}-${taskNum}`} style={{ fontSize:13, cursor:'pointer' }}>Verificat</label>
                  </div>
                </div>

                <div className="modal-actions">
                  {task && <button className="btn btn-ghost btn-sm" onClick={() => { const copy = {...form}; save().then(() => { setForm(copy) }) }} title="Duplică taskul">📋 Duplică</button>}
                  {task && <button className="btn btn-danger" onClick={deleteTask}>🗑 Șterge</button>}
                  <button className="btn btn-ghost" onClick={() => setOpen(false)}>Anulează</button>
                  <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Se salvează...' : '💾 Salvează'}</button>
                </div>
                {task && (
                  <div style={{ marginTop:20, paddingTop:16, borderTop:'1px solid var(--border)' }}>
                    <div className="tab-row" style={{ marginBottom:12 }}>
                      <button className={`tab-btn ${activeModalTab==='comments'?'active':''}`} onClick={() => setActiveModalTab('comments')}>💬 Comentarii</button>
                      <button className={`tab-btn ${activeModalTab==='history'?'active':''}`} onClick={() => setActiveModalTab('history')}>📋 Istoric</button>
                    </div>
                    {activeModalTab === 'comments' && <TaskComments taskId={task.id} />}
                    {activeModalTab === 'history' && <TaskHistory taskId={task.id} />}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
