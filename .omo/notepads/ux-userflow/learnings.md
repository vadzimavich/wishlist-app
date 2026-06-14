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

## 2026-06-14 — Task 5/6: ActivityService + ActivityController

### Findings
- Created `Services/ActivityService.cs` with IActivityService interface + ActivityService class
  - RecordActivityAsync: saves ActivityEvent to DB, returns ActivityEventDto
  - GetActivityAsync: paginated query ordered by CreatedAt DESC, returns ActivityFeedDto (Items + TotalCount)
  - GetActivitySummaryAsync: groups by ActionType, returns List<ActivitySummaryItemDto>
- Created ActivityController at route `api/events/{eventId}/activity` with:
  - GET (skip, take) → paginated feed
  - GET summary → grouped counts
- Integrated into GuestService: RecordActivity after RSVP Attending
- Integrated into GiftService: RecordActivity after Claim (Solo→GiftClaimed, Collective→CollectiveJoined), JoinCollective, CancelClaim (claimer/last participant)
- Registered as scoped in DI

### Evidence
- task-6-activity-rsvp.txt — RSVP triggers RSVPAttending activity event
- task-6-activity-list.txt — Activity persists across requests, summary works

## 2026-06-14 — Task 7: Guest Contact Sharing API

### Changes
1. **DTOs/Dtos.cs** — Added 3 records:
   - `UpdateContactRequest` (`Telegram?`, `Phone?` with MaxLength validation)
   - `ShareContactRequest` (`IsShared` bool)
   - `SharedContactDto` (`GuestId`, `Name`, `Emoji`, `Telegram?`, `Phone?`)
2. **Services/AppServices.cs** — Added 3 methods to `IGuestService` + `GuestService`:
   - `UpdateContactAsync` — finds guest by token, updates Telegram/Phone, returns `GuestSelfDto`
   - `ToggleContactShareAsync` — finds guest by token, toggles IsContactShared, returns `GuestSelfDto`
   - `GetSharedContactsAsync` — finds guest by token, checks Attending status, queries event guests with `IsContactShared=true AND Attending`, excludes self
3. **Controllers/Controllers.cs** — Added 3 endpoints to `GuestsController`:
   - `POST /api/guests/{token}/contact` (AllowAnonymous)
   - `PUT /api/guests/{token}/contact/share` (AllowAnonymous)
   - `GET /api/guests/{token}/contacts` (AllowAnonymous)

### Files Modified
1. `backend/WishlistApp.API/DTOs/Dtos.cs` — Added 3 new records
2. `backend/WishlistApp.API/Services/AppServices.cs` — Added 3 methods to interface + implementation
3. `backend/WishlistApp.API/Controllers/Controllers.cs` — Added 3 endpoints

### Key Learnings
- Guest already had Telegram, Phone, IsContactShared fields from a previous migration — no new migration needed
- When a guest has `RsvpStatus != Attending`, they should not see any shared contacts (privacy requirement)
- The requesting guest must be excluded from their own contact list results
- `IsContactShared=true` is required on the contact-owner's record, not the requester's
- `[AllowAnonymous]` is correct for guest-token-authenticated endpoints — JWT auth is not needed since the token itself identifies the guest

### Evidence
- Contact share scenario: `.omo/evidence/task-7-contact-share.txt`
- Contact see scenario: `.omo/evidence/task-7-contact-see.txt`

### Oracle Review Findings (2026-06-14)
- **Privacy leak fixed**: `GuestPublicDto` in `GetInvitePageAsync`, `MapClaimToDto`, and RSVP notification now gates Telegram/Phone by `IsContactShared` — pre-existing bug where contacts leaked unconditionally through the invite page and gift claim DTOs
- **No SignalR for contact changes**: Noted as inconsistency (every other mutation broadcasts), but not in scope for this task
- **`[Phone]` validation added**: To `UpdateContactRequest.Phone`
- **Clearing fields**: Sending `""` clears a field; sending `null` = no-op (documented behavior, not changed)
- **QA expanded**: 404 on invalid token, toggle OFF visibility, partial-update semantics — all verified

## 2026-06-14 — Task 8: ActivityUpdated SignalR + Activity Integration

### Changes

1. **Hubs/WishlistHub.cs** — Added to `IWishlistHubService`:
   - `Task NotifyActivityUpdatedAsync(Guid eventId, ActivityEventDto activity)`
   - Implementation sends `"ActivityUpdated"` to group `event-{eventId}`

