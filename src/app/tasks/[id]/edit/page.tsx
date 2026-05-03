'use client'
import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import TaskFormPage from '../../new/form'

export default function EditTaskPage() {
  const params = useParams()
  const id = params.id as string
  return (
    <Suspense fallback={<div style={{padding:40,textAlign:'center',color:'var(--text3)'}}>Se încarcă...</div>}>
      <TaskFormPage editId={id} />
    </Suspense>
  )
}