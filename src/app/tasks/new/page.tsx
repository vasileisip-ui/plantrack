'use client'
import { Suspense } from 'react'
import TaskFormPage from './form'

export default function NewTaskPage() {
  return (
    <Suspense fallback={<div style={{padding:40,textAlign:'center',color:'var(--text3)'}}>Se încarcă...</div>}>
      <TaskFormPage />
    </Suspense>
  )
}