2. **Services/ActivityService.cs** — Already existed with `RecordActivityAsync(eventId, guestId, actionType, relatedItemId?, metadata?)`

3. **Services/AppServices.cs** — Updated dependency injection for guest/gift operations:
   - `GuestService`: Added `IWishlistHubService` to constructor; after `RSVPAttending` activity recording → broadcasts `ActivityUpdated`
   - `GiftService`: Added `IWishlistHubService` to constructor; after each operation broadcasts `ActivityUpdated`:
     - `ClaimGiftAsync` → `"GiftClaimed"` or `"CollectiveJoined"` + broadcast
     - `JoinCollectiveAsync` → `"CollectiveJoined"` + broadcast
     - `CancelClaimAsync` (2 paths: claimer cancel + last-participant auto-close) → `"ClaimCancelled"` + broadcast

4. **Program.cs** — Registered `services.AddScoped<IActivityService, ActivityService>()`

### Files Modified
1. `backend/WishlistApp.API/Hubs/WishlistHub.cs` — Added NotifyActivityUpdatedAsync + document comment
2. `backend/WishlistApp.API/Services/AppServices.cs` — Added IWishlistHubService to GuestService + GiftService; added broadcasts
3. `backend/WishlistApp.API/Program.cs` — Registered ActivityService

### Key Learnings
- `IWishlistHubService` is singleton (registered `AddSingleton`), injected into scoped services — safe because singleton → scoped is fine (captive dependency is only a problem the other way)
- `IActivityService` already existed with `RecordActivityAsync` and was already injected into both `GuestService` and `GiftService` (from a previous task) — only `IWishlistHubService` injection + broadcast calls were missing
- The `RecordActivityAsync` signature takes `(Guid eventId, Guid? guestId, string actionType, Guid? relatedItemId, string? metadata)` — note the parameter order
- In `CancelClaimAsync`, when a participant leaves but the claim remains open (other active participants still exist), no activity is recorded — only full claim cancellation triggers `"ClaimCancelled"`
- Build passes with 0 errors (only pre-existing NuGet warnings about unused packages and AutoMapper vulnerability)

## 2026-06-14 — Task 9: ChatHub, ChatService, ChatController

### New Files Created
1. **Hubs/ChatHub.cs** — SignalR hub at `/hubs/chat` with:
   - `OnConnectedAsync`: Reads `eventId` + `guestToken` (and optional `claimId`) from query string
   - Guest auth: looks up Guest by token via `_db.Guests.FirstOrDefaultAsync(g => g.Token == guestToken)`, verifies `guest.EventId` matches requested `eventId`; if invalid → `Context.Abort()`
   - Stores `GuestId` in `Context.Items["GuestId"]`, `EventId` in `Context.Items["EventId"]`
   - If no guestToken provided, requires JWT `access_token` for host connection (checks `ClaimTypes.NameIdentifier`)
   - Joins group `event-chat-{eventId}` and optionally `collective-chat-{claimId}`
   - Client methods: `SendEventMessage(text)`, `SendCollectiveMessage(claimId, text)`, `EditMessage(messageId, newText)`, `DeleteMessage(messageId)`, `HostDeleteMessage(messageId)`
   - Server events: `MessageReceived(message)`, `MessageEdited(messageId, newText, editedAt)`, `MessageDeleted(messageId)`
   - Uses `IHubContext<ChatHub>` in controller for REST → SignalR broadcasting

2. **Services/ChatService.cs** — Interface `IChatService` + implementation with:
   - `SaveMessage(eventId, guestId, text, claimId?)` — creates ChatMessage, loads Guest navigation for DTO
   - `EditMessage(messageId, guestId, newText)` — verifies `message.GuestId == guestId`, updates Text + EditedAt
   - `DeleteMessage(messageId, guestId)` — soft-delete (IsDeleted = true), verifies ownership
   - `HostDeleteMessage(messageId, eventId, hostUserId)` — verifies `Event.UserId == hostUserId`, then soft-delete
   - `GetMessages(eventId, skip, take)` — paginated, ordered by `CreatedAt ASC` (oldest first), filters `IsDeleted = false`, includes Guest for GuestName/GuestEmoji
   - `GetMessageCount(eventId)` — count of non-deleted messages

