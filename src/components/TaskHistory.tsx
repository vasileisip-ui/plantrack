'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { FIELD_LABELS } from '@/lib/supabase'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'

export default function TaskHistory({ taskId }: { taskId: string }) {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => { fetchHistory() }, [taskId])

  async function fetchHistory() {
    const { data } = await supabase
      .from('task_history')
      .select('*, profile:profiles(full_name)')
      .eq('task_id', taskId)
      .order('changed_at', { ascending: false })
    setHistory(data||[])
    setLoading(false)
  }

  if (loading) return null
  if (history.length === 0) return null

  const visible = expanded ? history : history.slice(0, 3)

  return (
    <div>
      <div style={{ fontSize:12, fontWeight:700, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:10 }}>
        📋 Istoric modificări ({history.length})
      </div>
      {visible.map(h => (
        <div key={h.id} style={{ display:'flex', gap:10, marginBottom:8, fontSize:11 }}>
          <div style={{ width:4, borderRadius:2, background:'var(--border)', flexShrink:0 }}/>
          <div>
            <span style={{ color:'var(--text2)' }}>{format(new Date(h.changed_at), 'dd.MM.yyyy HH:mm', { locale:ro })}</span>
            {' · '}
            <span style={{ fontWeight:600, color:'var(--text)' }}>{h.profile?.full_name}</span>
            {' · '}
            <span style={{ color:'var(--text2)' }}>{FIELD_LABELS[h.field_name]||h.field_name}</span>
            {': '}
            {h.old_value && (
              <span style={{ color:'var(--red)', textDecoration:'line-through', marginRight:4 }}>{h.old_value}</span>
            )}
            {h.new_value && (
              <span style={{ color:'var(--green)', fontWeight:600 }}>{h.new_value}</span>
            )}
          </div>
        </div>
      ))}
      {history.length > 3 && (
        <button className="btn btn-ghost btn-xs" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Arată mai puțin' : `Arată toate (${history.length})`}
        </button>
      )}
    </div>
  )
}
