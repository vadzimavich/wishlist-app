# Guest Families / Animations — Learnings

## 2026-06-13 — Task 4: Add guestCount to frontend types + API methods

- Added `guestCount: number` (required) to `GuestPublic`, `Guest`, and `GuestSelf` in `frontend/src/types/index.ts`
- Added optional `guestCount?: number` to `CreateGuestForm` for backward compatibility
- Added new `UpdateGuestForm` interface with `name: string`, `emoji?: string`, `guestCount?: number`
- Updated `guestsApi.addGuest` in `api.ts` to conditionally pass `guestCount` only when defined (`form.guestCount !== undefined`)
- Added `guestsApi.updateGuest(eventId, guestId, form): Promise<Guest>` that does `PUT /api/events/{eventId}/guests/{guestId}`
- `npx tsc --noEmit` passes with zero errors
- Key pattern: spread conditionals with `...(condition && { key: value })` for optional fields to avoid sending `undefined` in JSON

## 2026-06-13 — Backend Tasks 1-3: GuestCount + DTOs + Migration + PUT endpoint

- **Guest entity** (`Entities.cs:107`): Added `public int GuestCount { get; set; } = 1;` with default 1
- **DTOs** (`Dtos.cs`):
  - `GuestDto`, `GuestPublicDto`, `GuestSelfDto` all gained `int GuestCount` parameter
  - `CreateGuestRequest` gained `[Range(1, int.MaxValue)] int GuestCount = 1`
  - New `UpdateGuestRequest` record: Name (required, max 100), Emoji (optional), GuestCount (optional, Range >= 1)
- **AppDbContext** (`AppDbContext.cs:78`): `GuestCount` configured with `.IsRequired().HasDefaultValue(1)`
- **GuestService** (`AppServices.cs`):
  - `AddGuestAsync` now assigns `GuestCount = request.GuestCount`
  - New `UpdateGuestAsync()` — validates event owner, only updates name/emoji/guestCount, throws `KeyNotFoundException` for missing entities
- **EventService/WishlistService**: All `GuestDto`/`GuestPublicDto`/`GuestSelfDto` constructions updated to pass `GuestCount`
- **Controllers** (`Controllers.cs:152-157`): `PUT /api/events/{eventId}/guests/{guestId}` — JWT-protected via `[Authorize]` on EventsController
- **Migration**: `20260613160151_AddGuestCount.cs` — `ADD COLUMN "GuestCount" integer NOT NULL DEFAULT 1`
- **Build**: `dotnet build` passed 0 errors after clearing stale process lock
- **Pattern note**: `UpdateGuestRequest` follows the same optional-field pattern as `UpdateEventRequest` — optional Emoji uses `null` = don't change, optional `GuestCount` uses `null` = don't change, but Name is required (always updated)

## 2026-06-13 — Task 6: Add formal/informal text logic based on guestCount

- Created `getFormality(guestCount: number)` pattern across invite components using inline `guestCount > 1` ternary expressions
- **InviteHero.tsx**: Added `guestCount: number` prop; changed `приглашает тебя` → `приглашает {guestCount > 1 ? 'вас' : 'тебя'}`; changed `Привет, {guestName}!` → `{guestCount > 1 ? 'Здравствуйте' : 'Привет'}, {guestName}!`
- **InviteGuests.tsx**: Added `currentGuestCount: number` prop; changed `(ты)` → `{currentGuestCount > 1 ? '(вы)' : '(ты)'}`
- **InviteRsvpBar.tsx**: Added `isFormal = guest.guestCount > 1` constant; changed `Ты придёшь?` → conditional; updated both toast messages (success and decline) with formal/informal variants
- **InviteClientPage.tsx**: Passes `guestCount={page.currentGuest.guestCount}` to InviteHero and `currentGuestCount={page.currentGuest.guestCount}` to InviteGuests
- `npx tsc --noEmit` passes with zero errors
- Key pattern: simple `guestCount > 1` check is sufficient for formality logic (guestCount=1 → informal singular, guestCount>1 → formal plural)

## 2026-06-13 — Task 10: Fix formal/informal gaps in RSVP badge + decline modal

