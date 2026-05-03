'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'
import { format } from 'date-fns'

function calcHours(start?: string, pause?: string, end?: string): number | null {
  if (!start) return null
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  if (end) {
    if (pause) return Math.max(0, toMin(pause) - toMin(start)) / 60
    return Math.max(0, toMin(end) - toMin(start)) / 60
  }
  if (pause) return Math.max(0, toMin(pause) - toMin(start)) / 60
  return null
}

export default function TaskFormPage({ editId }: { editId?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { profile } = useAuth()
  const [projects, setProjects] = useState<any[]>([])
  const [bauteile, setBauteile] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const defaultDate = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd')
  const [form, setForm] = useState({
    task_date: defaultDate, task_number: 1,
    project_id: '', bauteil_id: '', sch_bew_gen: '',
    plan_number: '', floor: '', plan_description: '',
    status: 'IN_LUCRU', tip_plan: '',
    time_start: '', time_pause: '', time_end: '',
    correction_date: '', verified: false, notes: '',
  })

  useEffect(() => {
    if (!profile) return
    supabase.from('user_projects').select('project:projects(*)').eq('user_id', profile.id)
      .then(({ data }) => setProjects((data?.map((r: any) => r.project) || []).filter(Boolean)))
    supabase.from('tasks').select('task_number').eq('user_id', profile.id).eq('task_date', defaultDate)
      .order('task_number', { ascending: false }).limit(1)
      .then(({ data }) => {
        const next = data && data.length > 0 ? data[0].task_number + 1 : 1
        setForm(f => ({ ...f, task_number: next }))
      })
  }, [profile])

  useEffect(() => {
    if (form.project_id) {
      supabase.from('bauteile').select('*').eq('project_id', form.project_id).order('order_index')
        .then(({ data }) => setBauteile(data || []))
    } else setBauteile([])
  }, [form.project_id])

  const computedHours = calcHours(form.time_start, form.time_pause, form.time_end)
  function setF(k: string, v: any) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!profile) return
    setSaving(true); setError('')
    const payload = {
      user_id: profile.id, task_date: form.task_date, task_number: form.task_number,
      project_id: form.project_id || null, bauteil_id: form.bauteil_id || null,
      sch_bew_gen: form.sch_bew_gen || null, plan_number: form.plan_number || null,
      floor: form.floor || null, plan_description: form.plan_description || null,
      status: form.status, tip_plan: form.tip_plan || null,
      time_start: form.time_start || null, time_pause: form.time_pause || null,
      time_end: form.time_end || null, hours_worked: computedHours,
      correction_date: form.correction_date || null,
      verified: form.verified, notes: form.notes || null,
    }
    const { error: e } = await supabase.from('tasks').insert(payload)
    setSaving(false)
    if (e) { setError(e.message); return }
    router.push('/tasks')
  }

  return (
    <div style={{ display:'flex', height:'100vh' }}>
      <Sidebar />
      <div style={{ marginLeft:200, flex:1, padding:28, overflowY:'auto' }}>
        <div style={{ maxWidth:760 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:28 }}>
            <Link href="/tasks" className="btn btn-ghost btn-sm">← Înapoi</Link>
            <div>
              <div style={{ fontSize:20, fontWeight:700 }}>Plan nou</div>
              <div style={{ fontSize:12, color:'var(--text3)' }}>Completează datele planului</div>
            </div>
          </div>
          <div className="card" style={{ padding:28 }}>
            {error && <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:18, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'var(--red)', fontSize:12 }}>{error}</div>}
            <div className="form-grid" style={{ marginBottom:16 }}>
              <div className="form-group"><label className="label">Data</label><input className="input" type="date" value={form.task_date} onChange={e => setF('task_date', e.target.value)} /></div>
              <div className="form-group"><label className="label">Nr. Task</label><input className="input" type="number" min={1} value={form.task_number} onChange={e => setF('task_number', parseInt(e.target.value))} /></div>
              <div className="form-group"><label className="label">Proiect</label>
                <select className="select" value={form.project_id} onChange={e => { setF('project_id', e.target.value); setF('bauteil_id','') }}>
                  <option value="">— alege —</option>
                  {projects.map((p: any) => <option key={p.id} value={p.id}>{p.abbreviation}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="label">Bauteil</label>
                <select className="select" value={form.bauteil_id} onChange={e => setF('bauteil_id', e.target.value)} disabled={!form.project_id}>
                  <option value="">—</option>
                  {bauteile.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="label">SCH/BEW/GEN.</label>
                <select className="select" value={form.sch_bew_gen} onChange={e => setF('sch_bew_gen', e.target.value)}>
                  <option value="">—</option><option>SCH</option><option>BEW</option><option>GENERALITATI</option>
                </select>
              </div>
              <div className="form-group"><label className="label">Număr Plan</label><input className="input" value={form.plan_number} onChange={e => setF('plan_number', e.target.value)} placeholder="ex: GR-042" /></div>
              <div className="form-group"><label className="label">Etaj</label>
                <select className="select" value={form.floor} onChange={e => setF('floor', e.target.value)}>
                  <option value="">—</option>
                  {['BO','KG','EG','1.OG','2.OG','3.OG','4.OG','5.OG','6.OG','7.OG','8.OG','SG','DG','-'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="label">Tip Plan</label>
                <select className="select" value={form.tip_plan} onChange={e => setF('tip_plan', e.target.value)}>
                  <option value="">—</option>
                  {['NOU','C_DE','C_LMT','FREI','NTR','MKT','MKT_45','-'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="form-group full"><label className="label">Descriere Plan</label><input className="input" value={form.plan_description} onChange={e => setF('plan_description', e.target.value)} placeholder="ex: Grundriss Erdgeschoss" /></div>
              <div className="form-group"><label className="label">Status</label>
                <select className="select" value={form.status} onChange={e => setF('status', e.target.value)}>
                  <option value="IN_LUCRU">In lucru</option><option value="PAUZA">Pauza</option><option value="TERMINAT">Terminat</option>
                </select>
              </div>
              <div className="form-group"><label className="label">Data Corecție</label><input className="input" type="date" value={form.correction_date} onChange={e => setF('correction_date', e.target.value)} /></div>
            </div>
            <div style={{ background:'var(--bg3)', borderRadius:9, padding:14, marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                <span className="label" style={{ marginBottom:0 }}>⏱ Timp lucrat</span>
                {computedHours !== null && <span style={{ fontFamily:'var(--mono)', fontSize:13, color:'var(--green)', fontWeight:700 }}>= {computedHours.toFixed(2)}h</span>}
              </div>
              <div className="form-grid-3">
                {[['time_start','Început'],['time_pause','Pauză'],['time_end','Terminat']].map(([k,l]) => (
                  <div className="form-group" key={k}><label className="label">{l}</label><input className="input" type="time" value={form[k as keyof typeof form] as string} onChange={e => setF(k, e.target.value)} /></div>
                ))}
              </div>
            </div>
            <div className="form-group" style={{ marginBottom:16 }}>
              <label className="label">Observații</label>
              <textarea className="input" rows={2} value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="Note suplimentare..." />
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
              <input type="checkbox" id="verified" checked={form.verified} onChange={e => setF('verified', e.target.checked)} style={{ width:15, height:15, accentColor:'var(--acc)' }} />
              <label htmlFor="verified" style={{ fontSize:13, cursor:'pointer' }}>Verificat</label>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <Link href="/tasks" className="btn btn-ghost">Anulează</Link>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Se salvează...' : '💾 Salvează'}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}