'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

type ListItem = { id: string; list_name: string; value: string; order_index: number; active: boolean }
const LIST_NAMES = [
  { key:'floor', label:'Etaje' },
  { key:'tip_plan', label:'Tipuri plan' },
  { key:'sch_bew_gen', label:'SCH / BEW / GEN.' },
  { key:'status', label:'Statusuri' },
]

export default function AdminSettingsPage() {
  const [items, setItems] = useState<ListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeList, setActiveList] = useState('floor')
  const [newValue, setNewValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchItems() }, [])

  async function fetchItems() {
    const { data } = await supabase.from('list_items').select('*').order('list_name').order('order_index')
    setItems(data || [])
    setLoading(false)
  }

  async function addItem() {
    if (!newValue.trim()) return
    setSaving(true); setError('')
    const exists = items.find(i => i.list_name === activeList && i.value.toLowerCase() === newValue.toLowerCase())
    if (exists) { setError(`"${newValue}" există deja în această listă!`); setSaving(false); return }
    const maxOrder = Math.max(0, ...items.filter(i => i.list_name === activeList).map(i => i.order_index))
    const { error: e } = await supabase.from('list_items').insert({ list_name:activeList, value:newValue.trim(), order_index:maxOrder+1, active:true })
    if (e) { setError(e.message); setSaving(false); return }
    setNewValue(''); setSaving(false); fetchItems()
  }

  async function toggleItem(id: string, active: boolean) {
    await supabase.from('list_items').update({ active: !active }).eq('id', id); fetchItems()
  }

  async function deleteItem(id: string) {
    await supabase.from('list_items').delete().eq('id', id); fetchItems()
  }

  const currentItems = items.filter(i => i.list_name === activeList)

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-wrap">
        <div className="topbar">
          <div>
            <div style={{ fontSize:16, fontWeight:700, letterSpacing:'-0.02em', color:'var(--text)' }}>Setări liste dropdown</div>
            <div style={{ fontSize:11, color:'var(--text2)' }}>Administrează valorile disponibile în formulare</div>
          </div>
        </div>
        <div className="page-content">
          <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:16 }}>
            {/* Left: list selector */}
            <div className="card" style={{ padding:0, alignSelf:'start' }}>
              {LIST_NAMES.map(l => (
                <div key={l.key} onClick={() => setActiveList(l.key)} style={{
                  padding:'12px 16px', cursor:'pointer', borderBottom:'1px solid var(--border)',
                  background: activeList===l.key ? 'rgba(59,130,246,0.1)' : 'transparent',
                  color: activeList===l.key ? 'var(--acc)' : 'var(--text)',
                  fontWeight: activeList===l.key ? 700 : 500, fontSize:13,
                  borderLeft: activeList===l.key ? '3px solid var(--acc)' : '3px solid transparent',
                }}>
                  {l.label}
                  <span style={{ float:'right', fontSize:11, color:'var(--text3)' }}>
                    {items.filter(i => i.list_name===l.key && i.active).length}
                  </span>
                </div>
              ))}
            </div>

            {/* Right: list items */}
            <div>
              <div className="card" style={{ padding:'16px' }}>
                <div style={{ marginBottom:16 }}>
                  <label className="label">{LIST_NAMES.find(l => l.key===activeList)?.label} — adaugă valoare nouă</label>
                  <div style={{ display:'flex', gap:8 }}>
                    <input className="input" value={newValue} onChange={e => setNewValue(e.target.value)}
                      placeholder="Valoare nouă..." style={{ flex:1 }}
                      onKeyDown={e => e.key === 'Enter' && addItem()} />
                    <button className="btn btn-primary" onClick={addItem} disabled={saving || !newValue.trim()}>+ Adaugă</button>
                  </div>
                  {error && <div style={{ marginTop:8, fontSize:11, color:'var(--red)' }}>{error}</div>}
                </div>

                {loading ? <div style={{ padding:40, textAlign:'center', color:'var(--text3)' }}>Se încarcă...</div> : (
                  <div>
                    {currentItems.map((item, idx) => (
                      <div key={item.id} style={{
                        display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8,
                        background: item.active ? 'var(--bg3)' : 'rgba(239,68,68,0.05)',
                        marginBottom:4, opacity: item.active ? 1 : 0.6
                      }}>
                        <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--text3)', minWidth:20 }}>{idx+1}.</span>
                        <span style={{ flex:1, fontSize:13, fontWeight:500, color: item.active ? 'var(--text)' : 'var(--text3)' }}>{item.value}</span>
                        {!item.active && <span className="badge badge-red" style={{ fontSize:9 }}>Inactiv</span>}
                        <button className={`btn btn-sm ${item.active ? 'btn-ghost' : 'btn-success'}`}
                          onClick={() => toggleItem(item.id, item.active)}>
                          {item.active ? 'Dezactivează' : 'Activează'}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteItem(item.id)}>🗑</button>
                      </div>
                    ))}
                    {currentItems.length === 0 && <div style={{ padding:20, textAlign:'center', color:'var(--text3)', fontSize:12 }}>Nicio valoare în această listă</div>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
