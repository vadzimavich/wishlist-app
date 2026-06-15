# Guest UX Improvements Plan

## Status: Planning Complete — Awaiting Implementation Approval

## Completed (committed)

- **A1**: InviteRsvpBar — чат/контакт кнопки удалены, эмодзи убран, подсветка до ответа убрана
- **A2**: InviteClientPage — отдельная кнопка чата (MessageCircle) справа от RSVP бара
- **A3**: InviteChat — кнопка "Поделиться контактом" (Phone) в хедере + ContactSharingModal
- **A4**: ContactSharingModal — "(необязательно)" добавлено к полям
- **A7**: Центрирование секций проверено — исправлено (InviteMap location paragraph)

## Pending — Emoji Picker (A5 + A6)

### Backend (4 files)
1. `DTOs/Dtos.cs` — `UpdateEmojiRequest` record
2. `Services/AppServices.cs` — `UpdateEmojiAsync(token, emoji)` 
3. `Controllers/Controllers.cs` — `PUT {token}/emoji`
4. `Hubs/WishlistHub.cs` — `NotifyGuestEmojiUpdatedAsync`

### Frontend (4 files)
5. `lib/api.ts` — `updateEmoji()` в `guestsApi`
6. `hooks/useWishlistRealtime.ts` — `onGuestEmojiUpdated` option
7. `InviteGuests.tsx` — EmojiPicker popover (24 presets)
8. `InviteClientPage.tsx` — callback + real-time handler

## Next Step
Awaiting user confirmation to implement emoji picker.
