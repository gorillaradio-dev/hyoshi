# Guida all'onboarding — TrainerHub

> Generata automaticamente da `understand-onboard` a partire dal knowledge graph
> (`.understand-anything/knowledge-graph.json`). Riflette lo stato del codice al
> commit analizzato; rigenerare dopo modifiche significative.

## Panoramica del progetto

**TrainerHub** è un SaaS multi-tenant per personal trainer che permette di gestire allievi, gruppi e quote/pagamenti mensili. È costruito su Laravel 12 con frontend React 19 + Inertia.js e UI shadcn/ui, in modalità single-database con tenancy path-based (colonna discriminante `tenant_id`) tramite stancl/tenancy.

- **Linguaggi:** PHP, TypeScript, JavaScript, CSS, HTML, YAML, JSON, Markdown
- **Framework:** Laravel, Inertia.js, React, Tailwind CSS, stancl/tenancy, Laravel Fortify, Laravel Wayfinder, Vite, Pest, GitHub Actions
- **Dimensione:** 252 file analizzati · 403 nodi · 780 relazioni · 10 layer

## Layer architetturali

| Layer | Descrizione | File chiave |
|---|---|---|
| **HTTP / Controller** (32) | Controller HTTP (Central/Tenant/Settings/Auth), middleware multi-tenant, FormRequest, route e front controller per il ciclo richiesta/risposta. | `StudentController.php`, `routes/tenant.php`, `OnboardingController.php` |
| **Domain / Service** (16) | Business logic: service per fee/pagamenti, enum di stato/tipo, policy, trait condivisi, service provider, action Fortify. | `MonthlyFeeService.php`, `EnrollmentFeeService.php`, `FeeCalculationService.php` |
| **Dati** (56) | Modelli Eloquent del dominio, migrazioni e tabelle, factory e seeder per la persistenza single-database multi-tenant. | `Student.php`, tabella `students`, `Payment.php` |
| **Frontend — Pagine Inertia** (26) | Pagine Inertia React (Tenant, Central, Settings, Auth) con entry point `app.tsx`/`ssr.tsx` e template Blade radice. | `Tenant/Student/Index.tsx`, `Tenant/Student/Show.tsx` |
| **Frontend — Componenti & Layout** (42) | Componenti React riutilizzabili (form, dialog, navigazione), layout persistenti Inertia, foglio di stile Tailwind/shadcn. | `student-form.tsx`, `app-header.tsx`, `app.css` |
| **Frontend — Hook, Utility & Type** (20) | Custom hook (`useTenant`, `useAppearance`), utility condivise e type-definition TypeScript del dominio. | `use-tenant`, `types/student.ts`, `lib/utils.ts` |
| **Test** (29) | Suite Pest/PHPUnit (Feature e Unit) che verificano controller, service e isolamento dei tenant. | `PaymentEdgeCasesTest.php`, `StudentControllerTest.php` |
| **Configurazione** (25) | Config Laravel (incl. `tenancy.php`, `fortify.php`) e tool di build/lint (Vite, ESLint, tsconfig, composer, pint). | `config/tenancy.php`, `config/fortify.php` |
| **CI/CD** (6) | Workflow GitHub Actions per deploy, lint, test, sync docs e code review automatica. | `deploy.yml`, `tests.yml`, `lint.yml` |
| **Documentazione** (18) | Architettura, piani e specifiche di sprint, note testing mobile, `CLAUDE.md` e portale docs. | `architecture.md`, `CLAUDE.md` |

## Concetti chiave

- **Multi-tenancy single-database.** Tutti i tenant (palestre) condividono lo stesso database; i modelli tenant-scoped usano un global scope Eloquent che aggiunge `WHERE tenant_id = ?` a ogni query e valorizza `tenant_id` alla creazione. Il tenant è risolto dal path della route.
- **Controller thin + Service.** I controller delegano la business logic ai service (`FeeCalculationService`, `MonthlyFeeService`, `EnrollmentFeeService`); la validazione vive nelle FormRequest.
- **Backed enum PHP 8.1.** `StudentStatus`, `PaymentMethod`, ecc. associano a ogni caso un valore scalare persistito, spostando la validazione dei valori ammessi sul sistema dei tipi.
- **UUID e importi in centesimi.** Chiavi primarie UUID ovunque; gli importi monetari sono interi in centesimi.
- **Inertia, non REST.** Il backend risponde con il nome di un componente di pagina e le sue props; `app.tsx` lo risolve via `resolvePageComponent`. Niente API REST separata.
- **Mobile-first.** Il `tenant-layout` alterna sidebar desktop e navigazione mobile; l'hook `use-tenant` legge il tenant dalle shared props di Inertia.

## Tour guidato

