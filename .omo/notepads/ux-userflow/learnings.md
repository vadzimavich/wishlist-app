# Learnings — ChatMessage Implementation

## Task 1: Add ChatMessage entity

### Findings
- Existing entity pattern: `public Guid Id { get; set; } = Guid.NewGuid();`, navigation with `= null!;`
- AppDbContext uses Fluent API with `mb.Entity<T>(e => ...)` pattern, grouped with section comments
- DTOs are positional records in `DTOs/Dtos.cs`, namespaced `WishlistApp.API.DTOs`
- EF Core 10.0.9 is used with Npgsql PostgreSQL provider
- Index with descending: `e.HasIndex(x => new { x.EventId, x.CreatedAt }).IsDescending(false, true)` — first ASC, second DESC
- When using `.WithMany()` without arguments (no nav collection on parent), EF Core handles the relationship correctly
- `dotnet ef migrations add <name>` in the project directory generates migration files in `Migrations/`

### Files modified
1. `backend/WishlistApp.API/Models/Entities.cs` — Added `ChatMessage` class (8 fields + 3 navigation props)
2. `backend/WishlistApp.API/DTOs/Dtos.cs` — Added `ChatMessageDto` record (9 positional params)
3. `backend/WishlistApp.API/Data/AppDbContext.cs` — Added `DbSet<ChatMessage>` + Fluent config with indexes and FKs
4. `backend/WishlistApp.API/Migrations/20260614204415_AddChatMessage.cs` — Auto-generated migration

### Migration columns verified
- Id (Guid, PK), EventId (Guid, FK), ClaimId (Guid?, FK), GuestId (Guid, FK)
- Text (string(1000), required), EditedAt (DateTime?), IsDeleted (bool), CreatedAt (DateTime)
- Index on (EventId, CreatedAt DESC)

## 2026-06-14 — Task 2: ActivityEvent Entity

- Added ActivityEvent entity to Models/Entities.cs with fields: Id, EventId, GuestId (nullable), ActionType (string), RelatedItemId (nullable), Metadata (nullable), CreatedAt
- Navigation: Event (required), Guest (nullable)
- Added ActivityEventDto record to DTOs/Dtos.cs
- Added `DbSet<ActivityEvent> ActivityEvents` + EF config in AppDbContext.cs:
  - Composite index on (EventId, CreatedAt DESC)
  - ActionType max 50 chars
  - Event FK: Cascade delete
  - Guest FK: SetNull delete
- The ActivityEvents table was already created in the AddChatMessage migration
- AddActivityEvent migration is empty (no diff from existing snapshot)
- Evidence: .omo/evidence/task-2-migration.txt

## 2026-06-14 — Task 3: Guest Contact Fields

### Findings
- Guest entity in Entities.cs: added `Telegram` (string?, MaxLength(100)), `Phone` (string?, MaxLength(30)), `IsContactShared` (bool, default false)
- Needed to add `using System.ComponentModel.DataAnnotations;` to Entities.cs for `[MaxLength]` attribute
- Migrations are sensitive to order: if there are other pending migrations before yours, `dotnet ef migrations remove` removes the LAST one first
- Recreating a migration after adding `[MaxLength]` attributes while a previous version existed generates an ALTER COLUMN migration (not CREATE) — the column types change from `text` to `character varying(N)`
- DTO construction sites span 2 files: Controllers.cs and AppServices.cs — all must be updated when adding DTO fields

### Files modified
1. `backend/WishlistApp.API/Models/Entities.cs` — Added 3 fields to Guest entity + `using System.ComponentModel.DataAnnotations`
2. `backend/WishlistApp.API/DTOs/Dtos.cs` — Updated GuestPublicDto, GuestSelfDto, GuestDto with new fields
3. `backend/WishlistApp.API/Controllers/Controllers.cs` — Fixed 1 GuestPublicDto construction
4. `backend/WishlistApp.API/Services/AppServices.cs` — Fixed 6 construction sites (2 GuestPublicDto, 3 GuestDto, 1 GuestSelfDto)
5. `backend/WishlistApp.API/Migrations/20260614204650_AddGuestContactFields.cs` — Auto-generated migration

### Migration columns verified
- Telegram (character varying(100), nullable)
- Phone (character varying(30), nullable)
- IsContactShared (boolean, not null, default false)

### Evidence
- Build evidence: .omo/evidence/task-3-build.txt

## 2026-06-14 — Task 4: AddParticipantIsActive + Cancel flow

### Changes
1. **Entities.cs**: Added `IsActive` (bool, default true) and `LeftAt` (DateTime?) to `CollectiveParticipant`
2. **AppServices.cs - MapClaimToDto**: Added `.Where(p => p.IsActive)` filter → inactive participants excluded from API responses
3. **AppServices.cs - CancelClaimAsync**: Split into two paths:
   - **Claimer (initiator)**: Full cancel → `claim.IsActive = false`, item → `Available`
   - **Participant**: Soft leave → `IsActive = false`, `LeftAt = UtcNow`. If no active participants remain → auto-close claim + free item
4. **DB migrations applied**: `AddChatMessage` + `AddGuestContactFields` (IsActive/LeftAt columns already existed in those migrations)
5. **QA evidence**: `.omo/evidence/task-4-leave.txt`

### Key Learnings
- The IsActive/LeftAt columns were already in `AddGuestContactFields` migration but C# entity wasn't updated — DB schema had drifted from model
- MapToDto filter is critical: without `.Where(p => p.IsActive)`, inactive participants leak into API responses
- Claimer cancel path doesn't touch participant records (they remain IsActive=true) — claim is fully deactivated instead
- The "last active participant" auto-close handles edge case where non-claimer participant is last to leave
