# 🚀 PlanTracker — Ghid complet de instalare și deployment GRATUIT

**Stack:** Next.js 14 + Supabase (baza de date) + Vercel (hosting)
**Cost:** 100% GRATUIT

---

## PASUL 1 — Creează contul Supabase (baza de date)

1. Mergi la **https://supabase.com** → click **Start your project**
2. Înregistrează-te cu GitHub sau email
3. Click **New Project**
   - Organization: alege organizația ta (sau cea default)
   - Name: `plantracker`
   - Database Password: alege o parolă puternică (salvează-o!)
   - Region: **Frankfurt (eu-central-1)** (cel mai aproape de România)
   - Plan: **Free**
4. Click **Create new project** — durează ~2 minute

---

## PASUL 2 — Configurează baza de date

1. În Supabase, mergi la **SQL Editor** (icona de cod din stânga)
2. Click **New query**
3. Deschide fișierul `supabase_schema.sql` din proiect
4. **Copiază tot conținutul** și lipește-l în SQL Editor
5. Click **Run** (sau Ctrl+Enter)
6. Ar trebui să apară: ✅ `Success. No rows returned`

---

## PASUL 3 — Obține cheile API Supabase

1. În Supabase, mergi la **Project Settings** (icona roată) → **API**
2. Copiază:
   - **Project URL** → ex: `https://abcdefghijk.supabase.co`
   - **anon public** key → șir lung de text

---

## PASUL 4 — Încarcă codul pe GitHub

1. Mergi la **https://github.com** → creează cont dacă nu ai
2. Click **New repository**
   - Name: `plantracker`
   - Visibility: **Private** (recomandat)
   - Click **Create repository**
3. Pe calculatorul tău, instalează **Git** dacă nu ai: https://git-scm.com/
4. Deschide Terminal / Command Prompt în folderul `plantracker/`
5. Rulează comenzile:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/plantracker.git
git push -u origin main
```
*(înlocuiește USERNAME cu username-ul tău GitHub)*

---

## PASUL 5 — Deploy pe Vercel (hosting gratuit)

1. Mergi la **https://vercel.com** → click **Start Deploying**
2. Conectează-te cu contul GitHub
3. Click **Add New Project** → **Import Git Repository**
4. Selectează `plantracker`
5. Framework Preset: **Next.js** (auto-detectat)
6. Click **Environment Variables** → adaugă:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL-ul copiat la Pasul 3 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cheia anon copiată la Pasul 3 |

7. Click **Deploy**
8. Durează ~2 minute → primești link-ul: `https://plantracker-xxx.vercel.app`

---

## PASUL 6 — Configurează Supabase Auth (obligatoriu)

1. În Supabase, mergi la **Authentication** → **URL Configuration**
2. **Site URL**: introdu URL-ul de la Vercel, ex: `https://plantracker-xxx.vercel.app`
3. **Redirect URLs**: adaugă `https://plantracker-xxx.vercel.app/**`
4. Click **Save**

---

## PASUL 7 — Creează primul cont de Administrator

1. Deschide aplicația: `https://plantracker-xxx.vercel.app`
2. Mergi la Supabase → **Authentication** → **Users** → **Add user**
3. Completează:
   - Email: `admin@firma.ta.com`
   - Password: alege o parolă
   - ✅ **Auto Confirm User** (bifează)
4. Click **Create User**
5. Acum mergi la **SQL Editor** și rulează:

```sql
UPDATE public.profiles
SET role = 'admin', full_name = 'Administrator', username = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'admin@firma.ta.com'
);
```

6. Intră în aplicație cu email-ul și parola → ești admin! 🎉

---

## PASUL 8 — Adaugă utilizatori noi (din aplicație)

1. Loghează-te ca administrator
2. Mergi la **Utilizatori** → **Utilizator nou**
3. Completează: Nume, Username, Email, Parolă, Rol
4. Click **Creează cont**

> ⚠️ **Notă importantă:** Supabase Free tier necesită confirmarea emailului. Pentru a evita asta, mergi la Supabase → Authentication → **Email** → dezactivează "Confirm email". Altfel, userul va primi un email de confirmare.

---

## STRUCTURA APLICAȚIEI

```
PlanTracker
├── / (Login)
├── /dashboard          → Dashboard utilizator (planuri de azi, statistici luna)
├── /tasks              → Lista planuri lunare, grupate pe zile
├── /tasks/new          → Adaugă plan nou
├── /tasks/[id]/edit    → Editează plan
├── /my-stats           → Statistici personale cu grafice
│
└── ADMIN
    ├── /admin          → Overview global (toți utilizatorii)
    ├── /admin/users    → Gestionare utilizatori + atribuire proiecte
    ├── /admin/projects → Gestionare proiecte + bauteile
    ├── /admin/reports  → Rapoarte centralizate cu filtre
    └── /admin/holidays → Sărbători legale
```

---

## FUNCȚIONALITĂȚI IMPLEMENTATE

### Utilizator normal:
- ✅ Login cu email + parolă
- ✅ Dashboard cu statistici zilnice și lunare
- ✅ Adaugare/editare/ștergere planuri zilnice
- ✅ Toate câmpurile din Excel: Proiect, Bauteil, SCH/BEW/GEN, Nr. Plan, Etaj, Descriere, Status, Tip Plan, Inceput/Pauza/Terminat, Ore calculate automat, Data Corecție, Verificat, Observații
- ✅ Navigare lunară
- ✅ Statistici personale cu grafice (ore/lună, planuri per tip, ore pe proiect)

### Administrator:
- ✅ Panou de control cu performanța tuturor utilizatorilor
- ✅ Creare utilizatori cu parolă
- ✅ Atribuire proiecte pe utilizatori
- ✅ Gestionare proiecte + bauteile
- ✅ Rapoarte centralizate cu filtre (an, lună, utilizator, proiect, tip plan)
- ✅ Grafic ore per utilizator per lună
- ✅ Tabel detaliat cu toate taskurile din firmă
- ✅ Gestionare sărbători legale

---

## ACTUALIZĂRI VIITOARE

Orice modificare în cod:
```bash
git add .
git commit -m "Descriere modificare"
git push
```
Vercel va face deploy automat în ~1 minut.

---

## SUPORT

- Documentație Supabase: https://supabase.com/docs
- Documentație Next.js: https://nextjs.org/docs
- Documentație Vercel: https://vercel.com/docs
- Limita free Supabase: 500MB stocare, 50.000 rânduri/lună — mai mult decât suficient
- Limita free Vercel: nelimitată pentru proiecte hobby

---

## STRUCTURA BAZEI DE DATE

| Tabel | Descriere |
|-------|-----------|
| `profiles` | Utilizatori (extinde auth Supabase) |
| `projects` | Proiecte cu abreviere și client |
| `bauteile` | Sub-componente ale proiectelor |
| `user_projects` | Relație utilizator ↔ proiect |
| `tasks` | Planurile zilnice (echivalentul rândurilor din Excel) |
| `holidays` | Sărbători legale per an |
