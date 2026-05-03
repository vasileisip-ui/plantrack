'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const adminNav = [
  { href:'/admin', label:'Overview echipă', icon:'⊞' },
  { href:'/admin/users', label:'Utilizatori', icon:'👥' },
  { href:'/admin/projects', label:'Proiecte', icon:'📁' },
  { href:'/admin/beneficiaries', label:'Beneficiari', icon:'🏢' },
  { href:'/admin/reports', label:'Rapoarte', icon:'📊' },
  { href:'/admin/holidays', label:'Sărbători legale', icon:'📅' },
  { href:'/admin/settings', label:'Liste dropdown', icon:'⚙️' },
  { href:'/admin/logo', label:'Logo firmă', icon:'🖼️' },
]
const userNav = [
  { href:'/dashboard', label:'Dashboard', icon:'⊞' },
  { href:'/tasks', label:'Planuri lunare', icon:'📋' },
  { href:'/my-stats', label:'Statistici', icon:'📈' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { profile, signOut } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [theme, setTheme] = useState<'dark'|'light'>('dark')
  const [logoUrl, setLogoUrl] = useState<string|null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'dark'|'light' || 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
    fetchLogo()
    window.addEventListener('logo-updated', fetchLogo)
    return () => window.removeEventListener('logo-updated', fetchLogo)
  }, [])

  async function fetchLogo() {
    const { data } = await supabase.from('app_settings').select('value').eq('key', 'logo_url').single()
    if (data) setLogoUrl(data.value)
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  const isActive = (href: string) =>
    href === '/admin' || href === '/dashboard'
      ? pathname === href
      : pathname.startsWith(href)

  return (
    <div className="sidebar">
      <div className="sb-logo">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" style={{ height:28, maxWidth:28, objectFit:'contain', borderRadius:4, flexShrink:0 }} />
        ) : (
          <div className="sb-icon">📐</div>
        )}
        <div>
          <div className="sb-name">PlanTracker</div>
          <div className="sb-role">{isAdmin ? 'ADMINISTRATOR' : profile?.username?.toUpperCase()}</div>
        </div>
      </div>

      <nav style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
        {isAdmin && (
          <>
            <div className="sb-section">Administrare</div>
            {adminNav.map(({ href, label, icon }) => (
              <Link key={href} href={href} className={`sb-link ${isActive(href) ? 'active' : ''}`}>
                <span style={{ fontSize:13, width:16, textAlign:'center', flexShrink:0 }}>{icon}</span>
                {label}
              </Link>
            ))}
            <div className="sb-section" style={{ marginTop:8 }}>Foaie utilizator</div>
          </>
        )}
        {!isAdmin && <div className="sb-section">Navigare</div>}
        {userNav.map(({ href, label, icon }) => (
          <Link key={href} href={href} className={`sb-link ${isActive(href) ? 'active' : ''}`}>
            <span style={{ fontSize:13, width:16, textAlign:'center', flexShrink:0 }}>{icon}</span>
            {label}
          </Link>
        ))}
      </nav>

      <div className="sb-foot">
        <button className="theme-toggle" onClick={toggleTheme} style={{ width:'100%', justifyContent:'center', marginBottom:8 }}>
          {theme === 'dark' ? '☀️ Temă deschisă' : '🌙 Temă închisă'}
        </button>
        <div className="sb-ucard" style={{ marginBottom:8 }}>
          <div className="sb-uname">{profile?.full_name}</div>
          <div className="sb-uun">@{profile?.username}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={signOut} style={{ width:'100%', justifyContent:'center' }}>
          Deconectare
        </button>
      </div>
    </div>
  )
}
