# Guest Families + Animated Headers + Wishlist Header Rework

## TL;DR

> **Quick Summary**: Add guest families (guestCount), guest editing, formal/informal invitation text, animated gradient headers, remove wishlist badge, move RSVP bar to bottom.
>
> **Deliverables**:
> - Backend: `guestCount` field + PUT endpoint for guest editing
> - Frontend types + API: `guestCount` in all guest types + `updateGuest` method
> - Admin UI: Edit guest form in events side panel
> - Invite page: Formal/informal text logic across all components
> - Invite page: Animated gradient on headers (sweep animation)
> - Invite page: Remove wishlist badge chip, change heading
> - Invite page: Move RSVP bar from top to bottom (sticky footer)
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Backend → Types/API → Components

---

## Context

### Original Request
Добавить возможность редактирования гостей, семей (2-3 человека), формальное/неформальное обращение в зависимости от количества человек, убрать ярлык "вишлист", заменить "выбери подарок" на "вишлист" с gradient-text, анимированные градиенты у заголовков, кнопки RSVP (решение: оставить в InviteRsvpBar, перенести вниз).

### Interview Summary
**Key Decisions**:
- 📌 **Семья** = одна запись Guest с полем `guestCount` (> 1 = формальное обращение)
- 📌 **RSVP** — только в InviteRsvpBar, перенести с `top-0` на `bottom-0` (sticky footer)
- 📌 **Все русские тексты** меняются: герой, приветствие, RSVP-бар, подпись "(ты)" → "(вы)"
- 📌 **Анимация заголовков**: sweep (перелив градиента, CSS-only)
- 📌 **Чип "Вишлист"** — полностью удалить (иконку + стеклянный фон)
- 📌 **"Выбери подарок"** → **"Вишлист"** с gradient-text как у "Гости"
- 📌 **GuestCount без жёсткого лимита**, валидация ≥ 1

### Metis Review
**Identified Gaps** (addressed):
- Семья как модель данных — решено: одна запись с guestCount
- Конфликт RSVP — решено: только InviteRsvpBar, перенести вниз
- Объём формальных текстов — решено: все тексты на странице
- Тип анимации — решено: sweep (цветовой перелив)

---

## Work Objectives

### Core Objective
Добавить поддержку семей (guestCount), редактирование гостей, формальное/неформальное обращение в зависимости от количества человек, анимированные градиенты заголовков, и обновить UI приглашения (убрать чип вишлиста, изменить заголовок, перенести RSVP бар вниз).

### Concrete Deliverables
- `backend/.../Models/Entities.cs` — Guest entity + `GuestCount`
- `backend/.../DTOs/Dtos.cs` — `GuestCount` в DTOs, `UpdateGuestRequest`, `GuestCount` в CreateGuestRequest
- `backend/.../Controllers/Controllers.cs` — `PUT /api/events/{eventId}/guests/{guestId}`
- `backend/.../Services/AppServices.cs` — `UpdateGuestAsync` + миграция
- `backend/.../Data/AppDbContext.cs` — конфигурация `GuestCount`
- `frontend/src/types/index.ts` — `guestCount` во все типы гостей
- `frontend/src/lib/api.ts` — `guestsApi.updateGuest()`
- `frontend/src/lib/store.ts` — (возможно, без изменений)
- `frontend/src/app/(admin)/events/page.tsx` — кнопка "Редактировать" + форма редактирования
- `frontend/src/components/invite/InviteHero.tsx` — формальное/неформальное обращение
- `frontend/src/components/invite/InviteGuests.tsx` — "(ты)" → "(вы)" при guestCount > 1
- `frontend/src/components/invite/InviteWishlist.tsx` — удалить чип, изменить заголовок
- `frontend/src/components/invite/InviteRsvpBar.tsx` — перенести вниз, формальный текст
- `frontend/src/app/globals.css` — анимация sweep для gradient-text

### Definition of Done
- [ ] Guest с guestCount=3 отображает формальные тексты на странице приглашения
- [ ] Админ может редактировать имя/emoji/guestCount гостя
- [ ] Guest с guestCount=1 отображает неформальные тексты
- [ ] Заголовок "Вишлист" использует gradient-text (как "Гости"), без чипа сверху
- [ ] Заголовки "Гости" и "Вишлист" имеют анимацию sweep
- [ ] RSVP-бар приклеен к нижнему краю, текст меняется в зависимости от guestCount

