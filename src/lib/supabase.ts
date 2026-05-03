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
