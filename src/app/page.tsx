'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if already logged in — only redirect if session exists
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase.from('profiles').select('role').eq('id', session.user.id).single()
          .then(({ data }) => {
            if (data) router.push(data.role === 'admin' ? '/admin' : '/dashboard')
            else setChecking(false)
          })
      } else {
        setChecking(false)
      }
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error, data } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Email sau parolă incorectă.'); setLoading(false); return }
    if (data.user) {
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
      router.push(prof?.role === 'admin' ? '/admin' : '/dashboard')
    }
  }

  if (checking) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ color:'var(--text3)', fontSize:13 }}>Se verifică sesiunea...</div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(42,51,71,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(42,51,71,0.4) 1px, transparent 1px)', backgroundSize:'40px 40px', opacity:0.5 }} />
      <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:400, padding:20 }}>
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:52, height:52, borderRadius:14, background:'linear-gradient(135deg, var(--acc), #7c3aed)', marginBottom:16, fontSize:24 }}>📐</div>
          <h1 style={{ fontSize:26, fontWeight:700, letterSpacing:'-0.03em', color:'var(--text)' }}>PlanTracker</h1>
          <p style={{ color:'var(--text2)', marginTop:6, fontSize:13 }}>Evidența planurilor tehnice</p>
        </div>
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:32 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5 }}>Email</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nume@firma.com" required autoFocus />
            </div>
            <div style={{ marginBottom:22 }}>
              <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5 }}>Parolă</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            {error && <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:16, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'var(--red)', fontSize:12 }}>{error}</div>}
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width:'100%', justifyContent:'center', padding:11, fontSize:13 }}>
              {loading ? 'Se conectează...' : 'Autentificare'}
            </button>
          </form>
        </div>
        <p style={{ textAlign:'center', marginTop:16, color:'var(--text3)', fontSize:12 }}>Contul este creat de administrator</p>
      </div>
    </div>
  )
}