### Must Have
- `GuestCount` int (default 1) на Guest entity + все DTO
- `PUT /api/events/{eventId}/guests/{guestId}` (JWT-protected, поля: name, emoji, guestCount)
- `guestsApi.updateGuest()` в api.ts
- Форма редактирования гостя в админке (events page, side panel)
- `InvitePage` передаёт `guestCount` через `GuestPublic` и `GuestSelf`
- Все текстовые строки проверяют `guestCount` для выбора formal/informal
- Чип "Вишлист" (Sparkles + glass pill) полностью удалён
- Заголовок "Выбери подарок" → "Вишлист" с `gradient-text`
- Анимация sweep на `gradient-text` заголовков (Гости, Вишлист)
- RSVP-бар: `fixed bottom-0` вместо `fixed top-0`

### Must NOT Have (Guardrails)
- ❌ НЕ создавать сущность Family или отдельную таблицу
- ❌ НЕ добавлять кнопки RSVP в секцию гостей (InviteGuests)
- ❌ НЕ изменять физику орбиты (react-spring) в InviteGuests
- ❌ НЕ изменять структуру InviteWishlist (карточки, модалку)
- ❌ НЕ добавлять поиск/фильтрацию/пагинацию гостей
- ❌ НЕ трогать парсер, карту, авторизацию
- ❌ НЕ анимировать gradient-text-gold (цены) — только заголовки

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None
- **Agent QA**: Bash (curl) + Playwright for UI verification

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.omo/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Backend**: Bash with curl — send requests, assert status + response fields
- **Frontend/UI**: Playwright — navigate, interact, assert DOM, screenshot
- **Frontend/CSS**: Playwright — compute CSS properties, verify animation

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — Start Immediately):
├── Task 1: Backend — Add GuestCount to Guest entity + DTOs [quick]
├── Task 2: Backend — Add UpdateGuest endpoint + service [quick]
├── Task 3: Backend — EF Core migration [quick]
├── Task 4: Frontend — Add guestCount to types + API [quick]

Wave 2 (Core UI — After Wave 1):
├── Task 5: Admin — Add edit guest form in events side panel [unspecified-high]
├── Task 6: Invite page — Formal/informal text logic in all components [visual-engineering]
├── Task 7: Invite page — Remove wishlist chip, change heading to gradient-text [visual-engineering]
├── Task 8: Invite page — Sweep animation on gradient-text headers [visual-engineering]
├── Task 9: Invite page — Move RSVP bar to bottom + formal text [visual-engineering]

Wave FINAL (After ALL — 4 parallel reviews):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA — execute ALL scenarios (playwright + curl)
└── Task F4: Scope fidelity check (deep)
→ Present results → Get explicit user okay

