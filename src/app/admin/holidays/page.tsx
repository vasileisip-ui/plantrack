'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

type Holiday = { id: string; holiday_date: string; name: string; year: number }
const MONTHS_RO = ['Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie','Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie']

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<Holiday | null>(null)
  const [showCopy, setShowCopy] = useState(false)
  const [form, setForm] = useState({ holiday_date: '', name: '' })
  const [copyFrom, setCopyFrom] = useState('')
  const [saving, setSaving] = useState(false)
  const [allYears, setAllYears] = useState<number[]>([])

  useEffect(() => { fetchHolidays() }, [year])

  async function fetchHolidays() {
    const { data } = await supabase.from('holidays').select('*').eq('year', year).order('holiday_date')
    setHolidays(data || [])
    // get all distinct years
    const { data: yd } = await supabase.from('holidays').select('year')
    const years = Array.from(new Set((yd || []).map((r: any) => r.year))).sort((a,b) => b-a)
    if (!years.includes(year)) years.push(year)
    setAllYears(Array.from(new Set([...years, year-1, year, year+1])).sort((a,b) => b-a))
  }

  async function saveHoliday() {
    setSaving(true)
    if (editItem) {
      await supabase.from('holidays').update({ holiday_date: form.holiday_date, name: form.name }).eq('id', editItem.id)
    } else {
      await supabase.from('holidays').insert({ holiday_date: form.holiday_date, name: form.name })
    }
    setSaving(false); setShowModal(false); setEditItem(null); fetchHolidays()
  }

  async function deleteHoliday(id: string) {
    if (!confirm('Ștergi această zi liberă?')) return
    await supabase.from('holidays').delete().eq('id', id)
    fetchHolidays()
  }

  async function copyFromYear() {
    if (!copyFrom) return
    setSaving(true)
    const { data: src } = await supabase.from('holidays').select('*').eq('year', parseInt(copyFrom))
    const toInsert = (src || []).map((h: Holiday) => ({
      holiday_date: h.holiday_date.replace(/^\d{4}/, String(year)),
      name: h.name,
    }))
    if (toInsert.length > 0) await supabase.from('holidays').insert(toInsert)
    setSaving(false); setShowCopy(false); fetchHolidays()
  }

  function openNew(defaultMonth?: number) {
    const dd = defaultMonth ? `${year}-${String(defaultMonth).padStart(2,'0')}-01` : `${year}-01-01`
    setEditItem(null); setForm({ holiday_date: dd, name: '' }); setShowModal(true)
  }

  function openEdit(h: Holiday) {
    setEditItem(h); setForm({ holiday_date: h.holiday_date, name: h.name }); setShowModal(true)
  }

  const byMonth: Record<number, Holiday[]> = {}
  holidays.forEach(h => {
    const m = parseInt(h.holiday_date.slice(5,7)) - 1
    if (!byMonth[m]) byMonth[m] = []
    byMonth[m].push(h)
  })

  const otherYears = allYears.filter(y => y !== year)

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-wrap">
        <div className="topbar">
          <div>
            <div style={{ fontSize:16, fontWeight:700, letterSpacing:'-0.02em' }}>Sărbători legale</div>
            <div style={{ fontSize:11, color:'var(--text2)' }}>{holidays.length} zile libere în {year} — se actualizează anual</div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <div style={{ display:'flex', gap:3 }}>
              {[2025,2026,2027].map(y => (
                <button key={y} className={`btn btn-sm ${year===y ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setYear(y)}>{y}</button>
              ))}
            </div>
            {otherYears.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setCopyFrom(String(otherYears[0])); setShowCopy(true) }}>
                📋 Copiază din alt an
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={() => openNew()}>+ Adaugă zi liberă</button>
          </div>
        </div>

        <div className="page-content">
          <div className="month-grid">
            {MONTHS_RO.map((mName, mi) => {
              const hs = byMonth[mi] || []
              return (
                <div key={mi} className="month-card">
                  <div className="month-name">{mName}</div>
                  {hs.length === 0 && (
                    <div style={{ fontSize:11, color:'var(--text3)', padding:'4px 0' }}>Fără zile libere</div>
                  )}
                  {hs.map(h => (
                    <div key={h.id} className="holiday-item">
                      <div>
                        <div className="holiday-date">{h.holiday_date.slice(8)}.{h.holiday_date.slice(5,7)}</div>
                        <div className="holiday-name">{h.name}</div>
                      </div>
                      <div style={{ display:'flex', gap:4 }}>
                        <button onClick={() => openEdit(h)}
                          style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:13 }}>✏️</button>
                        <button onClick={() => deleteHoliday(h.id)}
                          style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:14 }}
                          onMouseEnter={e => (e.currentTarget.style.color='var(--red)')}
                          onMouseLeave={e => (e.currentTarget.style.color='var(--text3)')}>✕</button>
                      </div>
                    </div>
                  ))}
                  <button className="btn btn-ghost btn-xs" onClick={() => openNew(mi+1)}
                    style={{ width:'100%', justifyContent:'center', marginTop:6 }}>
                    + Adaugă în {mName}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ADD/EDIT MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth:420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              {editItem ? 'Editează zi liberă' : `Zi liberă nouă — ${year}`}
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="label">Data</label>
                <input className="input" type="date" value={form.holiday_date}
                  onChange={e => setForm(f => ({ ...f, holiday_date: e.target.value }))} />
              </div>
              <div className="form-group full">
                <label className="label">Denumire sărbătoare</label>
                <input className="input" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="ex: Paște (Duminică)" autoFocus />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Anulează</button>
              <button className="btn btn-primary" onClick={saveHoliday} disabled={saving || !form.holiday_date || !form.name}>
                ✓ {editItem ? 'Salvează' : 'Adaugă'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COPY YEAR MODAL */}
      {showCopy && (
        <div className="modal-overlay" onClick={() => setShowCopy(false)}>
          <div className="modal" style={{ maxWidth:420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              Copiază sărbători din alt an
              <button className="modal-close" onClick={() => setShowCopy(false)}>✕</button>
            </div>
            <p style={{ fontSize:12, color:'var(--text2)', marginBottom:14 }}>
              Copiază toate zilele din alt an în <strong style={{ color:'var(--text)' }}>{year}</strong>.
              Poți modifica ulterior datele variabile (ex: Paște, Rusalii).
            </p>
            <div className="form-group">
              <label className="label">Copiază din anul</label>
              <select className="select" value={copyFrom} onChange={e => setCopyFrom(e.target.value)}>
                {otherYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowCopy(false)}>Anulează</button>
              <button className="btn btn-primary" onClick={copyFromYear} disabled={saving}>
                ✓ Copiază în {year}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