1. **Panoramica del progetto** — `docs/architecture.md` + `CLAUDE.md`: mappa concettuale (multi-tenancy, schema DB, impianto Laravel + React/Inertia, convenzioni).
2. **Architettura multi-tenant** — `config/tenancy.php`, modello `Tenant`, middleware `EnsureTenantAccess`: lo strato di isolamento dentro cui vive tutto il resto.
3. **Route e front controller** — `public/index.php` → `routes/tenant.php`: route path-based `app/{tenant:slug}/...` per dashboard, allievi, gruppi, pagamenti.
4. **Strato HTTP** — `StudentController` (CRUD allievi), `StudentPaymentController` (storico/registrazione pagamenti); validazione nelle FormRequest (`StoreStudentRequest`).
5. **Dominio: i service tariffe** — `FeeCalculationService` (tariffa effettiva), `MonthlyFeeService` (quote mensili), `EnrollmentFeeService` (iscrizioni): il cluster più connesso.
6. **Enum di stato e tipo** — `StudentStatus`, `PaymentMethod`: dominio auto-documentante, stati non validi impossibili a livello di tipo.
7. **Modelli Eloquent** — `Student` (entità centrale), `Group` (many-to-many), `Payment` (collegato a `MonthlyFee`/`EnrollmentFee`), `User`, `Tenant`.
8. **Schema del database** — migrazioni: `tenants` (radice multi-tenancy), `students`, `payments`, `groups` + pivot `group_student`.
9. **Entry point e tipi frontend** — `app.tsx` (monta l'app, risolve le pagine Inertia), `types/index.ts` (barrel dei type-definition di dominio).
10. **Layout tenant e `useTenant`** — `tenant-layout` (sidebar/bottom-nav), hook `use-tenant`: l'equivalente client-side dello scope tenant.
11. **Pagine di gestione** — `Student/Index` (elenco + filtri), `Student/Show` (dettaglio), `Group/Show` (membri con ricerca debounced).
12. **Test e CI/CD** — `PaymentEdgeCasesTest` (casi limite denaro), `tests.yml` (suite a ogni push/PR), `deploy.yml` (staging via SSH).

## Mappa dei file (per layer)

### HTTP / Controller
- `app/Http/Controllers/Tenant/StudentController.php` — gestione completa degli allievi: elenco con filtri e indicatori di quote scoperte, CRUD, sospensione/riattivazione, ricerca, contatti d'emergenza.
- `app/Http/Controllers/Central/OnboardingController.php` — onboarding del trainer: crea il tenant (palestra) con slug univoco.
- `app/Http/Controllers/Tenant/GroupController.php` — CRUD dei gruppi con conteggio iscritti e authorization.
- `routes/tenant.php` — route tenant path-based (`app/{tenant}`) per dashboard, allievi, gruppi, pagamenti.
- `routes/web.php` — route centrali: home, redirect dashboard, onboarding.

### Domain / Service
- `app/Services/MonthlyFeeService.php` — quote mensili: calcola periodi non coperti, registra pagamenti generando le quote dovute, conteggi batch per la dashboard.
- `app/Services/EnrollmentFeeService.php` — quota di iscrizione: registra iscrizioni con pagamento, gestisce validità/rinnovo.
- `app/Services/FeeCalculationService.php` — tariffa effettiva (quota di gruppo / override) e saldo.
- `app/Providers/TenancyServiceProvider.php` — mappa gli eventi del ciclo di vita del tenant ai listener.

### Dati
- `app/Models/Student.php` — modello centrale: relazioni verso contatti, quote, documenti, pagamenti, gruppi.
- tabella `students` — anagrafica, status, dati di fatturazione, `tenant_id` scoped verso `tenants`.
- `app/Models/Payment.php`, `app/Models/Group.php`, `app/Models/Tenant.php` — entità di dominio e radice multi-tenant.
- `database/migrations/...restructure_monthly_fees_table` / `...restructure_enrollment_fees_table` — collegano le quote a `payments`.

### Frontend
- `resources/js/pages/Tenant/Student/Index.tsx` — elenco allievi con filtri e pagamento rapido.
- `resources/js/pages/Tenant/Student/Show.tsx` — dettaglio allievo (anagrafica, contatti, gruppi, pagamenti).
- `resources/js/components/student-form.tsx` — form allievo con contatti dinamici e override quota.
- `resources/js/components/app-header.tsx` — shell di navigazione superiore.
- `resources/js/hooks/use-tenant` · `resources/js/types/student.ts` — accesso al tenant e tipi di dominio.

### Configurazione, Test, CI/CD, Docs
- `config/tenancy.php`, `config/fortify.php`, `config/database.php`, `config/session.php` — config critiche.
- `tests/Feature/Tenant/*Test.php`, `tests/Unit/Services/*Test.php` — copertura dominio + isolamento tenant.
- `.github/workflows/{tests,deploy,lint,sync-docs}.yml` — automazione CI/CD.
- `docs/architecture.md`, `CLAUDE.md` — architettura e convenzioni.

## Hotspot di complessità

Aree da affrontare con cautela (file marcati `complex`):

- `app/Http/Controllers/Tenant/StudentController.php` — controller centrale, molte responsabilità.
- `app/Services/MonthlyFeeService.php` — logica dei periodi/quote, casi limite del denaro.
- `resources/js/pages/Tenant/Student/Index.tsx` · `Show.tsx` — pagine ricche di stato e filtri.
- `resources/js/components/student-form.tsx` · `app-header.tsx` · `two-factor-setup-modal.tsx` — componenti complessi.
- `tests/Feature/Tenant/PaymentEdgeCasesTest.php` e gli altri test pagamenti — riferimento per le regole di business sul denaro.
- `config/tenancy.php`, `config/fortify.php`, `config/database.php`, `config/session.php` — configurazioni critiche.