- **InviteHero.tsx**: Replaced `RSVP_BADGE` module-level constant with `getRsvpBadge(rsvpStatus, guestCount)` function that returns `Вы идёте! 🎉` / `Вы не придёте` when `guestCount > 1`, and `Ты идёшь! 🎉` / `Ты не придёшь` otherwise
  - The constant approach couldn't work because `guestCount` is a runtime prop, not available at module scope
  - Changed `const badge = RSVP_BADGE[rsvpStatus]` → `const badge = getRsvpBadge(rsvpStatus, guestCount)`
- **InviteRsvpBar.tsx**: Changed decline modal text from static `Жаль, что не придёшь 😔` to conditional `{isFormal ? 'Жаль, что не придёте 😔' : 'Жаль, что не придёшь 😔'}` (reuses existing `isFormal = guest.guestCount > 1` from Task 6)
- `npx tsc --noEmit` passes with zero errors

## 2026-06-13 — Tasks 7 & 8: Remove wishlist badge + heading change + sweep animation

### Changes
- **InviteWishlist.tsx**: Removed `Sparkles` import from lucide-react; removed glass pill badge (Sparkles icon + "Вишлист" text); changed h2 from "Выбери подарок" to "Вишлист"; added `gradient-text-sweep` class
- **InviteGuests.tsx**: Changed both h2 elements from `gradient-text` to `gradient-text-sweep` (empty state + main heading)
- **globals.css**: Added `@keyframes gradient-sweep` (background-position 0%→100%→0% over 6s); added `.gradient-text-sweep` class with 300% background-size; added reduced-motion override

### Preserved
- `gradient-text` class untouched (hero h1 still uses it)
- `gradient-text-gold` class untouched (prices still use it)
- Card layout, modal, item listing in InviteWishlist unchanged

### Notes
- `gradient-text-sweep` uses a richer 5-stop gradient vs the 3-stop `gradient-text`
- Pre-existing TS errors in `InviteClientPage.tsx` (missing `guestCount`/`currentGuestCount` props) — unrelated

## 2026-06-13 — Task 5: Add edit guest form in events admin side panel

### Changes
- Added `editingGuest` state: `{ guest: Guest; eventId: string } | null` to track which guest is being edited
- Added `editName`, `editEmoji`, `editGuestCount` local state fields for the edit form values
- Added `UpdateGuestForm` to the types import
- Added `updateGuest` useMutation calling `guestsApi.updateGuest(eventId, guestId, form)`
  - On success: invalidates `['events']` query, toast "Сохранено", closes edit mode
  - On error: toast error message
- Added **edit button (Pencil icon)** between RSVP status label and Copy button in each guest row
- When editing, the guest row is replaced with an **inline edit form** containing:
  - Emoji picker (same 12 emojis as the add guest form)
  - Name input with `required` attribute
  - Number input for guestCount with `min=1`
  - Save button (disabled when name empty or mutation pending)
  - Cancel button (restores original values, closes edit mode)
- Cancel sets `editingGuest` to null without any API call

### Key patterns
- Ternary inside `.map()` to conditionally render edit form vs normal row based on `editingGuest?.guest.id === guest.id`
- Edit form state initialized on button click via `setEditName(guest.name)` / `setEditEmoji(guest.emoji || '🙂')` / `setEditGuestCount(guest.guestCount || 1)`
- `Pencil` icon was already imported in the file (used for event editing), no additional import needed
- `npx tsc --noEmit` passes with zero errors

## 2026-06-13 — Task 9: Move RSVP bar from top to bottom of the page

### Changes
- **InviteRsvpBar.tsx**: Changed `fixed top-0` → `fixed bottom-0` to pin the RSVP bar to the bottom of the viewport
- **InviteRsvpBar.tsx**: Changed `pt-3` → `pb-3` for appropriate bottom padding
- **InviteRsvpBar.tsx**: Changed `initial={{ y: -80, ... }}` → `initial={{ y: 80, ... }}` so the bar slides up from below
- All other classes intact, no other changes made
- API call flow, decline note modal, text strings unchanged (formality text from Task 6 untouched)
- `npx tsc --noEmit` passes with zero errors