3. **Controllers/ChatController.cs** — REST at `api/events/{eventId}/messages`:
   - `GET` (AllowAnonymous) — paginated messages, no auth required (public event chat)
   - `PUT {messageId}` (AllowAnonymous) — edit message, requires `guestToken` query param
   - `DELETE {messageId}` (AllowAnonymous) — delete own message, requires `guestToken`
   - `DELETE {messageId}/host` ([Authorize]) — host deletes any message, JWT required
   - All mutations broadcast via `IHubContext<ChatHub>` to `event-chat-{eventId}` group
   - Includes `EditMessageBody(string Text)` record in same file

### Existing Files Modified
1. **Program.cs** — Added `services.AddScoped<IChatService, ChatService>()` + `app.MapHub<ChatHub>("/hubs/chat")`

### Key Design Decisions
- **Guest token in query string**: ChatHub reads `guestToken` from query string, NOT from JWT. This allows guests (who don't have accounts) to use SignalR. Hosts connect with JWT `access_token` query parameter (reuses existing Program.cs `OnMessageReceived` handler).
- **No `[Authorize]` on hub**: The hub itself is not decorated with `[Authorize]`. Auth is done manually in `OnConnectedAsync` by checking guestToken or JWT claims.
- **Soft-delete model**: Both guest delete and host delete set `IsDeleted = true` instead of hard-deleting rows. `GetMessages` always filters `!IsDeleted`.
- **ChatMessageDto.GuestId is nullable (Guid?)**: Following existing DTO pattern even though entity has non-nullable `GuestId`.
- **REST → SignalR bridge**: When chat operations happen via REST (edit/delete), the controller broadcasts `MessageEdited`/`MessageDeleted` to the SignalR group so connected clients get real-time updates.
- **`Include(m.Guest)` required**: ChatMessageDto requires GuestName and GuestEmoji from the Guest navigation property. All service methods that return DTOs use `.Include(m => m.Guest)`.
- **Controller does direct AppDbContext lookup**: For guest token → guest ID resolution in PUT/DELETE, the controller uses `_db.Guests.FirstOrDefaultAsync(g => g.Token == guestToken)` directly rather than going through a service method.

### Evidence
- task-5-chat-send.txt — SignalR message send + REST verification
- task-5-chat-edit.txt — REST PUT with editedAt verification
- task-5-chat-delete.txt — REST DELETE + empty list verification
- task-5-chat-host-delete.txt — Host DELETE endpoint + 401 without auth test

## 2026-06-15 — Task 11: useContactStore + Contact API Integration

### Changes
1. **frontend/src/types/index.ts** — Extended `GuestSelf` with `telegram?`, `phone?`, `isContactShared` fields; added `SharedContact` interface
2. **frontend/src/lib/api.ts** — Added 3 methods to `guestsApi`:
   - `updateContact(token, telegram?, phone?)` → `POST /api/guests/{token}/contact`
   - `toggleContactShare(token, isShared)` → `PUT /api/guests/{token}/contact/share`
   - `getSharedContacts(token)` → `GET /api/guests/{token}/contacts`
3. **frontend/src/lib/stores/contactStore.ts** — New Zustand store `useContactStore` with:
   - State: `myTelegram`, `myPhone`, `isShared`, `sharedContacts`, `loading`
   - Actions: `updateMyContact`, `toggleShare`, `fetchSharedContacts`, `setMyTelegram`, `setMyPhone`
   - Lazy loading: no auto-fetch on mount (only on explicit `fetchSharedContacts` call)

### Key Design Decisions
- **Separate file**: Created `lib/stores/contactStore.ts` rather than adding to existing `lib/store.ts` — follows task spec and keeps contact logic independent
- **Lazy fetch**: `fetchSharedContacts` is only called when consumer explicitly invokes it (e.g., when opening contact modal) — no automatic fetching on store creation
- **No persist middleware**: Contact state is ephemeral (not persisted to localStorage) — differs from auth store which uses `persist`
- **GuestSelf type extension**: Added `telegram?`, `phone?`, `isContactShared` as optional/boolean fields — backward compatible with existing usage
- **axios direct calls**: Contact API uses `axios.post/put/get` directly (not the JWT-authenticated `api` instance) — follows the same pattern as existing guest token endpoints (`getInvitePage`, `updateRsvp`)

### Files Modified
1. `frontend/src/types/index.ts` — GuestSelf extended, SharedContact added
2. `frontend/src/lib/api.ts` — 3 new methods in guestsApi

### Files Created
1. `frontend/src/lib/stores/contactStore.ts` — Contact Zustand store

### Evidence
- task-11-contact-store.txt — Build success + scenario verification

## 2026-06-15 — Task 9 Frontend: useChatRealtime hook + chatStore

### New Files Created
1. **hooks/useChatRealtime.ts** — SignalR hook for `/hubs/chat` with:
   - Connection URL: `${API_URL}/hubs/chat?eventId=${eventId}&guestToken=${guestToken}` + optional `&claimId=${claimId}`
   - Auto-reconnect: `withAutomaticReconnect([0, 2000, 5000, 10000])`
   - Hub methods: `sendEventMessage(text)`, `sendCollectiveMessage(claimId, text)`, `editMessage(messageId, newText)`, `deleteMessage(messageId)`
   - Event handlers: `MessageReceived` → addMessage, `MessageEdited` → editMessage, `MessageDeleted` → removeMessage
   - Returns: `{ sendEventMessage, sendCollectiveMessage, editMessage, deleteMessage, messages, loadMore, hasMore, loading }`
   - Auto-loads messages on mount via `loadMessages(eventId, claimId, 0, 50)`
   - Cleanup on unmount: `connection.stop()`

2. **lib/stores/chatStore.ts** — Zustand store with:
   - `messages: Record<string, ChatMessage[]>` (keyed by claimId or `__event__`)
   - `loading: boolean`, `hasMore: Record<string, boolean>`
   - Methods: `addMessage`, `editMessage`, `removeMessage`, `setMessages`, `setLoading`, `setHasMore`, `loadMessages`
   - `loadMessages` calls `GET /api/events/{eventId}/messages?claimId=X&skip=0&take=50` via axios
   - First-page (skip=0) replaces messages; subsequent pages append
   - Duplicate prevention in `addMessage`

### Existing Files Modified
3. **types/index.ts** — Added `ChatMessage` interface: id, eventId, claimId?, guestId, guestName, guestEmoji, text, editedAt?, isDeleted, createdAt

### Key Decisions
- **Separate store file**: Created `lib/stores/chatStore.ts` (new `stores/` subdirectory) to keep chat state isolated from the existing combined `lib/store.ts`
- **Key scheme**: `'__event__'` for event-wide chat, claimId string for collective chat — matches the backend's group naming (`event-chat-{eventId}`, `collective-chat-{claimId}`)
- **Soft-remove**: `removeMessage` filters the message out of the array entirely (consistent with backend's soft-delete + filtered GET)
- **API response flexibility**: `loadMessages` handles both `{ data: [...] }` envelope and raw array formats
- **TypeScript**: zero errors on `tsc --noEmit`

## 2026-06-15 — Task 10 Frontend: useActivityFeed hook + activityStore

### New Files Created
1. **hooks/useActivityFeed.ts** — Hook for fetching activity + listening to SignalR `ActivityUpdated`:
   - Takes `eventId: string | undefined`
   - On mount: calls `GET /api/events/{eventId}/activity?skip=0&take=20` via `guestsApi.getActivity()`
   - Stores results in `activityStore`
   - `loadMore()`: fetches next page (skip = current length, take = 20), appends to store
   - SignalR connection: creates separate WishlistHub connection at `/hubs/wishlist?eventId=${eventId}` (reuses existing hub, not a new hub)
   - Listens to `ActivityUpdated` event → calls `addActivity()` on store (prepends with duplicate prevention)
   - Returns: `{ activities, loadMore, hasMore, loading }`

2. **lib/stores/activityStore.ts** — Zustand store with:
   - `activities: ActivityEvent[]`, `loading: boolean`, `hasMore: boolean`
   - `addActivity(event)`: prepends with duplicate check by id
   - `setActivities(events, hasMore?)`: replaces list
   - `setLoading(loading)`: loading state toggle

### Existing Files Modified
3. **types/index.ts** — Added `ActivityEvent` interface + `ActivityActionType` union type
4. **lib/api.ts** — Added `getActivity(eventId, skip?, take?)` to `guestsApi`

### Key Decisions
- **Separate SignalR connection**: Rather than trying to access the internal `connectionRef` from `useWishlistRealtime`, created a new connection to the same `/hubs/wishlist` endpoint. This keeps the activity feed self-contained and doesn't require modifying existing hooks.
- **`addActivity` dedup**: The store checks `id` before prepending to avoid duplicates from SignalR events arriving before the initial load completes.
- **`useActivityStore.getState().activities` in loadMore**: Used to get the latest activities from outside the hook's closure, ensuring the merge is correct even if SignalR events arrived between renders.
- **Same page size (20) and connection config** as `useWishlistRealtime` for consistency.
