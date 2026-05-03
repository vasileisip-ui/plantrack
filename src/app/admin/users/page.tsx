'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase, Profile, Project } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

type Beneficiary = { id: string; name: string }
type UserWithProjects = Profile & { projects: Project[]; email?: string }

export default function AdminUsersPage() {
  const { profile } = useAuth()
  const [users, setUsers] = useState<UserWithProjects[]>([])
  const [allProjects, setAllProjects] = useState<(Project & { beneficiary?: Beneficiary })[]>([])
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'new'|'edit'|'projects'|null>(null)
  const [selected, setSelected] = useState<UserWithProjects | null>(null)
  const [selProjIds, setSelProjIds] = useState<string[]>([])
  const [filterBenef, setFilterBenef] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [newForm, setNewForm] = useState({ full_name:'', username:'', email:'', password:'', role:'user' })
  const [editForm, setEditForm] = useState({ full_name:'', username:'', role:'user', new_password:'' })

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const [pr, pjr, upr, bnr] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('projects').select('*, beneficiary:beneficiaries(id,name)').eq('active', true).order('name'),
      supabase.from('user_projects').select('user_id, project_id'),
      supabase.from('beneficiaries').select('*').order('name'),
    ])
    const allP = pjr.data || []; const allUP = upr.data || []
    setAllProjects(allP)
    setBeneficiaries(bnr.data || [])
    setUsers((pr.data || []).map((u: Profile) => ({
      ...u,
      projects: allP.filter((p: any) => allUP.some((up: any) => up.user_id === u.id && up.project_id === p.id))
    })))
    setLoading(false)
  }

  async function createUser() {
    setSaving(true); setError('')
    const { error: e } = await supabase.auth.signUp({
      email: newForm.email, password: newForm.password,
      options: { data: { full_name: newForm.full_name, username: newForm.username, role: newForm.role } }
    })
    if (e) { setError(e.message); setSaving(false); return }
    setSaving(false); setModal(null); setTimeout(fetchData, 1200)
  }

  async function saveEdit() {
    if (!selected) return
    setSaving(true); setError(''); setSuccess('')

    // Update profile
    const { error: e1 } = await supabase.from('profiles').update({
      full_name: editForm.full_name,
      username: editForm.username,
      role: editForm.role,
    }).eq('id', selected.id)

    if (e1) { setError(e1.message); setSaving(false); return }

    // Change password if provided
    if (editForm.new_password.trim().length > 0) {
      if (editForm.new_password.trim().length < 6) {
        setError('Parola trebuie să aibă cel puțin 6 caractere!')
        setSaving(false); return
      }
      // Use admin API via SQL function
      const { error: e2 } = await supabase.rpc('admin_change_password', {
        user_id: selected.id,
        new_password: editForm.new_password.trim()
      })
      if (e2) {
        // Fallback: show note that password change requires Supabase admin API
        setSuccess('Profilul actualizat! Pentru schimbarea parolei, folosește Supabase Dashboard → Authentication → Users → Edit user.')
        setSaving(false)
        fetchData()
        return
      }
    }

    setSaving(false)
    setSuccess('Utilizator actualizat cu succes!')
    setTimeout(() => { setModal(null); setSuccess('') }, 1500)
    fetchData()
  }

  function openEdit(u: UserWithProjects) {
    setSelected(u)
    setEditForm({ full_name: u.full_name, username: u.username, role: u.role, new_password: '' })
    setError(''); setSuccess('')
    setModal('edit')
  }

  async function saveProjects() {
    if (!selected) return
    setSaving(true)
    await supabase.from('user_projects').delete().eq('user_id', selected.id)
    if (selProjIds.length > 0) {
      await supabase.from('user_projects').insert(
        selProjIds.map(pid => ({ user_id: selected.id, project_id: pid, assigned_by: profile!.id }))
      )
    }
    setSaving(false); setModal(null); fetchData()
  }

  function openProjects(u: UserWithProjects) {
    setSelected(u); setSelProjIds(u.projects.map(p => p.id)); setFilterBenef(''); setModal('projects')
  }

  function toggleProj(pid: string) {
    setSelProjIds(ids => ids.includes(pid) ? ids.filter(i => i !== pid) : [...ids, pid])
  }

  function setNF(k: string, v: any) { setNewForm(f => ({ ...f, [k]: v })) }
  function setEF(k: string, v: any) { setEditForm(f => ({ ...f, [k]: v })) }

  const filteredProjects = filterBenef
    ? allProjects.filter((p: any) => p.beneficiary?.id === filterBenef)
    : allProjects

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-wrap">
        <div className="topbar">
          <div>
            <div style={{ fontSize:16, fontWeight:700, letterSpacing:'-0.02em', color:'var(--text)' }}>Utilizatori</div>
            <div style={{ fontSize:11, color:'var(--text2)' }}>{users.length} conturi înregistrate</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => { setNewForm({full_name:'',username:'',email:'',password:'',role:'user'}); setError(''); setModal('new') }}>
            + Utilizator nou
          </button>
        </div>
        <div className="page-content">
          <div className="card">
            {loading ? (
              <div style={{ padding:60, textAlign:'center', color:'var(--text3)' }}>Se încarcă...</div>
            ) : (
              <table>
                <thead><tr><th>Utilizator</th><th>Rol</th><th>Proiecte atribuite</th><th>Creat la</th><th>Acțiuni</th></tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight:700, color:'var(--text)' }}>{u.full_name}</div>
                        <div style={{ fontSize:10, color:'var(--text3)', fontFamily:'var(--mono)' }}>@{u.username}</div>
                      </td>
                      <td><span className={`badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>{u.role === 'admin' ? 'Admin' : 'User'}</span></td>
                      <td>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                          {u.projects.length === 0 ? <span style={{ fontSize:11, color:'var(--text3)' }}>Niciun proiect</span>
                            : u.projects.slice(0, 4).map(p => <span key={p.id} className="badge badge-gray" style={{ fontSize:10 }}>{p.abbreviation.slice(0, 12)}</span>)}
                          {u.projects.length > 4 && <span className="badge badge-gray" style={{ fontSize:10 }}>+{u.projects.length - 4}</span>}
                        </div>
                      </td>
                      <td style={{ fontSize:11, color:'var(--text3)' }}>{new Date(u.created_at).toLocaleDateString('ro-RO')}</td>
                      <td>
                        <div style={{ display:'flex', gap:5 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}>✏️ Edit</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => openProjects(u)}>📁 Proiecte</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* NEW USER */}
      {modal === 'new' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Utilizator nou <button className="modal-close" onClick={() => setModal(null)}>✕</button></div>
            {error && <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:14, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'var(--red)', fontSize:12 }}>{error}</div>}
            <div className="form-grid">
              <div className="form-group"><label className="label">Nume complet</label><input className="input" value={newForm.full_name} onChange={e => setNF('full_name', e.target.value)} placeholder="Ion Popescu" /></div>
              <div className="form-group"><label className="label">Username</label><input className="input" value={newForm.username} onChange={e => setNF('username', e.target.value)} placeholder="ion.popescu" /></div>
              <div className="form-group full"><label className="label">Email</label><input className="input" type="email" value={newForm.email} onChange={e => setNF('email', e.target.value)} placeholder="ion@firma.com" /></div>
              <div className="form-group full">
                <label className="label">Parolă</label>
                <div className="pw-wrap">
                  <input className="input" type={showPw ? 'text' : 'password'} value={newForm.password} onChange={e => setNF('password', e.target.value)} placeholder="minim 6 caractere" style={{ paddingRight:36 }} />
                  <button className="pw-eye" onClick={() => setShowPw(!showPw)}>{showPw ? '🙈' : '👁'}</button>
                </div>
              </div>
              <div className="form-group">
                <label className="label">Rol</label>
                <select className="select" value={newForm.role} onChange={e => setNF('role', e.target.value)}>
                  <option value="user">Utilizator</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Anulează</button>
              <button className="btn btn-primary" onClick={createUser} disabled={saving}>✓ Creează cont</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT USER */}
      {modal === 'edit' && selected && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Editează utilizator — {selected.full_name} <button className="modal-close" onClick={() => setModal(null)}>✕</button></div>
            {error && <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:14, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'var(--red)', fontSize:12 }}>{error}</div>}
            {success && <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:14, background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', color:'var(--green)', fontSize:12 }}>{success}</div>}
            <div className="form-grid">
              <div className="form-group"><label className="label">Nume complet</label><input className="input" value={editForm.full_name} onChange={e => setEF('full_name', e.target.value)} /></div>
              <div className="form-group"><label className="label">Username</label><input className="input" value={editForm.username} onChange={e => setEF('username', e.target.value)} /></div>
              <div className="form-group">
                <label className="label">Rol</label>
                <select className="select" value={editForm.role} onChange={e => setEF('role', e.target.value)}>
                  <option value="user">Utilizator</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div className="form-group full">
                <label className="label">Parolă nouă <span style={{ color:'var(--text3)', fontWeight:400 }}>(lasă gol pentru a păstra parola actuală)</span></label>
                <div className="pw-wrap">
                  <input className="input" type={showPw ? 'text' : 'password'} value={editForm.new_password} onChange={e => setEF('new_password', e.target.value)} placeholder="parolă nouă..." style={{ paddingRight:36 }} />
                  <button className="pw-eye" onClick={() => setShowPw(!showPw)}>{showPw ? '🙈' : '👁'}</button>
                </div>
              </div>
            </div>
            <div style={{ marginTop:12, padding:'10px 14px', borderRadius:8, background:'rgba(234,179,8,0.08)', border:'1px solid rgba(234,179,8,0.2)', fontSize:11, color:'var(--text2)' }}>
              ⚠️ Schimbarea parolei funcționează prin Supabase Admin API. Dacă nu funcționează, mergi la Supabase → Authentication → Users → click pe user → Edit.
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Anulează</button>
              <button className="btn btn-primary" onClick={saveEdit} disabled={saving}>✓ Salvează modificările</button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN PROJECTS */}
      {modal === 'projects' && selected && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              Atribuie proiecte — {selected.full_name}
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            {beneficiaries.length > 0 && (
              <div style={{ marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:11, color:'var(--text2)' }}>Filtrează:</span>
                <select className="select" style={{ width:'auto' }} value={filterBenef} onChange={e => setFilterBenef(e.target.value)}>
                  <option value="">Toți ({allProjects.length})</option>
                  {beneficiaries.map(b => {
                    const cnt = allProjects.filter((p: any) => p.beneficiary?.id === b.id).length
                    return <option key={b.id} value={b.id}>{b.name} ({cnt})</option>
                  })}
                </select>
                {filterBenef && <button className="btn btn-ghost btn-xs" onClick={() => setFilterBenef('')}>✕</button>}
              </div>
            )}
            <div className="proj-check-grid">
              {filteredProjects.map((p: any) => (
                <div key={p.id} className={`pcheck ${selProjIds.includes(p.id) ? 'selected' : ''}`} onClick={() => toggleProj(p.id)}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <div>
                      <div className="pcheck-name" style={{ color: selProjIds.includes(p.id) ? 'var(--acc)' : 'var(--text)' }}>{p.abbreviation}</div>
                      <div className="pcheck-sub">{p.name.slice(0, 30)}{p.name.length > 30 ? '...' : ''}</div>
                      {p.beneficiary && <div style={{ fontSize:10, color:'var(--text3)', marginTop:2 }}>🏢 {p.beneficiary.name}</div>}
                    </div>
                    {selProjIds.includes(p.id) && <span style={{ color:'var(--acc)', fontSize:16 }}>✓</span>}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop:10, fontSize:11, color:'var(--text3)' }}>{selProjIds.length} proiecte selectate</div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Anulează</button>
              <button className="btn btn-primary" onClick={saveProjects} disabled={saving}>✓ Salvează</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
