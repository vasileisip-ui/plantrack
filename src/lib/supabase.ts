import { createClient } from '@supabase/supabase-js'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export type Profile = { id:string;username:string;full_name:string;role:'admin'|'user';created_at:string;email?:string }
export type Project = { id:string;name:string;abbreviation:string;client?:string;description?:string;active:boolean;created_at:string }
export type Bauteil = { id:string;project_id:string;name:string;order_index:number }
export type Task = { id:string;user_id:string;project_id?:string;bauteil_id?:string;task_date:string;month:string;task_number:number;sch_bew_gen?:'SCH'|'BEW'|'GENERALITATI';plan_number?:string;floor?:string;plan_description?:string;status:'IN_LUCRU'|'PAUZA'|'TERMINAT';tip_plan?:'NOU'|'C_DE'|'C_LMT'|'FREI'|'NTR'|'MKT'|'MKT_45';time_start?:string;time_pause?:string;time_end?:string;hours_worked?:number;correction_date?:string;verified?:boolean;notes?:string;created_at:string;project?:Project;bauteil?:Bauteil;profile?:Profile }
export type Holiday = { id:string;holiday_date:string;name:string;year:number }
export const TIP_BADGE:Record<string,string>={NOU:'badge-nou',C_DE:'badge-cde',C_LMT:'badge-clmt',FREI:'badge-frei',NTR:'badge-ntr',MKT:'badge-mkt',MKT_45:'badge-mkt'}
export const STATUS_BADGE:Record<string,string>={IN_LUCRU:'badge-inlucru',PAUZA:'badge-pauza',TERMINAT:'badge-terminat'}
export const STATUS_LABEL:Record<string,string>={IN_LUCRU:'In lucru',PAUZA:'Pauza',TERMINAT:'Terminat'}
export const SCH_BADGE:Record<string,string>={SCH:'badge-sch',BEW:'badge-bew',GENERALITATI:'badge-gen'}
export const MONTHS_RO=['Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie','Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie']
export const FLOOR_OPTIONS=['BO','KG','EG','1.OG','2.OG','3.OG','4.OG','5.OG','6.OG','7.OG','8.OG','9.OG','SG','DG','-']
export const TIP_OPTIONS=['NOU','C_DE','C_LMT','FREI','NTR','MKT','MKT_45','-']
export const STATUS_OPTIONS=['IN_LUCRU','PAUZA','TERMINAT']
export const SCH_OPTIONS=['SCH','BEW','GENERALITATI']

export type AppSetting = { key: string; value: string }
export type ListItem = { id: string; list_name: string; value: string; order_index: number; active: boolean }

export type TaskComment = {
  id: string; task_id: string; user_id: string; parent_id?: string
  content: string; created_at: string; updated_at: string
  profile?: Profile; replies?: TaskComment[]
}
export type TaskHistory = {
  id: string; task_id: string; user_id?: string
  field_name: string; old_value?: string; new_value?: string
  changed_at: string; profile?: Profile
}

// Correct hours calculation
export function calcHoursCorrect(start?: string, pause?: string, end?: string): number | null {
  if (!start || !end) return null
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const startMin = toMin(start)
  const endMin = toMin(end)
  let workedMin = endMin - startMin
  if (workedMin <= 0) return null
  // If pause time provided, calculate pause duration from start to pause
  // Pause = ora la care a inceput pauza, deci munca = start->pause + (end->end fara pauza)
  // Formula corecta: daca avem pauza, angajatul a lucrat de la start la pause, a facut pauza, si a reluat
  // Dar nu stim cat a durat pauza. Conventie: pauza = ora la care incepe, terminat = ora la care termina complet
  // Deci: ore lucrate = (pause - start) + (end - pause) = end - start... dar asta nu are sens
  // Conventie corecta din Excel: Inceput=08:00, Pauza=12:00(ora la care pleaca), Terminat=16:00(ora la care pleaca acasa)
  // Ore lucrate = (Pauza - Inceput) + ??? Nu stim cand s-a intors din pauza
  // SIMPLIFICAT: Ore = Terminat - Inceput (pauza e indicativa, nu dedusa)
  // Sau: daca pauza e ora pranzului (ex 12:00-13:00 = 1h), ore = (end-start) - 1h
  // Din Excel original: ore = end - start (pauza nu se deduce automat)
  return workedMin / 60
}

export const FIELD_LABELS: Record<string, string> = {
  project_id: 'Proiect', bauteil_id: 'Bauteil', sch_bew_gen: 'SCH/BEW/GEN',
  plan_number: 'Nr. Plan', floor: 'Etaj', plan_description: 'Descriere',
  status: 'Status', tip_plan: 'Tip Plan', time_start: 'Început',
  time_pause: 'Pauză', time_end: 'Terminat', hours_worked: 'Ore',
  correction_date: 'Data Corecție', verified: 'Verificat', notes: 'Observații'
}
