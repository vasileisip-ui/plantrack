'use client'
import { useEffect, useState } from 'react'
import { supabase, TaskComment } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'

export default function TaskComments({ taskId }: { taskId: string }) {
  const { profile } = useAuth()
  const [comments, setComments] = useState<TaskComment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchComments() }, [taskId])

  async function fetchComments() {
    const { data } = await supabase
      .from('task_comments')
      .select('*, profile:profiles(full_name, username, role)')
      .eq('task_id', taskId)
      .is('parent_id', null)
      .order('created_at')
    
    // Fetch replies for each comment
    const commentsWithReplies = await Promise.all((data||[]).map(async (c: any) => {
      const { data: replies } = await supabase
        .from('task_comments')
        .select('*, profile:profiles(full_name, username, role)')
        .eq('parent_id', c.id)
        .order('created_at')
      return { ...c, replies: replies||[] }
    }))
    setComments(commentsWithReplies)
    setLoading(false)
  }

  async function addComment() {
    if (!newComment.trim() || !profile) return
    setSaving(true)
    await supabase.from('task_comments').insert({
      task_id: taskId, user_id: profile.id, content: newComment.trim()
    })
    setNewComment(''); setSaving(false); fetchComments()
  }

  async function addReply(parentId: string) {
    if (!replyText.trim() || !profile) return
    setSaving(true)
    await supabase.from('task_comments').insert({
      task_id: taskId, user_id: profile.id, parent_id: parentId, content: replyText.trim()
    })
    setReplyText(''); setReplyTo(null); setSaving(false); fetchComments()
  }

  async function deleteComment(id: string) {
    await supabase.from('task_comments').delete().eq('id', id)
    fetchComments()
  }

  function CommentBubble({ c, isReply }: { c: any; isReply?: boolean }) {
    const isAdmin = c.profile?.role === 'admin'
    const isOwn = c.user_id === profile?.id
    return (
      <div style={{ marginBottom: isReply?6:12, paddingLeft: isReply?24:0 }}>
        <div style={{
          background: isAdmin ? 'rgba(59,130,246,0.1)' : 'var(--bg3)',
          border: `1px solid ${isAdmin ? 'rgba(59,130,246,0.3)' : 'var(--border)'}`,
          borderRadius: 9, padding: '10px 12px',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontWeight:700, fontSize:12, color:'var(--text)' }}>{c.profile?.full_name}</span>
              {isAdmin && <span className="badge badge-admin" style={{ fontSize:9 }}>Admin</span>}
              {isReply && <span style={{ fontSize:10, color:'var(--text3)' }}>↩ răspuns</span>}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:10, color:'var(--text3)' }}>
                {format(new Date(c.created_at), 'dd.MM HH:mm', { locale: ro })}
              </span>
              {isOwn && (
                <button onClick={() => deleteComment(c.id)}
                  style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:12 }}
                  onMouseEnter={e => ((e.currentTarget as any).style.color='var(--red)')}
                  onMouseLeave={e => ((e.currentTarget as any).style.color='var(--text3)')}>✕</button>
              )}
            </div>
          </div>
          <p style={{ fontSize:13, color:'var(--text)', lineHeight:1.5, whiteSpace:'pre-wrap' }}>{c.content}</p>
        </div>
        {!isReply && (
          <button className="btn btn-ghost btn-xs" style={{ marginTop:4 }} onClick={() => setReplyTo(replyTo===c.id?null:c.id)}>
            ↩ Răspunde
          </button>
        )}
        {replyTo === c.id && (
          <div style={{ marginTop:6, paddingLeft:24 }}>
            <textarea className="input" rows={2} value={replyText} onChange={e => setReplyText(e.target.value)}
              placeholder="Scrie un răspuns..." style={{ marginBottom:6 }} />
            <div style={{ display:'flex', gap:6 }}>
              <button className="btn btn-ghost btn-xs" onClick={() => { setReplyTo(null); setReplyText('') }}>Anulează</button>
              <button className="btn btn-primary btn-xs" onClick={() => addReply(c.id)} disabled={saving||!replyText.trim()}>Trimite</button>
            </div>
          </div>
        )}
        {c.replies?.map((r: any) => <CommentBubble key={r.id} c={r} isReply />)}
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontSize:12, fontWeight:700, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:12 }}>
        💬 Comentarii ({comments.length})
      </div>
      {loading ? (
        <div style={{ color:'var(--text3)', fontSize:12 }}>Se încarcă...</div>
      ) : (
        <>
          {comments.map(c => <CommentBubble key={c.id} c={c} />)}
          {comments.length === 0 && (
            <div style={{ color:'var(--text3)', fontSize:12, padding:'12px 0', textAlign:'center' }}>
              Niciun comentariu încă
            </div>
          )}
        </>
      )}
      <div style={{ marginTop:12 }}>
        <textarea className="input" rows={2} value={newComment} onChange={e => setNewComment(e.target.value)}
          placeholder={profile?.role==='admin' ? 'Adaugă un comentariu sau feedback pentru angajat...' : 'Adaugă un comentariu...'}
          style={{ marginBottom:6 }} />
        <button className="btn btn-primary btn-sm" onClick={addComment} disabled={saving||!newComment.trim()}>
          💬 Adaugă comentariu
        </button>
      </div>
    </div>
  )
}
