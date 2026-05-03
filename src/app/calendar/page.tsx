'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase, Profile, MONTHS_RO } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { format } from 'date-fns'

const DAY_NAMES_SHORT = ['Lu','Ma','Mi','Jo','Vi','Sâ','Du']
const COLORS = {
  today: '#3b82f6',
  good: '#22c55e',      // >= 7h
  partial: '#eab308',   // 1-7h
  missing: '#ef4444',   // 0h zi lucratoare
  weekend: '#2a3347',
  holiday: '#7c3aed',
  future: 'transparent',
}

function getDaysInMonth(year: number, month: number) { return new Date(year, month, 0).getDate() }
function getFirstDayOfMonth(year: number, month: number) {
  const d = new Date(year, month-1, 1).getDay()
  return d === 0 ? 6 : d - 1 // Monday = 0
}

export default function CalendarPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [users, setUsers] = useState<Profile[]>([])
  const [dayData, setDayData] = useState<Record<string, { hours: number; tasks: number; statuses: string[] }>>({})
  const [holidays, setHolidays] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [dayTasks, setDayTasks] = useState<any[]>([])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1
  const monthStr = `${year}-${String(month).padStart(2,'0')}`
  const today = format(new Date(), 'yyyy-MM-dd')
  const targetUserId = isAdmin && selectedUser ? selectedUser : profile?.id

  useEffect(() => {
    if (isAdmin) {
      supabase.from('profiles').select('*').eq('role','user').order('full_name')
        .then(({data}) => { setUsers(data||[]); if(data?.length) setSelectedUser(data[0].id) })
    }
    supabase.from('holidays').select('holiday_date').eq('year', year)
      .then(({data}) => setHolidays(new Set((data||[]).map((h:any) => h.holiday_date))))
  }, [isAdmin, year])

  const fetchData = useCallback(async () => {
    if (!targetUserId) return
    setLoading(true)
    const {data} = await supabase.from('tasks')
      .select('task_date, hours_worked, status, tip_plan')
      .eq('user_id', targetUserId)
      .like('month', monthStr)
    const map: Record<string, { hours: number; tasks: number; statuses: string[] }> = {}
    ;(data||[]).forEach((t:any) => {
      if (!map[t.task_date]) map[t.task_date] = { hours:0, tasks:0, statuses:[] }
      map[t.task_date].hours += t.hours_worked||0
      map[t.task_date].tasks++
      if (t.status && !map[t.task_date].statuses.includes(t.status)) map[t.task_date].statuses.push(t.status)
    })
    setDayData(map)
    setLoading(false)
  }, [targetUserId, monthStr])

  useEffect(() => { fetchData() }, [fetchData])

  async function fetchDayTasks(dateStr: string) {
    setSelectedDay(dateStr)
    const {data} = await supabase.from('tasks')
      .select('*, project:projects(abbreviation), bauteil:bauteile(name)')
      .eq('user_id', targetUserId!).eq('task_date', dateStr).order('task_number')
    setDayTasks(data||[])
  }

  function getDayColor(dateStr: string): string {
    if (dateStr === today) return COLORS.today
    const jsDate = new Date(dateStr + 'T00:00:00')
    const dow = jsDate.getDay()
    const isWeekend = dow === 0 || dow === 6
    const isHoliday = holidays.has(dateStr)
    if (isHoliday) return COLORS.holiday
    if (isWeekend) return COLORS.weekend
    if (dateStr > today) return COLORS.future
    const d = dayData[dateStr]
    if (!d) return COLORS.missing
    if (d.hours >= 7) return COLORS.good
    if (d.hours > 0) return COLORS.partial
    return COLORS.missing
  }

  function getDayTextColor(dateStr: string): string {
    const jsDate = new Date(dateStr + 'T00:00:00')
    const dow = jsDate.getDay()
    const isWeekend = dow === 0 || dow === 6
    if (dateStr > today) return 'var(--text3)'
    if (isWeekend || holidays.has(dateStr)) return 'var(--text3)'
    return 'white'
  }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  // Stats
  const workDays = Array.from({length:daysInMonth},(_,i)=>i+1).filter(d => {
    const dateStr = `${monthStr}-${String(d).padStart(2,'0')}`
    const jsDate = new Date(dateStr + 'T00:00:00')
    const dow = jsDate.getDay()
    return dow!==0 && dow!==6 && !holidays.has(dateStr) && dateStr <= today
  }).length
  const daysWithHours = Object.keys(dayData).filter(d => dayData[d].hours >= 7).length
  const totalHours = Object.values(dayData).reduce((s,d) => s+d.hours, 0)
  const missingDays = workDays - daysWithHours

  const selectedUserName = isAdmin ? users.find(u=>u.id===selectedUser)?.full_name : profile?.full_name

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-wrap">
        <div className="topbar">
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <button className="btn btn-ghost btn-sm" onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth()-1, 1))}>‹</button>
            <div>
              <div style={{fontSize:16,fontWeight:700,letterSpacing:'-0.02em',color:'var(--text)'}}>{MONTHS_RO[month-1]} {year}</div>
              <div style={{fontSize:11,color:'var(--text2)'}}>Calendar prezență</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth()+1, 1))}>›</button>
          </div>
          {isAdmin && (
            <select className="select" style={{width:'auto'}} value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
              {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          )}
        </div>

        <div className="page-content">
          {/* Stats */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
            {[
              {label:'Total ore', value:`${totalHours.toFixed(1)}h`, color:'var(--acc)'},
              {label:'Zile complete (≥7h)', value:daysWithHours, color:'var(--green)'},
              {label:'Zile lipsă', value:missingDays, color:missingDays>0?'var(--red)':'var(--text2)'},
              {label:'Zile lucr. rămase', value:workDays, color:'var(--text)'},
            ].map(({label,value,color}) => (
              <div key={label} className="stat-card" style={{padding:'14px 18px'}}>
                <p className="stat-label">{label}</p>
                <p className="stat-value" style={{color,fontSize:22}}>{value}</p>
                {label==='Total ore' && <p className="stat-sub">{selectedUserName}</p>}
              </div>
            ))}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:16}}>
            {/* Calendar grid */}
            <div className="card" style={{padding:20}}>
              {/* Day headers */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4,marginBottom:8}}>
                {DAY_NAMES_SHORT.map(d => (
                  <div key={d} style={{textAlign:'center',fontSize:11,fontWeight:700,color:'var(--text2)',padding:'4px 0'}}>{d}</div>
                ))}
              </div>
              {/* Days grid */}
              {loading ? (
                <div style={{padding:40,textAlign:'center',color:'var(--text3)'}}>Se încarcă...</div>
              ) : (
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4}}>
                  {/* Empty cells before first day */}
                  {Array.from({length:firstDay},(_,i) => <div key={`empty-${i}`}/>)}
                  {/* Days */}
                  {Array.from({length:daysInMonth},(_,i) => {
                    const d = i+1
                    const dateStr = `${monthStr}-${String(d).padStart(2,'0')}`
                    const bg = getDayColor(dateStr)
                    const textColor = getDayTextColor(dateStr)
                    const isHoliday = holidays.has(dateStr)
                    const dayInfo = dayData[dateStr]
                    const isSelected = selectedDay === dateStr
                    const isFuture = dateStr > today
                    const jsDate = new Date(dateStr+'T00:00:00')
                    const isWeekend = jsDate.getDay()===0||jsDate.getDay()===6

                    return (
                      <div key={d} onClick={() => !isFuture && fetchDayTasks(dateStr)}
                        style={{
                          background: bg==='transparent' ? 'var(--bg3)' : bg,
                          borderRadius:8, padding:'8px 4px', textAlign:'center',
                          cursor: isFuture||isWeekend ? 'default' : 'pointer',
                          border: isSelected ? '2px solid white' : '2px solid transparent',
                          opacity: isFuture ? 0.4 : 1,
                          transition:'all 0.12s',
                          minHeight:60,
                          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2,
                        }}>
                        <span style={{fontSize:13,fontWeight:700,color: bg==='transparent'||isWeekend ? 'var(--text3)' : textColor}}>
                          {d}
                        </span>
                        {dayInfo && (
                          <>
                            <span style={{fontSize:10,color:textColor,fontFamily:'var(--mono)',fontWeight:600}}>
                              {dayInfo.hours.toFixed(1)}h
                            </span>
                            <span style={{fontSize:9,color:textColor,opacity:0.8}}>
                              {dayInfo.tasks} task{dayInfo.tasks!==1?'uri':''}
                            </span>
                          </>
                        )}
                        {isHoliday && <span style={{fontSize:9,color:'white',opacity:0.9}}>🎉</span>}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Legend */}
              <div style={{display:'flex',gap:16,marginTop:16,flexWrap:'wrap'}}>
                {[
                  {color:COLORS.good, label:'≥7h lucrate'},
                  {color:COLORS.partial, label:'Parțial lucrat'},
                  {color:COLORS.missing, label:'Zi lipsă'},
                  {color:COLORS.today, label:'Azi'},
                  {color:COLORS.holiday, label:'Sărbătoare'},
                  {color:'var(--bg3)', label:'Weekend/Viitor'},
                ].map(({color,label}) => (
                  <div key={label} style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'var(--text2)'}}>
                    <div style={{width:14,height:14,borderRadius:4,background:color,border:'1px solid var(--border)'}}/>
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Day detail panel */}
            <div style={{width:280}}>
              {selectedDay ? (
                <div className="card" style={{padding:16}}>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:'var(--text)'}}>
                    {new Date(selectedDay+'T00:00:00').toLocaleDateString('ro-RO',{weekday:'long',day:'numeric',month:'long'})}
                  </div>
                  {dayTasks.length === 0 ? (
                    <div style={{color:'var(--text3)',fontSize:12,padding:'20px 0',textAlign:'center'}}>Niciun task înregistrat</div>
                  ) : (
                    <>
                      <div style={{fontSize:11,color:'var(--text2)',marginBottom:8}}>
                        {dayTasks.length} taskuri · {dayTasks.reduce((s,t)=>s+(t.hours_worked||0),0).toFixed(2)}h total
                      </div>
                      {dayTasks.map(t => (
                        <div key={t.id} style={{padding:'8px 10px',borderRadius:7,background:'var(--bg3)',marginBottom:6}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:3}}>
                            <span style={{fontWeight:700,fontSize:12,color:'var(--text)'}}>{t.project?.abbreviation||'—'}</span>
                            <span style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--acc)',fontWeight:700}}>{t.hours_worked?`${Number(t.hours_worked).toFixed(2)}h`:''}</span>
                          </div>
                          {t.plan_description && <div style={{fontSize:11,color:'var(--text2)',marginBottom:3}}>{t.plan_description}</div>}
                          <div style={{display:'flex',gap:4}}>
                            {t.tip_plan&&<span className={`badge badge-${t.tip_plan.toLowerCase().replace('_','')}`}>{t.tip_plan}</span>}
                            <span className={`badge badge-${t.status.toLowerCase().replace('_','')}`}>
                              {{IN_LUCRU:'In lucru',PAUZA:'Pauza',TERMINAT:'Terminat'}[t.status as string]||t.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              ) : (
                <div className="card" style={{padding:20,textAlign:'center'}}>
                  <div style={{fontSize:32,marginBottom:8}}>👆</div>
                  <div style={{fontSize:12,color:'var(--text3)'}}>Click pe o zi pentru a vedea detaliile</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