Critical Path: Task 1 → Task 3 → Task 5 → Task 6,7,8,9(all parallel) → F1-F4 → user okay
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 4 (Wave 2)
```

### Dependency Matrix
- **1-4**: none — starts immediately
- **5**: 1, 4 — admin guest edit needs backend + types
- **6**: 1, 4 — formal/informal logic needs guestCount
- **7**: none — pure UI change
- **8**: none — pure CSS change
- **9**: 6 — needs formal/informal text

### Agent Dispatch Summary
- **Wave 1** (4 tasks): `quick`
- **Wave 2** (5 tasks): `visual-engineering` (UI), `unspecified-high` (admin)
- **FINAL** (4 tasks): `oracle`, `unspecified-high`, `unspecified-high`, `deep`

---

## TODOs

- [x] 1. Backend — Add GuestCount to Guest entity + DTOs

  **What to do**:
  - Add `public int GuestCount { get; set; } = 1;` to `Guest` entity in `Entities.cs`
  - Add `guestCount` to `GuestSelfDto` record: add `int GuestCount` field
  - Add `guestCount` to `GuestPublicDto` record: add `int GuestCount` field
  - Add `guestCount` to `GuestDto` record: add `int GuestCount` field
  - Add `int GuestCount = 1` to `CreateGuestRequest` record
  - Add `guestCount` mapping in `GuestService` → `MapToDto` methods (GuestService, EventService, WishlistService)
  - In `AppDbContext.cs`: add `.Property(g => g.GuestCount).IsRequired().HasDefaultValue(1);` in Guest config
  - Add `[Range(1, int.MaxValue)]` annotation to `CreateGuestRequest.GuestCount`

  **Must NOT do**:
  - Do NOT create a Family entity
  - Do NOT change token generation logic

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Well-defined changes to 5 files, no complex logic
  - **Skills**: none needed

  **References**:
  - `Entities.cs:98-114` — Guest entity class (add `GuestCount` property)
  - `Dtos.cs:110-125` — GuestDto, GuestSelfDto, GuestPublicDto, CreateGuestRequest (add `GuestCount`)
  - `AppServices.cs:205-223` — GuestService.AddGuestAsync (add mapping)
  - `AppServices.cs:182-191` — EventService.MapToDto (add GuestCount to GuestDto)
  - `AppServices.cs:84-98` — WishlistService.MapToDto (add GuestCount to GuestPublicDto)
  - `AppDbContext.cs:71-84` — Guest entity configuration (add `GuestCount` property config)

  **Acceptance Criteria**:
  - [ ] Backend builds without errors (`dotnet build`)

  **QA Scenarios**:
  ```
  Scenario: Create guest with guestCount=3
    Tool: Bash (curl)
    Preconditions: Auth token + event ID exist
    Steps:
      1. curl -X POST /api/events/{eid}/guests -H "Authorization: Bearer $TOKEN" \
           -H "Content-Type: application/json" \
           -d '{"name":"Family","emoji":"👨‍👩‍👧","guestCount":3}'
    Expected Result: HTTP 201, response.data has "guestCount: 3"
    Evidence: .omo/evidence/task-1-guestcount-3.json

  Scenario: Create guest without guestCount (defaults to 1)
    Tool: Bash (curl)
    Steps:
      1. curl -X POST /api/events/{eid}/guests -H "Authorization: Bearer $TOKEN" \
           -H "Content-Type: application/json" \
           -d '{"name":"Solo","emoji":"🙂"}'
    Expected Result: HTTP 201, response.data has "guestCount: 1"
    Evidence: .omo/evidence/task-1-guestcount-default.json

  Scenario: Invite page returns guestCount
    Tool: Bash (curl)
    Steps:
      1. curl /api/guests/by-token/{token} for the family guest
    Expected Result: response.data.currentGuest.guestCount === 3
    Evidence: .omo/evidence/task-1-invite-guestcount.json
  ```

  **Commit**: YES
  - Message: `feat(backend): add GuestCount field to Guest entity and DTOs`
  - Files: `Entities.cs`, `Dtos.cs`, `AppServices.cs`, `AppDbContext.cs`, `Controllers.cs`
  - Pre-commit: `dotnet build`

- [x] 2. Backend — Add UpdateGuest endpoint + service

  **What to do**:
  - Add `UpdateGuestRequest` record to `Dtos.cs` with fields: `Name` (required, max 100), `Emoji` (optional), `GuestCount` (optional, range >= 1)
  - Add `UpdateGuestAsync(Guid userId, Guid eventId, Guid guestId, UpdateGuestRequest request)` to `IGuestService` interface
  - Implement in `GuestService`: validate event ownership, update editable fields (name, emoji, guestCount), save
  - Add endpoint `PUT /api/events/{eventId}/guests/{guestId}` in `EventsController` (JWT-protected via `[Authorize]`)
  - Throw `KeyNotFoundException` if guest/event not found, `UnauthorizedAccessException` if not owner
  - Return updated `GuestDto`

  **Must NOT do**:
  - Do NOT allow changing Token, RsvpStatus, RsvpNote, EventId, CreatedAt
  - Do NOT add BulkUpdate or batch operations

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard CRUD addition, follows existing patterns
  - **Skills**: none needed

  **References**:
  - `Dtos.cs:127-130` — Pattern: `RsvpRequest` record as reference
  - `AppServices.cs:225-235` — Pattern: `DeleteGuestAsync` for auth check pattern
  - `Controllers.cs:145-158` — Pattern: `AddGuest`/`RemoveGuest` endpoint placement
  - `AppServices.cs:277-290` — Pattern: `UpdateRsvpAsync` for update pattern

  **Acceptance Criteria**:
  - [ ] `dotnet build` succeeds
  - [ ] PUT with valid data returns updated guest
  - [ ] PUT without auth returns 401
  - [ ] PUT with wrong event owner returns 403/404
  - [ ] PUT with empty name returns 400

  **QA Scenarios**:
  ```
  Scenario: Update guest name and emoji
    Tool: Bash (curl)
    Preconditions: Auth token + event ID + guest ID exist
    Steps:
      1. curl -X PUT /api/events/{eid}/guests/{gid} -H "Authorization: Bearer $TOKEN" \
           -H "Content-Type: application/json" \
           -d '{"name":"Updated Name","emoji":"🎉","guestCount":2}'
    Expected Result: HTTP 200, response.data.name === "Updated Name", response.data.guestCount === 2
    Evidence: .omo/evidence/task-2-update-guest.json

  Scenario: Update without auth returns 401
    Tool: Bash (curl)
    Steps:
      1. curl -X PUT /api/events/{eid}/guests/{gid} -H "Content-Type: application/json" \
           -d '{"name":"Hacker"}'
    Expected Result: HTTP 401
    Evidence: .omo/evidence/task-2-unauth.json

  Scenario: Update with empty name returns 400
    Tool: Bash (curl)
    Steps:
      1. curl -X PUT /api/events/{eid}/guests/{gid} -H "Authorization: Bearer $TOKEN" \
           -H "Content-Type: application/json" \
           -d '{"name":""}'
    Expected Result: HTTP 400 with validation error
    Evidence: .omo/evidence/task-2-validation.json
  ```

  **Commit**: YES (groups with Task 1)
  - Message: `feat(backend): add PUT endpoint for guest updates`
  - Files: `Dtos.cs`, `AppServices.cs`, `Controllers.cs`

- [x] 3. Backend — EF Core migration

  **What to do**:
  - Run `dotnet ef migrations add AddGuestCount` to generate migration for GuestCount column
  - Verify migration adds `GuestCount` column with default value 1

  **Must NOT do**:
  - Do NOT edit migration manually unless there's a conflict

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard EF Core migration generation
  - **Skills**: none needed

  **References**:
  - `Migrations/` — Existing migrations as reference

  **Acceptance Criteria**:
  - [ ] Migration file generated with `AddColumn("GuestCount", ...)` with default value 1
  - [ ] `dotnet build` succeeds after migration

  **QA Scenarios**:
  ```
  Scenario: Migration creates GuestCount column
    Tool: Bash
    Steps:
      1. Check migration file for AddColumn operation
    Expected Result: Migration contains `AddColumn<int>("GuestCount", c => c.WithDefaultValue(1))`
    Evidence: .omo/evidence/task-3-migration-check.txt
  ```

  **Commit**: YES (groups with Task 1-2)
  - Files: `Migrations/*AddGuestCount*`

- [x] 4. Frontend — Add guestCount to types + API methods

  **What to do**:
  - Add `guestCount: number` to `GuestPublic` type in `types/index.ts`
  - Add `guestCount: number` to `GuestSelf` type in `types/index.ts`
  - Add `guestCount: number` to `Guest` type in `types/index.ts`
  - Add `guestCount?: number` to `CreateGuestForm` in `types/index.ts` (optional for backward compat)
  - Add `UpdateGuestForm` interface to `types/index.ts` with fields: `name`, `emoji`, `guestCount`
  - Add `guestsApi.updateGuest(eventId: string, guestId: string, form: UpdateGuestForm): Promise<Guest>` to `api.ts`
  - Update `guestsApi.addGuest` to pass `guestCount` from form if present

  **Must NOT do**:
  - Do NOT change existing function signatures (keep backward compat)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple type additions, follows existing patterns
  - **Skills**: none needed

  **References**:
  - `types/index.ts:28-33` — GuestPublic type (add guestCount)
  - `types/index.ts:92-99` — GuestSelf type (add guestCount)
  - `types/index.ts:158-161` — CreateGuestForm (add optional guestCount)
  - `api.ts:169-189` — guestsApi (add updateGuest method)

  **Acceptance Criteria**:
  - [ ] `npm run build` succeeds (or `npx tsc --noEmit`)
  - [ ] No TypeScript errors

  **QA Scenarios**:
  ```
  Scenario: TypeScript compilation passes
    Tool: Bash
    Steps:
      1. npx tsc --noEmit
    Expected Result: Exit code 0, no errors
    Evidence: .omo/evidence/task-4-tsc-pass.txt

  Scenario: CreateGuestForm without guestCount works
    Tool: Bash (check api.ts)
    Steps:
      1. Verify addGuest passes guestCount only if present
    Expected Result: Backward compatible — addGuest works without guestCount
    Evidence: .omo/evidence/task-4-backward-compat.txt
  ```

  **Commit**: YES
  - Message: `feat(frontend): add guestCount to types and API`
  - Files: `types/index.ts`, `lib/api.ts`
  - Pre-commit: `npx tsc --noEmit`

- [x] 5. Admin — Add edit guest form in events side panel

  **What to do**:
  - In `events/page.tsx`: Add edit button (Pencil icon) next to each guest in the guest management side panel (between RSVP status and Copy button)
  - Add `editingGuest` state: `Guest | null`
  - When edit button clicked: open inline edit mode (or small modal) with pre-filled fields: name, emoji, guestCount
  - Add emoji picker (same pattern as add guest) for editing
  - Add guestCount input (number, min=1)
  - On save: call `guestsApi.updateGuest(eventId, guestId, { name, emoji, guestCount })`
  - On success: invalidate `['events']` query, close edit mode, show success toast
  - On error: show error toast
  - Keep existing add guest form unchanged

  **Must NOT do**:
  - Do NOT add search, filter, pagination
  - Do NOT change guest deletion or copy-link behavior
  - Do NOT create a separate page for guest management
  - Do NOT allow editing token, RSVP status, or event ID

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Moderate complexity — form state, validation, API integration
  - **Skills**: none needed

  **References**:
  - `events/page.tsx:64-69` — Pattern: `addGuest` mutation (follow for `updateGuest`)
  - `events/page.tsx:303-407` — Guest management side panel (add edit UI here)
  - `events/page.tsx:330-344` — Emoji picker pattern (reuse for edit)
  - `events/page.tsx:345-347` — Name input pattern (reuse for edit)

  **Acceptance Criteria**:
  - [ ] Edit button visible for each guest in side panel
  - [ ] Clicking edit opens pre-filled form with current name, emoji, guestCount
  - [ ] Changing name and saving updates the guest list without page refresh
  - [ ] Changing emoji and saving updates the emoji
  - [ ] Changing guestCount and saving persists the change
  - [ ] Cancelling edit restores original values
  - [ ] Empty name validation shows error

  **QA Scenarios**:
  ```
  Scenario: Admin edits guest name and emoji
    Tool: Playwright
    Preconditions: Logged in, event with guest exists, guest side panel open
    Steps:
      1. Click edit (Pencil) icon on first guest
      2. Form shows current name, emoji, guestCount pre-filled
      3. Change name to "Edited Name" and emoji to "🎉"
      4. Click Save
    Expected Result: Toast "Сохранено", guest name updates to "Edited Name", emoji updates to "🎉"
    Evidence: .omo/evidence/task-5-edit-guest.png

  Scenario: Admin cancels edit
    Tool: Playwright
    Steps:
      1. Click edit icon, change name
      2. Click Cancel
    Expected Result: Edit form closes, original name restored in list
    Evidence: .omo/evidence/task-5-cancel-edit.png

  Scenario: Empty name validation
    Tool: Playwright
    Steps:
      1. Click edit icon, clear name field
      2. Click Save
    Expected Result: No API call, inline validation error shown
    Evidence: .omo/evidence/task-5-validation.png
  ```

  **Commit**: YES
  - Message: `feat(admin): add guest edit form in events side panel`
  - Files: `events/page.tsx`

- [x] 6. Invite page — Formal/informal text logic in all components

  **What to do**:
  - Create utility: `getFormality(guestCount: number)` that returns:
    - `isFormal: boolean`
    - `greeting: 'Здравствуйте' | 'Привет'`
    - `pronoun: 'вас' | 'тебя'`
    - `subject: 'Вы' | 'Ты'`
    - `rsvpQuestion: 'Вы придёте?' | 'Ты придёшь?'`
    - `youLabel: '(вы)' | '(ты)'`
  - **InviteHero.tsx**:
    - Pass `guestCount` prop (from currentGuest)
    - L208: `{hostName} приглашает {isFormal ? 'вас' : 'тебя'}`
    - L217: `{isFormal ? 'Здравствуйте' : 'Привет'}, {guestName}!`
  - **InviteGuests.tsx**:
    - Pass `currentGuestCount` prop
    - L313: `(ты)` → dynamic based on guestCount
  - **InviteRsvpBar.tsx**:
    - GuestSelf now has guestCount — use it
    - L61: `{isFormal ? 'Вы придёте?' : 'Ты придёшь?'}`
    - L28-29: Toast messages updated
  - **InviteClientPage.tsx**:
    - Pass `guestCount={page.currentGuest.guestCount}` to InviteHero
    - Pass `currentGuestCount={page.currentGuest.guestCount}` to InviteGuests
    - InviteRsvpBar already receives GuestSelf which includes guestCount

  **Must NOT do**:
  - Do NOT use i18n library
  - Do NOT change toast messages in other components

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI text changes across multiple components, Russian grammar
  - **Skills**: none needed

  **References**:
  - `InviteHero.tsx:208` — `"приглашает тебя"` (change to conditional)
  - `InviteHero.tsx:217` — `"Привет, {guestName}!"` (change to conditional)
  - `InviteGuests.tsx:313` — `"(ты)"` (change to conditional)
  - `InviteRsvpBar.tsx:61` — `"Ты придёшь?"` (change to conditional)
  - `InviteRsvpBar.tsx:28-29` — Toast messages (change to conditional)
  - `InviteClientPage.tsx:112-113, 123-125` — Pass guestCount props

  **Acceptance Criteria**:
  - [ ] Guest with guestCount=1: shows "Привет", "тебя", "ты", "(ты)", "Ты придёшь?"
  - [ ] Guest with guestCount=3: shows "Здравствуйте", "вас", "Вы", "(вы)", "Вы придёте?"
  - [ ] No hardcoded informal strings remain

  **QA Scenarios**:
  ```
  Scenario: Solo guest sees informal text
    Tool: Playwright
    Preconditions: Guest with guestCount=1
    Steps:
      1. Navigate to /invite/{token}
      2. Check hero text contains "приглашает тебя" and "Привет"
      3. Check RSVP bar says "Ты придёшь?"
    Expected Result: All text is informal (ты/тебя)
    Evidence: .omo/evidence/task-6-informal.png

  Scenario: Family guest sees formal text
    Tool: Playwright
    Preconditions: Guest with guestCount=3
    Steps:
      1. Navigate to /invite/{token}
      2. Check hero text contains "приглашает вас" and "Здравствуйте"
      3. Check RSVP bar says "Вы придёте?"
    Expected Result: All text is formal (вы/вас)
    Evidence: .omo/evidence/task-6-formal.png
  ```

  **Commit**: YES
  - Message: `feat(invite): add formal/informal text based on guestCount`
  - Files: `InviteHero.tsx`, `InviteGuests.tsx`, `InviteRsvpBar.tsx`, `InviteClientPage.tsx`

- [x] 7. Invite page — Remove wishlist badge, change heading to gradient-text

  **What to do**:
  - In `InviteWishlist.tsx`: Remove entire glass pill badge (lines 112-115):
    ```tsx
    {/* REMOVE:
    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass mb-4">
      <Sparkles size={14} className="text-brand-champagne" />
      <span className="text-brand-pearl/60 text-sm">Вишлист</span>
    </div>
    */}
    ```
  - Change h2 text from "Выбери подарок" to "Вишлист"
  - Add `gradient-text-sweep` class to h2 (consistent with "Гости" header)
  - Keep subtitle "Нажми на товар..." unchanged
  - Remove unused `Sparkles` import from `lucide-react`

  **Must NOT do**:
  - Do NOT change card layout or item listing
  - Do NOT change the modal

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Visual UI change, gradient styling alignment

  **References**:
  - `InviteWishlist.tsx:110-122` — Section header block (modify)
  - `InviteGuests.tsx:237-241` — Pattern: Guests header with gradient-text
  - `InviteWishlist.tsx:7` — Remove `Sparkles` from imports

  **Acceptance Criteria**:
  - [ ] No glass pill badge with "Вишлист" above heading
  - [ ] No `Sparkles` icon in header area
  - [ ] h2 text = "Вишлист" (not "Выбери подарок")
  - [ ] h2 uses gradient-text-sweep class
  - [ ] Subtitle still shows
  - [ ] No build errors

  **QA Scenarios**:
  ```
  Scenario: Wishlist section shows correct heading
    Tool: Playwright
    Preconditions: Event has wishlist items
    Steps:
      1. Navigate to /invite/{token}
      2. Scroll to wishlist section
      3. Check h2 text content is "Вишлист"
      4. Check no glass pill badge exists before h2
      5. Check gradient-text-sweep class on h2
    Expected Result: h2 text = "Вишлист", no badge, gradient class present
    Evidence: .omo/evidence/task-7-wishlist-heading.png
  ```

  **Commit**: YES (groups with Task 8)
  - Message: `feat(invite): replace wishlist badge with gradient heading`
  - Files: `InviteWishlist.tsx`

- [x] 8. Invite page — Sweep animation on gradient-text headers

  **What to do**:
  - Add CSS to `globals.css`:
    ```css
    @keyframes gradient-sweep {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    .gradient-text-sweep {
      background: linear-gradient(
        135deg,
        var(--brand-pearl) 0%,
        var(--brand-violet) 30%,
        var(--brand-champagne) 60%,
        var(--brand-violet) 80%,
        var(--brand-pearl) 100%
      );
      background-size: 300% 300%;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: gradient-sweep 6s ease infinite;
    }
    ```
  - Add `prefers-reduced-motion` fallback:
    ```css
    @media (prefers-reduced-motion: reduce) {
      .gradient-text-sweep {
        animation: none;
        background: linear-gradient(135deg, var(--brand-pearl) 0%, var(--brand-violet) 50%, var(--brand-champagne) 100%);
        background-size: 100% 100%;
      }
    }
    ```
  - Apply `gradient-text-sweep` to:
    - `InviteGuests.tsx` h2 — replace `gradient-text` with `gradient-text-sweep`
    - `InviteWishlist.tsx` h2 — use `gradient-text-sweep`
  - Keep `gradient-text` class untouched (used in hero title)
  - Keep `gradient-text-gold` untouched (prices)

  **Must NOT do**:
  - Do NOT animate `gradient-text-gold` (prices)
  - Do NOT apply to hero h1
  - CSS only — no JS animation

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: CSS animation, visual design

  **References**:
  - `globals.css:128-143` — gradient-text and gradient-text-gold (reference pattern)
  - `globals.css:247-253` — @media (prefers-reduced-motion) (extend)

  **Acceptance Criteria**:
  - [ ] "Гости" header has animated gradient sweep
  - [ ] "Вишлист" header has animated gradient sweep
  - [ ] Animation respects prefers-reduced-motion
  - [ ] Other gradient-text elements remain static
  - [ ] No build errors

  **QA Scenarios**:
  ```
  Scenario: Headers have gradient-sweep animation
    Tool: Playwright
    Steps:
      1. Navigate to /invite/{token}
      2. Check "Гости" h2 has class "gradient-text-sweep"
      3. Check "Вишлист" h2 has class "gradient-text-sweep"
      4. Get computed animation-name — not "none"
    Expected Result: Both headers have active gradient-sweep animation
    Evidence: .omo/evidence/task-8-sweep-animation.png

  Scenario: prefers-reduced-motion disables animation
    Tool: Playwright (emulate prefers-reduced-motion: reduce)
    Steps:
      1. Emulate prefers-reduced-motion: reduce
      2. Navigate to /invite/{token}
      3. Check computed animation-name on headers
    Expected Result: animation-name is "none"
    Evidence: .omo/evidence/task-8-reduced-motion.png
  ```

  **Commit**: YES (groups with Task 7)
  - Message: `feat(invite): add gradient-sweep animation to headers`
  - Files: `globals.css`, `InviteGuests.tsx`, `InviteWishlist.tsx`

- [ ] 9. Invite page — Move RSVP bar to bottom

  **What to do**:
  - In `InviteRsvpBar.tsx`:
    - Change `fixed top-0 inset-x-0 z-50 flex justify-center px-4 pt-3 pointer-events-none`
    - To: `fixed bottom-0 inset-x-0 z-50 flex justify-center px-4 pb-3 pointer-events-none`
    - Adjust container styling for bottom positioning

  **Must NOT do**:
  - Do NOT change RSVP API call flow
  - Do NOT change decline note modal

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Layout positioning change

  **References**:
  - `InviteRsvpBar.tsx:52-58` — Sticky bar container (change top-0 → bottom-0)
  - `InviteRsvpBar.tsx:56` — `fixed top-0 inset-x-0 z-50 flex justify-center px-4 pt-3`

  **Acceptance Criteria**:
  - [ ] RSVP bar is fixed at bottom of viewport
  - [ ] Bar visible when guest RSVP is Pending
  - [ ] Bar disappears after RSVP
  - [ ] Text uses formal/informal based on guestCount (from Task 6)

  **QA Scenarios**:
  ```
  Scenario: RSVP bar at bottom for pending guest
    Tool: Playwright
    Preconditions: Guest with rsvpStatus=Pending
    Steps:
      1. Navigate to /invite/{token}
      2. Check computed style: bottom=0, top!=0
      3. Verify bar is visible at bottom
    Expected Result: Bar fixed to bottom, visible
    Evidence: .omo/evidence/task-9-rsvp-bottom.png

  Scenario: RSVP bar hidden after responding
    Tool: Playwright
    Preconditions: Guest with rsvpStatus=Attending
    Steps:
      1. Navigate to /invite/{token}
    Expected Result: No RSVP bar visible
    Evidence: .omo/evidence/task-9-rsvp-hidden.png
  ```

  **Commit**: YES
  - Message: `feat(invite): move RSVP bar to bottom of page`
  - Files: `InviteRsvpBar.tsx`

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .omo/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `dotnet build` + `npx tsc --noEmit` + linter if available. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction.
  Output: `Build [PASS/FAIL] | Types [PASS/FAIL] | Lint [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (guestCount flows from backend → API → UI → text). Test edge cases: guestCount=0 validation, missing token auth. Save to `.omo/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Tasks 1-3**: `feat(backend): add GuestCount field to Guest entity and PUT endpoint` — groups 3 backend tasks
- **Task 4**: `feat(frontend): add guestCount to types and API`
- **Task 5**: `feat(admin): add guest edit form in events side panel`
- **Task 6**: `feat(invite): add formal/informal text based on guestCount`
- **Tasks 7-8**: `feat(invite): update wishlist heading and add gradient-sweep animation`
- **Task 9**: `feat(invite): move RSVP bar to bottom of page`

---

## Success Criteria

### Verification Commands
```bash
# Backend build
cd backend/WishlistApp.API && dotnet build

# Frontend type check
cd frontend && npx tsc --noEmit

# Create guest with guestCount
curl -X POST /api/events/{eid}/guests -H "Authorization: Bearer $TOKEN" -d '{"name":"Family","emoji":"👨‍👩‍👧","guestCount":3}'

# Update guest
curl -X PUT /api/events/{eid}/guests/{gid} -H "Authorization: Bearer $TOKEN" -d '{"name":"New Name","guestCount":2}'

# Invite page (check formal text)
curl /api/guests/by-token/{token}
```

### Final Checklist
- [ ] Guest entity has `GuestCount` (default 1)
- [ ] PUT endpoint exists for guest editing (JWT protected)
- [ ] Admin can edit guest name/emoji/guestCount
- [ ] GuestCount > 1 triggers formal text (вы/вас/Здравствуйте)
- [ ] GuestCount = 1 uses informal text (ты/тебя/Привет)
- [ ] "Вишлист" badge chip removed entirely
- [ ] "Выбери подарок" → "Вишлист" with gradient-text-sweep
- [ ] "Гости" header has gradient-sweep animation
- [ ] RSVP bar is at bottom of page
- [ ] prefers-reduced-motion respects animation
- [ ] Backend builds, frontend type-checks
