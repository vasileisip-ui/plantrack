'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

type Beneficiary = { id: string; name: string; created_at: string }

export default function BeneficiariesPage() {
  const [items, setItems] = useState<Beneficiary[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<Beneficiary | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchItems() }, [])

  async function fetchItems() {
    const { data } = await supabase.from('beneficiaries').select('*').order('name')
    setItems(data || [])
    setLoading(false)
  }

  async function save() {
    setSaving(true); setError('')
    // Check duplicate
    const exists = items.find(i => i.name.toLowerCase() === name.toLowerCase() && i.id !== editItem?.id)
    if (exists) { setError(`Beneficiarul "${name}" există deja!`); setSaving(false); return }

    if (editItem) {
      const { error: e } = await supabase.from('beneficiaries').update({ name }).eq('id', editItem.id)
      if (e) { setError(e.message); setSaving(false); return }
    } else {
      const { error: e } = await supabase.from('beneficiaries').insert({ name })
      if (e) { setError(e.message); setSaving(false); return }
    }
    setSaving(false); setShowModal(false); setEditItem(null); setName(''); setError(''); fetchItems()
  }

  async function deleteItem() {
    if (!deleteId) return
    await supabase.from('beneficiaries').delete().eq('id', deleteId)
    setDeleteId(null); fetchItems()
  }

  function openNew() { setEditItem(null); setName(''); setError(''); setShowModal(true) }
  function openEdit(b: Beneficiary) { setEditItem(b); setName(b.name); setError(''); setShowModal(true) }

  const filtered = search ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())) : items

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-wrap">
        <div className="topbar">
          <div>
            <div style={{ fontSize:16, fontWeight:700, letterSpacing:'-0.02em', color:'var(--text)' }}>Beneficiari</div>
            <div style={{ fontSize:11, color:'var(--text2)' }}>{items.length} beneficiari înregistrați</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={openNew}>+ Beneficiar nou</button>
        </div>
        <div className="page-content">
          <div style={{ marginBottom:14 }}>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text3)', fontSize:13 }}>🔍</span>
              <input className="input" style={{ paddingLeft:32, maxWidth:400 }} placeholder="Caută beneficiar..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="card">
            {loading ? (
              <div style={{ padding:60, textAlign:'center', color:'var(--text3)' }}>Se încarcă...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding:60, textAlign:'center' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🏢</div>
                <p style={{ color:'var(--text2)', marginBottom:16 }}>{search ? `Niciun rezultat pentru "${search}"` : 'Niciun beneficiar adăugat'}</p>
                {!search && <button className="btn btn-primary" onClick={openNew}>+ Adaugă primul beneficiar</button>}
              </div>
            ) : (
              <table>
                <thead><tr><th>Beneficiar</th><th>Proiecte</th><th>Data adăugării</th><th>Acțiuni</th></tr></thead>
                <tbody>
                  {filtered.map(b => (
                    <tr key={b.id}>
                      <td style={{ fontWeight:600, color:'var(--text)' }}>{b.name}</td>
                      <td style={{ fontSize:11, color:'var(--text3)' }}>—</td>
                      <td style={{ fontSize:11, color:'var(--text3)' }}>{new Date(b.created_at).toLocaleDateString('ro-RO')}</td>
                      <td>
                        <div style={{ display:'flex', gap:6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(b)}>✏️ Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(b.id)}>🗑</button>
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

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth:400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              {editItem ? 'Editează beneficiar' : 'Beneficiar nou'}
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            {error && <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:14, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'var(--red)', fontSize:12 }}>{error}</div>}
            <div className="form-group" style={{ marginBottom:20 }}>
              <label className="label">Nume beneficiar / client</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)}
                placeholder="ex: Köppl GmbH, Stadt München..." autoFocus
                onKeyDown={e => e.key === 'Enter' && save()} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Anulează</button>
              <button className="btn btn-primary" onClick={save} disabled={saving || !name.trim()}>
                ✓ {editItem ? 'Salvează' : 'Adaugă'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" style={{ maxWidth:360 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">Confirmi ștergerea?</div>
            <p style={{ color:'var(--text2)', marginBottom:20 }}>Beneficiarul va fi șters. Proiectele asociate rămân neschimbate.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setDeleteId(null)}>Anulează</button>
              <button className="btn btn-danger" onClick={deleteItem}>Șterge</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
