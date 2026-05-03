'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

export default function LogoPage() {
  const [logoUrl, setLogoUrl] = useState<string|null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchLogo() }, [])

  async function fetchLogo() {
    const { data } = await supabase.from('app_settings').select('value').eq('key', 'logo_url').single()
    if (data) setLogoUrl(data.value)
  }

  async function uploadLogo(file: File) {
    setUploading(true); setError(''); setSuccess('')
    if (!file.type.startsWith('image/')) { setError('Selectează o imagine (PNG, JPG, SVG)!'); setUploading(false); return }
    if (file.size > 2 * 1024 * 1024) { setError('Imaginea trebuie să fie mai mică de 2MB!'); setUploading(false); return }

    const ext = file.name.split('.').pop()
    const path = `logo/company-logo.${ext}`

    const { error: upErr } = await supabase.storage.from('app-assets').upload(path, file, { upsert: true })
    if (upErr) { setError(upErr.message); setUploading(false); return }

    const { data: urlData } = supabase.storage.from('app-assets').getPublicUrl(path)
    const publicUrl = urlData.publicUrl + '?t=' + Date.now()

    await supabase.from('app_settings').upsert({ key:'logo_url', value:publicUrl })
    setLogoUrl(publicUrl); setSuccess('Logo actualizat cu succes!'); setUploading(false)
    // Force sidebar refresh
    window.dispatchEvent(new Event('logo-updated'))
  }

  async function removeLogo() {
    await supabase.from('app_settings').delete().eq('key', 'logo_url')
    setLogoUrl(null); setSuccess('Logo eliminat.')
  }

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-wrap">
        <div className="topbar">
          <div>
            <div style={{ fontSize:16, fontWeight:700, letterSpacing:'-0.02em', color:'var(--text)' }}>Logo firmă</div>
            <div style={{ fontSize:11, color:'var(--text2)' }}>Logo-ul apare în sidebar lângă PlanTracker</div>
          </div>
        </div>
        <div className="page-content">
          <div className="card" style={{ padding:28, maxWidth:500 }}>
            {error && <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:16, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'var(--red)', fontSize:12 }}>{error}</div>}
            {success && <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:16, background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', color:'var(--green)', fontSize:12 }}>{success}</div>}

            {/* Current logo */}
            <div style={{ marginBottom:24 }}>
              <div className="label">Logo curent</div>
              <div style={{ width:120, height:60, borderRadius:8, background:'var(--bg3)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain' }} />
                ) : (
                  <span style={{ fontSize:11, color:'var(--text3)' }}>Fără logo</span>
                )}
              </div>
            </div>

            {/* Upload */}
            <div style={{ marginBottom:16 }}>
              <div className="label">Încarcă logo nou</div>
              <div style={{ fontSize:11, color:'var(--text3)', marginBottom:10 }}>Format PNG, JPG sau SVG. Maxim 2MB. Recomandat: fundal transparent, dimensiune 200×80px.</div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }}
                onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? '⏳ Se încarcă...' : '📁 Selectează imagine'}
                </button>
                {logoUrl && <button className="btn btn-danger" onClick={removeLogo}>🗑 Elimină logo</button>}
              </div>
            </div>

            <div style={{ padding:'12px 14px', borderRadius:8, background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.2)', fontSize:11, color:'var(--text2)' }}>
              ℹ️ Logo-ul este salvat în Supabase Storage. Asigură-te că ai creat un bucket public numit <strong>app-assets</strong> în Supabase → Storage.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
