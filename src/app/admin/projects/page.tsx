'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase, Project, Bauteil } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

type Beneficiary = { id: string; name: string }
type ProjectFull = Project & { bauteile: Bauteil[]; beneficiary?: Beneficiary }

export default function AdminProjectsPage() {
  const { profile } = useAuth()
  const [projects, setProjects] = useState<ProjectFull[]>([])
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'project'|'edit_project'|'bauteil'|null>(null)
  const [selProj, setSelProj] = useState<ProjectFull | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const [filterBenef, setFilterBenef] = useState('')
  const [showActive, setShowActive] = useState<'all'|'active'|'inactive'>('active')
  const [bauteilName, setBauteilName] = useState('')

  // Project form
  const [projForm, setProjForm] = useState({ name:'', abbreviation:'', beneficiary_id:'', description:'' })
  const [newBauteile, setNewBauteile] = useState<string[]>([]) // for new project
  const [newBauteilInput, setNewBauteilInput] = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [pr, br, bnr] = await Promise.all([
      supabase.from('projects').select('*').order('name'),
      supabase.from('bauteile').select('*').order('order_index'),
      supabase.from('beneficiaries').select('*').order('name'),
    ])
    const baus = br.data || []; const bens = bnr.data || []
    setBeneficiaries(bens)
    setProjects((pr.data || []).map((p: Project) => ({
      ...p,
      bauteile: baus.filter((b: Bauteil) => b.project_id === p.id),
      beneficiary: bens.find((b: Beneficiary) => b.id === (p as any).beneficiary_id)
    })))
    setLoading(false)
  }

  async function saveProject() {
    setSaving(true); setError('')
    // Check duplicate
    const exists = projects.find(p => p.abbreviation.toLowerCase() === projForm.abbreviation.toLowerCase() && (modal !== 'edit_project' || p.id !== selProj?.id))
    if (exists) { setError(`Abrevierea "${projForm.abbreviation}" există deja pentru proiectul "${exists.name}"!`); setSaving(false); return }
    const exists2 = projects.find(p => p.name.toLowerCase() === projForm.name.toLowerCase() && (modal !== 'edit_project' || p.id !== selProj?.id))
    if (exists2) { setError(`Proiectul "${projForm.name}" există deja!`); setSaving(false); return }

    const payload = { name:projForm.name, abbreviation:projForm.abbreviation, beneficiary_id:projForm.beneficiary_id||null, description:projForm.description||null }

    if (modal === 'edit_project' && selProj) {
      const { error: e } = await supabase.from('projects').update(payload).eq('id', selProj.id)
      if (e) { setError(e.message); setSaving(false); return }
    } else {
      const { data: newProj, error: e } = await supabase.from('projects').insert({ ...payload, created_by: profile!.id }).select().single()
      if (e) { setError(e.message); setSaving(false); return }
      // Add bauteile if any
      if (newBauteile.length > 0 && newProj) {
        await supabase.from('bauteile').insert(
          newBauteile.map((name, i) => ({ project_id: newProj.id, name, order_index: i + 1 }))
        )
      }
    }
    setSaving(false); setModal(null); fetchAll()
  }

  async function saveBauteil() {
    if (!selProj || !bauteilName) return
    setSaving(true)
    await supabase.from('bauteile').insert({ project_id: selProj.id, name: bauteilName, order_index: (selProj.bauteile.length || 0) + 1 })
    setSaving(false); setModal(null); setBauteilName(''); expanded.add(selProj.id); fetchAll()
  }

  async function deleteBauteil(id: string) {
    await supabase.from('bauteile').delete().eq('id', id); fetchAll()
  }

  async function toggleActive(p: Project) {
    await supabase.from('projects').update({ active: !p.active }).eq('id', p.id); fetchAll()
  }

  function openNewProject() {
    setProjForm({ name:'', abbreviation:'', beneficiary_id:'', description:'' })
    setNewBauteile([]); setNewBauteilInput(''); setError(''); setModal('project')
  }

  function openEditProject(p: ProjectFull) {
    setSelProj(p)
    setProjForm({ name:p.name, abbreviation:p.abbreviation, beneficiary_id:(p as any).beneficiary_id||'', description:p.description||'' })
    setError(''); setModal('edit_project')
  }

  function toggleExpand(id: string) {
    setExpanded(e => { const n = new Set(e); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function addNewBauteil() {
    if (!newBauteilInput.trim()) return
    setNewBauteile(b => [...b, newBauteilInput.trim()])
    setNewBauteilInput('')
  }

  // Filter projects
  const filtered = projects.filter(p => {
    if (showActive === 'active' && !p.active) return false
    if (showActive === 'inactive' && p.active) return false
    if (filterBenef && (p as any).beneficiary_id !== filterBenef) return false
    if (searchQ) {
      const q = searchQ.toLowerCase()
      return p.name.toLowerCase().includes(q) || p.abbreviation.toLowerCase().includes(q) || p.beneficiary?.name.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-wrap">
        <div className="topbar">
          <div>
            <div style={{ fontSize:16, fontWeight:700, letterSpacing:'-0.02em', color:'var(--text)' }}>Proiecte</div>
            <div style={{ fontSize:11, color:'var(--text2)' }}>{filtered.length} din {projects.length} proiecte</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={openNewProject}>+ Proiect nou</button>
        </div>

        <div className="page-content">
          {/* Search & Filters */}
          <div className="card" style={{ padding:'12px 16px', marginBottom:14 }}>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
              {/* Search */}
              <div style={{ position:'relative', flex:1, minWidth:200 }}>
                <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text3)', fontSize:13 }}>🔍</span>
                <input className="input" style={{ paddingLeft:32 }} placeholder="Caută după nume, abreviere, beneficiar..."
                  value={searchQ} onChange={e => setSearchQ(e.target.value)} />
              </div>
              {/* Filter beneficiar */}
              <select className="select" style={{ width:'auto' }} value={filterBenef} onChange={e => setFilterBenef(e.target.value)}>
                <option value="">Toți beneficiarii</option>
                {beneficiaries.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              {/* Active filter */}
              <div style={{ display:'flex', gap:3, background:'var(--bg3)', borderRadius:7, padding:3 }}>
                {([['active','Active'],['inactive','Inactive'],['all','Toate']] as const).map(([val, label]) => (
                  <button key={val} className={`tab-btn ${showActive===val?'active':''}`} onClick={() => setShowActive(val)}>{label}</button>
                ))}
              </div>
              {(searchQ || filterBenef) && <button className="btn btn-ghost btn-xs" onClick={() => { setSearchQ(''); setFilterBenef('') }}>✕ Reset</button>}
            </div>
          </div>

          {/* Search result info */}
          {searchQ && (
            <div style={{ marginBottom:10, fontSize:12, color:'var(--text2)' }}>
              {filtered.length === 0 ? `Niciun proiect găsit pentru "${searchQ}"` : `${filtered.length} proiect(e) găsite pentru "${searchQ}"`}
            </div>
          )}

          <div className="card">
            {loading ? (
              <div style={{ padding:60, textAlign:'center', color:'var(--text3)' }}>Se încarcă...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding:60, textAlign:'center' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🔍</div>
                <p style={{ color:'var(--text2)' }}>Niciun proiect găsit</p>
              </div>
            ) : filtered.map((p, idx) => (
              <div key={p.id} className="proj-row" style={{ borderBottom: idx < filtered.length-1 ? '1px solid var(--border)' : 'none' }}>
                <div className="proj-main">
                  <button onClick={() => toggleExpand(p.id)} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', padding:2, fontSize:11 }}>
                    {expanded.has(p.id) ? '▼' : '▶'}
                  </button>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <span style={{ fontWeight:700, fontSize:13, color:'var(--text)' }}>{p.name}</span>
                      <span className="badge badge-gray" style={{ fontFamily:'var(--mono)' }}>{p.abbreviation}</span>
                      {!p.active && <span className="badge badge-red">Inactiv</span>}
                      {p.beneficiary && <span style={{ fontSize:11, color:'var(--text2)' }}>🏢 {p.beneficiary.name}</span>}
                    </div>
                    <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{p.bauteile.length} bauteile</div>
                  </div>
                  <div style={{ display:'flex', gap:6 }} onClick={e => e.stopPropagation()}>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setSelProj(p); setBauteilName(''); setModal('bauteil') }}>+ Bauteil</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEditProject(p)}>✏️ Edit</button>
                    <button className={`btn btn-sm ${p.active ? 'btn-danger' : 'btn-success'}`} onClick={() => toggleActive(p)}>
                      {p.active ? 'Dezactivează' : 'Activează'}
                    </button>
                  </div>
                </div>
                {expanded.has(p.id) && (
                  <div className="proj-expand">
                    {p.bauteile.length === 0 && <span style={{ fontSize:11, color:'var(--text3)' }}>Fără bauteile definite</span>}
                    {p.bauteile.map((b, bi) => (
                      <span key={b.id} className="bauteil-tag">
                        <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--text3)' }}>{bi+1}.</span>
                        {b.name}
                        <button onClick={() => deleteBauteil(b.id)}
                          style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', padding:'0 0 0 4px', fontSize:12 }}
                          onMouseEnter={e => ((e.currentTarget as any).style.color='var(--red)')}
                          onMouseLeave={e => ((e.currentTarget as any).style.color='var(--text3)')}>✕</button>
                      </span>
                    ))}
                    <button className="btn btn-ghost btn-xs" style={{ margin:3 }} onClick={() => { setSelProj(p); setBauteilName(''); setModal('bauteil') }}>+ Adaugă</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PROJECT MODAL (new/edit) */}
      {(modal === 'project' || modal === 'edit_project') && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              {modal === 'edit_project' ? 'Editează proiect' : 'Proiect nou'}
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            {error && <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:14, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'var(--red)', fontSize:12 }}>{error}</div>}
            <div className="form-grid" style={{ marginBottom:16 }}>
              <div className="form-group full">
                <label className="label">Nume proiect</label>
                <input className="input" value={projForm.name} onChange={e => setProjForm(f => ({...f, name:e.target.value}))} placeholder="BV Bayerstraße" autoFocus />
              </div>
              <div className="form-group">
                <label className="label">Abreviere</label>
                <input className="input" value={projForm.abbreviation} onChange={e => setProjForm(f => ({...f, abbreviation:e.target.value}))} placeholder="BV Bay." />
              </div>
              <div className="form-group">
                <label className="label">Beneficiar / Client</label>
                <select className="select" value={projForm.beneficiary_id} onChange={e => setProjForm(f => ({...f, beneficiary_id:e.target.value}))}>
                  <option value="">— fără beneficiar —</option>
                  {beneficiaries.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="form-group full">
                <label className="label">Descriere</label>
                <textarea className="input" rows={2} value={projForm.description} onChange={e => setProjForm(f => ({...f, description:e.target.value}))} />
              </div>
            </div>

            {/* Bauteile la creare */}
            {modal === 'project' && (
              <div style={{ marginBottom:16 }}>
                <label className="label">Bauteile (opțional)</label>
                <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                  <input className="input" value={newBauteilInput} onChange={e => setNewBauteilInput(e.target.value)}
                    placeholder="ex: Haus 1" onKeyDown={e => e.key === 'Enter' && addNewBauteil()} style={{ flex:1 }} />
                  <button className="btn btn-ghost" onClick={addNewBauteil} disabled={!newBauteilInput.trim()}>+ Adaugă</button>
                </div>
                {newBauteile.length > 0 && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {newBauteile.map((b, i) => (
                      <span key={i} className="bauteil-tag">
                        <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--text3)' }}>{i+1}.</span>
                        {b}
                        <button onClick={() => setNewBauteile(bb => bb.filter((_,j) => j!==i))}
                          style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', padding:'0 0 0 4px', fontSize:12 }}>✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Anulează</button>
              <button className="btn btn-primary" onClick={saveProject} disabled={saving || !projForm.name || !projForm.abbreviation}>✓ Salvează</button>
            </div>
          </div>
        </div>
      )}

      {/* BAUTEIL MODAL */}
      {modal === 'bauteil' && selProj && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth:400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">Adaugă Bauteil — {selProj.name} <button className="modal-close" onClick={() => setModal(null)}>✕</button></div>
            <div className="form-group" style={{ marginBottom:20 }}>
              <label className="label">Nume bauteil</label>
              <input className="input" value={bauteilName} onChange={e => setBauteilName(e.target.value)} placeholder="Haus 1" autoFocus onKeyDown={e => e.key === 'Enter' && saveBauteil()} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Anulează</button>
              <button className="btn btn-primary" onClick={saveBauteil} disabled={saving || !bauteilName}>✓ Adaugă</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
