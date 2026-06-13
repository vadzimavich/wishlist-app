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
