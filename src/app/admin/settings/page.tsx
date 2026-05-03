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
  const [activeTab, setActiveTab] = useState<'lists'|'email'|'company'>('lists')

  // Email/company settings
  const [adminEmail, setAdminEmail] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [monthlyReport, setMonthlyReport] = useState(true)
  const [settingsSaved, setSettingsSaved] = useState(false)

  useEffect(() => { fetchItems(); fetchSettings() }, [])

  async function fetchItems() {
    const { data } = await supabase.from('list_items').select('*').order('list_name').order('order_index')
    setItems(data||[])
    setLoading(false)
  }

  async function fetchSettings() {
    const { data } = await supabase.from('app_settings').select('*')
    if (data) {
      data.forEach((s: any) => {
        if (s.key==='admin_email') setAdminEmail(s.value)
        if (s.key==='company_name') setCompanyName(s.value)
        if (s.key==='monthly_report_enabled') setMonthlyReport(s.value==='true')
      })
    }
  }

  async function saveSettings() {
    setSaving(true)
    await Promise.all([
      supabase.from('app_settings').upsert({ key:'admin_email', value:adminEmail }),
      supabase.from('app_settings').upsert({ key:'company_name', value:companyName }),
      supabase.from('app_settings').upsert({ key:'monthly_report_enabled', value:String(monthlyReport) }),
    ])
    setSaving(false); setSettingsSaved(true)
    setTimeout(() => setSettingsSaved(false), 3000)
  }

  async function addItem() {
    if (!newValue.trim()) return
    setSaving(true); setError('')
    const exists = items.find(i => i.list_name===activeList && i.value.toLowerCase()===newValue.toLowerCase())
    if (exists) { setError(`"${newValue}" există deja!`); setSaving(false); return }
    const maxOrder = Math.max(0, ...items.filter(i=>i.list_name===activeList).map(i=>i.order_index))
    await supabase.from('list_items').insert({ list_name:activeList, value:newValue.trim(), order_index:maxOrder+1, active:true })
    setNewValue(''); setSaving(false); fetchItems()
  }

  async function toggleItem(id: string, active: boolean) {
    await supabase.from('list_items').update({ active:!active }).eq('id', id); fetchItems()
  }

  async function deleteItem(id: string) {
    await supabase.from('list_items').delete().eq('id', id); fetchItems()
  }

  const currentItems = items.filter(i => i.list_name===activeList)

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-wrap">
        <div className="topbar">
          <div>
            <div style={{fontSize:16,fontWeight:700,letterSpacing:'-0.02em',color:'var(--text)'}}>Setări administrare</div>
            <div style={{fontSize:11,color:'var(--text2)'}}>Liste dropdown, email, firmă</div>
          </div>
        </div>
        <div className="page-content">
          <div className="tab-row" style={{marginBottom:20}}>
            <button className={`tab-btn ${activeTab==='lists'?'active':''}`} onClick={()=>setActiveTab('lists')}>⚙️ Liste dropdown</button>
            <button className={`tab-btn ${activeTab==='email'?'active':''}`} onClick={()=>setActiveTab('email')}>📧 Email & Rapoarte</button>
            <button className={`tab-btn ${activeTab==='company'?'active':''}`} onClick={()=>setActiveTab('company')}>🏢 Firmă & Logo</button>
          </div>

          {activeTab==='lists' && (
            <div style={{display:'grid',gridTemplateColumns:'220px 1fr',gap:16}}>
              <div className="card" style={{padding:0,alignSelf:'start'}}>
                {LIST_NAMES.map(l => (
                  <div key={l.key} onClick={()=>setActiveList(l.key)} style={{
                    padding:'12px 16px',cursor:'pointer',borderBottom:'1px solid var(--border)',
                    background:activeList===l.key?'rgba(59,130,246,0.1)':'transparent',
                    color:activeList===l.key?'var(--acc)':'var(--text)',
                    fontWeight:activeList===l.key?700:500,fontSize:13,
                    borderLeft:activeList===l.key?'3px solid var(--acc)':'3px solid transparent',
                  }}>
                    {l.label}
                    <span style={{float:'right',fontSize:11,color:'var(--text3)'}}>{items.filter(i=>i.list_name===l.key&&i.active).length}</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="card" style={{padding:16}}>
                  <div style={{marginBottom:16}}>
                    <label className="label">Adaugă valoare nouă</label>
                    {error && <div style={{fontSize:11,color:'var(--red)',marginBottom:6}}>{error}</div>}
                    <div style={{display:'flex',gap:8}}>
                      <input className="input" value={newValue} onChange={e=>setNewValue(e.target.value)}
                        placeholder="Valoare nouă..." style={{flex:1}}
                        onKeyDown={e=>e.key==='Enter'&&addItem()}/>
                      <button className="btn btn-primary" onClick={addItem} disabled={saving||!newValue.trim()}>+ Adaugă</button>
                    </div>
                  </div>
                  {loading?<div style={{padding:40,textAlign:'center',color:'var(--text3)'}}>Se încarcă...</div>:(
                    <div>
                      {currentItems.map((item,idx)=>(
                        <div key={item.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderRadius:8,background:item.active?'var(--bg3)':'rgba(239,68,68,0.05)',marginBottom:4,opacity:item.active?1:0.6}}>
                          <span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--text3)',minWidth:20}}>{idx+1}.</span>
                          <span style={{flex:1,fontSize:13,fontWeight:500,color:item.active?'var(--text)':'var(--text3)'}}>{item.value}</span>
                          {!item.active&&<span className="badge badge-red" style={{fontSize:9}}>Inactiv</span>}
                          <button className={`btn btn-sm ${item.active?'btn-ghost':'btn-success'}`} onClick={()=>toggleItem(item.id,item.active)}>
                            {item.active?'Dezactivează':'Activează'}
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={()=>deleteItem(item.id)}>🗑</button>
                        </div>
                      ))}
                      {currentItems.length===0&&<div style={{padding:20,textAlign:'center',color:'var(--text3)',fontSize:12}}>Nicio valoare în această listă</div>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab==='email' && (
            <div className="card" style={{padding:24,maxWidth:560}}>
              <h3 style={{fontSize:14,fontWeight:700,marginBottom:20,color:'var(--text)'}}>Setări email și rapoarte</h3>
              {settingsSaved && <div style={{padding:'10px 14px',borderRadius:8,marginBottom:16,background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.3)',color:'var(--green)',fontSize:12}}>✓ Setările au fost salvate!</div>}
              <div style={{display:'grid',gap:16}}>
                <div className="form-group">
                  <label className="label">Email administrator (pentru rapoarte)</label>
                  <input className="input" type="email" value={adminEmail} onChange={e=>setAdminEmail(e.target.value)} placeholder="vasile.isip@lmt-ingenieure.ro"/>
                  <span style={{fontSize:11,color:'var(--text3)',marginTop:4,display:'block'}}>Raportul lunar va fi trimis la această adresă în prima zi a fiecărei luni.</span>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <input type="checkbox" id="monthly" checked={monthlyReport} onChange={e=>setMonthlyReport(e.target.checked)} style={{width:15,height:15,accentColor:'var(--acc)'}}/>
                  <label htmlFor="monthly" style={{fontSize:13,cursor:'pointer',color:'var(--text)'}}>Activează raport lunar automat</label>
                </div>
                <div style={{padding:'12px 14px',borderRadius:8,background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.2)',fontSize:11,color:'var(--text2)'}}>
                  ℹ️ Raportul lunar automat necesită configurarea unui serviciu email (Resend.com) printr-o Supabase Edge Function. Contactează-mă pentru setup complet.
                </div>
                <button className="btn btn-primary" onClick={saveSettings} disabled={saving}>✓ Salvează setările</button>
              </div>
            </div>
          )}

          {activeTab==='company' && (
            <div className="card" style={{padding:24,maxWidth:560}}>
              <h3 style={{fontSize:14,fontWeight:700,marginBottom:20,color:'var(--text)'}}>Informații firmă</h3>
              {settingsSaved && <div style={{padding:'10px 14px',borderRadius:8,marginBottom:16,background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.3)',color:'var(--green)',fontSize:12}}>✓ Salvat!</div>}
              <div style={{display:'grid',gap:16}}>
                <div className="form-group">
                  <label className="label">Numele firmei</label>
                  <input className="input" value={companyName} onChange={e=>setCompanyName(e.target.value)} placeholder="LMT Ingenieure"/>
                </div>
                <button className="btn btn-primary" onClick={saveSettings} disabled={saving}>✓ Salvează</button>
              </div>
              <div style={{marginTop:24,paddingTop:20,borderTop:'1px solid var(--border)'}}>
                <h4 style={{fontSize:13,fontWeight:700,marginBottom:12,color:'var(--text)'}}>Logo firmă</h4>
                <a href="/admin/logo" className="btn btn-ghost">🖼️ Mergi la setări logo</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
