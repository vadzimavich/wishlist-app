using Microsoft.EntityFrameworkCore;
using WishlistApp.API.Data;
using WishlistApp.API.DTOs;
using WishlistApp.API.Models;

namespace WishlistApp.API.Services;

// ─── WishlistService ──────────────────────────────────────────────────────────

public interface IWishlistService
{
    Task<List<WishlistItemDto>> GetItemsAsync(Guid userId);
    Task<WishlistItemDto> CreateItemAsync(Guid userId, CreateWishlistItemRequest request);
    Task<WishlistItemDto> UpdateItemAsync(Guid userId, Guid itemId, UpdateWishlistItemRequest request);
    Task DeleteItemAsync(Guid userId, Guid itemId);
}

public class WishlistService(AppDbContext db) : IWishlistService
{
    public async Task<List<WishlistItemDto>> GetItemsAsync(Guid userId)
    {
        var items = await db.WishlistItems
            .Where(wi => wi.UserId == userId)
            .Include(wi => wi.ActiveClaim)
                .ThenInclude(c => c!.Guest)
            .Include(wi => wi.ActiveClaim)
                .ThenInclude(c => c!.Participants)
                    .ThenInclude(p => p.Guest)
            .OrderByDescending(wi => wi.Priority)
            .ThenByDescending(wi => wi.CreatedAt)
            .ToListAsync();

        return items.Select(MapToDto).ToList();
    }

    public async Task<WishlistItemDto> CreateItemAsync(Guid userId, CreateWishlistItemRequest request)
    {
        var item = new WishlistItem
        {
            UserId = userId,
            Name = request.Name.Trim(),
            Price = request.Price,
            PhotoUrl = request.PhotoUrl,
            SourceUrl = request.SourceUrl,
            Description = request.Description?.Trim(),
            Priority = request.Priority
        };

        db.WishlistItems.Add(item);
        await db.SaveChangesAsync();

        return MapToDto(item);
    }

    public async Task<WishlistItemDto> UpdateItemAsync(Guid userId, Guid itemId, UpdateWishlistItemRequest request)
    {
        var item = await db.WishlistItems
            .Include(wi => wi.ActiveClaim)
            .FirstOrDefaultAsync(wi => wi.Id == itemId && wi.UserId == userId)
            ?? throw new KeyNotFoundException("Товар не найден.");

        if (request.Name is not null) item.Name = request.Name.Trim();
        if (request.Price.HasValue) item.Price = request.Price;
        if (request.PhotoUrl is not null) item.PhotoUrl = request.PhotoUrl;
        if (request.SourceUrl is not null) item.SourceUrl = request.SourceUrl;
        if (request.Description is not null) item.Description = request.Description.Trim();
        if (request.Priority.HasValue) item.Priority = request.Priority.Value;
        item.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return MapToDto(item);
    }

    public async Task DeleteItemAsync(Guid userId, Guid itemId)
    {
        var item = await db.WishlistItems
            .FirstOrDefaultAsync(wi => wi.Id == itemId && wi.UserId == userId)
            ?? throw new KeyNotFoundException("Товар не найден.");

        item.IsDeleted = true; // Soft delete
        item.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }

    public static WishlistItemDto MapToDto(WishlistItem item) => new(
        item.Id, item.Name, item.Price, item.PhotoUrl, item.SourceUrl,
        item.Description, item.Priority, item.Status,
        item.ActiveClaim is { IsActive: true } claim ? MapClaimToDto(claim) : null,
        item.CreatedAt
    );

    private static GiftClaimDto MapClaimToDto(GiftClaim claim) => new(
        claim.Id, claim.WishlistItemId,
        new GuestPublicDto(claim.Guest.Id, claim.Guest.Name, claim.Guest.RsvpStatus),
        claim.Type,
        claim.Participants.Select(p => new GuestPublicDto(p.Guest.Id, p.Guest.Name, p.Guest.RsvpStatus)).ToList(),
        claim.CreatedAt
    );
}

// ─── EventService ─────────────────────────────────────────────────────────────

public interface IEventService
{
    Task<List<EventDto>> GetEventsAsync(Guid userId);
    Task<EventDto> GetEventAsync(Guid userId, Guid eventId);
    Task<EventDto> CreateEventAsync(Guid userId, CreateEventRequest request);
    Task<EventDto> UpdateEventAsync(Guid userId, Guid eventId, UpdateEventRequest request);
    Task DeleteEventAsync(Guid userId, Guid eventId);
}

public class EventService(AppDbContext db) : IEventService
{
    public async Task<List<EventDto>> GetEventsAsync(Guid userId)
    {
        var events = await db.Events
            .Where(e => e.UserId == userId)
            .Include(e => e.Guests)
            .OrderByDescending(e => e.Date)
            .ToListAsync();

        return events.Select(MapToDto).ToList();
    }

    public async Task<EventDto> GetEventAsync(Guid userId, Guid eventId)
    {
        var ev = await db.Events
            .Include(e => e.Guests)
            .FirstOrDefaultAsync(e => e.Id == eventId && e.UserId == userId)
            ?? throw new KeyNotFoundException("Событие не найдено.");

        return MapToDto(ev);
    }

    public async Task<EventDto> CreateEventAsync(Guid userId, CreateEventRequest request)
    {
        var ev = new Event
        {
            UserId = userId,
            Title = request.Title.Trim(),
            Date = request.Date.ToUniversalTime(),
            Location = request.Location?.Trim(),
            Description = request.Description?.Trim(),
            CoverImageUrl = request.CoverImageUrl
        };

        db.Events.Add(ev);
        await db.SaveChangesAsync();
        return MapToDto(ev);
    }

    public async Task<EventDto> UpdateEventAsync(Guid userId, Guid eventId, UpdateEventRequest request)
    {
        var ev = await db.Events
            .Include(e => e.Guests)
            .FirstOrDefaultAsync(e => e.Id == eventId && e.UserId == userId)
            ?? throw new KeyNotFoundException("Событие не найдено.");

        if (request.Title is not null) ev.Title = request.Title.Trim();
        if (request.Date.HasValue) ev.Date = request.Date.Value.ToUniversalTime();
        if (request.Location is not null) ev.Location = request.Location.Trim();
        if (request.Description is not null) ev.Description = request.Description.Trim();
        if (request.CoverImageUrl is not null) ev.CoverImageUrl = request.CoverImageUrl;
        if (request.IsActive.HasValue) ev.IsActive = request.IsActive.Value;

        await db.SaveChangesAsync();
        return MapToDto(ev);
    }

    public async Task DeleteEventAsync(Guid userId, Guid eventId)
    {
        var ev = await db.Events.FirstOrDefaultAsync(e => e.Id == eventId && e.UserId == userId)
            ?? throw new KeyNotFoundException("Событие не найдено.");

        db.Events.Remove(ev);
        await db.SaveChangesAsync();
    }

    private static EventDto MapToDto(Event ev) => new(
        ev.Id, ev.Title, ev.Date, ev.Location, ev.Description, ev.CoverImageUrl,
        ev.IsActive,
        ev.Guests.Select(g => new GuestDto(
            g.Id, g.Name, g.Phone, g.Email, g.Token, g.RsvpStatus, g.RsvpNote,
            $"/invite/{g.Token}"
        )).ToList(),
        ev.CreatedAt
    );
}

// ─── GuestService ─────────────────────────────────────────────────────────────

public interface IGuestService
{
    Task<GuestDto> AddGuestAsync(Guid userId, Guid eventId, CreateGuestRequest request);
    Task DeleteGuestAsync(Guid userId, Guid eventId, Guid guestId);
    Task<InvitePageDto> GetInvitePageAsync(string token);
    Task<GuestDto> UpdateRsvpAsync(string token, RsvpRequest request);
}

public class GuestService(AppDbContext db, IConfiguration config) : IGuestService
{
    public async Task<GuestDto> AddGuestAsync(Guid userId, Guid eventId, CreateGuestRequest request)
    {
        var ev = await db.Events.FirstOrDefaultAsync(e => e.Id == eventId && e.UserId == userId)
            ?? throw new KeyNotFoundException("Событие не найдено.");

        var guest = new Guest
        {
            EventId = eventId,
            Name = request.Name.Trim(),
            Phone = request.Phone?.Trim(),
            Email = request.Email?.Trim().ToLower()
        };

        db.Guests.Add(guest);
        await db.SaveChangesAsync();

        var baseUrl = config["App:BaseUrl"] ?? "http://localhost:3000";
        return new GuestDto(guest.Id, guest.Name, guest.Phone, guest.Email,
            guest.Token, guest.RsvpStatus, guest.RsvpNote, $"{baseUrl}/invite/{guest.Token}");
    }

    public async Task DeleteGuestAsync(Guid userId, Guid eventId, Guid guestId)
    {
        var ev = await db.Events.FirstOrDefaultAsync(e => e.Id == eventId && e.UserId == userId)
            ?? throw new KeyNotFoundException("Событие не найдено.");

        var guest = await db.Guests.FirstOrDefaultAsync(g => g.Id == guestId && g.EventId == eventId)
            ?? throw new KeyNotFoundException("Гость не найден.");

        db.Guests.Remove(guest);
        await db.SaveChangesAsync();
    }

    public async Task<InvitePageDto> GetInvitePageAsync(string token)
    {
        var guest = await db.Guests
            .Include(g => g.Event)
                .ThenInclude(e => e.User)
            .Include(g => g.Event)
                .ThenInclude(e => e.Guests)
            .FirstOrDefaultAsync(g => g.Token == token)
            ?? throw new KeyNotFoundException("Приглашение не найдено.");

        var wishlistItems = await db.WishlistItems
            .Where(wi => wi.UserId == guest.Event.UserId)
            .Include(wi => wi.ActiveClaim)
                .ThenInclude(c => c!.Guest)
            .Include(wi => wi.ActiveClaim)
                .ThenInclude(c => c!.Participants)
                    .ThenInclude(p => p.Guest)
            .OrderByDescending(wi => wi.Priority)
            .ToListAsync();

        var baseUrl = config["App:BaseUrl"] ?? "http://localhost:3000";
        return new InvitePageDto(
            EventId: guest.EventId,
            EventTitle: guest.Event.Title,
            EventDate: guest.Event.Date,
            EventLocation: guest.Event.Location,
            EventDescription: guest.Event.Description,
            CoverImageUrl: guest.Event.CoverImageUrl,
            HostName: guest.Event.User.Name,
            HostAvatarUrl: guest.Event.User.AvatarUrl,
            Guests: guest.Event.Guests
                .Select(g => new GuestPublicDto(g.Id, g.Name, g.RsvpStatus))
                .ToList(),
            WishlistItems: wishlistItems.Select(WishlistService.MapToDto).ToList(),
            CurrentGuest: new GuestSelfDto(guest.Id, guest.Name, guest.Token, guest.RsvpStatus, guest.RsvpNote)
        );
    }

    public async Task<GuestDto> UpdateRsvpAsync(string token, RsvpRequest request)
    {
        var guest = await db.Guests
            .FirstOrDefaultAsync(g => g.Token == token)
            ?? throw new KeyNotFoundException("Гость не найден.");

        guest.RsvpStatus = request.Status;
        guest.RsvpNote = request.Note?.Trim();
        await db.SaveChangesAsync();

        var baseUrl = config["App:BaseUrl"] ?? "http://localhost:3000";
        return new GuestDto(guest.Id, guest.Name, guest.Phone, guest.Email,
            guest.Token, guest.RsvpStatus, guest.RsvpNote, $"{baseUrl}/invite/{guest.Token}");
    }
}

// ─── GiftService ──────────────────────────────────────────────────────────────

public interface IGiftService
{
    Task<WishlistItemDto> ClaimGiftAsync(ClaimGiftRequest request);
    Task<WishlistItemDto> JoinCollectiveAsync(Guid claimId, JoinCollectiveRequest request);
    Task<WishlistItemDto> CancelClaimAsync(Guid claimId, CancelClaimRequest request);
}

public class GiftService(AppDbContext db) : IGiftService
{
    public async Task<WishlistItemDto> ClaimGiftAsync(ClaimGiftRequest request)
    {
        var guest = await db.Guests
            .Include(g => g.Event)
            .FirstOrDefaultAsync(g => g.Token == request.GuestToken)
            ?? throw new KeyNotFoundException("Гость не найден.");

        var item = await db.WishlistItems
            .Include(wi => wi.ActiveClaim)
            .FirstOrDefaultAsync(wi => wi.Id == request.WishlistItemId)
            ?? throw new KeyNotFoundException("Товар не найден.");

        // Проверяем что гость принадлежит тому же событию, что и хозяин вишлиста
        if (item.UserId != guest.Event.UserId)
            throw new UnauthorizedAccessException("Нет доступа к этому вишлисту.");

        if (item.Status != WishlistItemStatus.Available)
            throw new InvalidOperationException("Этот подарок уже выбран другим гостем.");

        var claim = new GiftClaim
        {
            WishlistItemId = item.Id,
            GuestId = guest.Id,
            Type = request.ClaimType
        };

        item.Status = request.ClaimType == ClaimType.Solo
            ? WishlistItemStatus.Reserved
            : WishlistItemStatus.Collective;
        item.ActiveClaim = claim;
        item.UpdatedAt = DateTime.UtcNow;

        db.GiftClaims.Add(claim);

        // Если коллективный сбор — создатель автоматически участник
        if (request.ClaimType == ClaimType.Collective)
        {
            db.CollectiveParticipants.Add(new CollectiveParticipant
            {
                GiftClaimId = claim.Id,
                GuestId = guest.Id
            });
        }

        await db.SaveChangesAsync();

        // Перезагружаем с навигационными свойствами для DTO
        return await LoadAndMapItemAsync(item.Id);
    }

    public async Task<WishlistItemDto> JoinCollectiveAsync(Guid claimId, JoinCollectiveRequest request)
    {
        var guest = await db.Guests.FirstOrDefaultAsync(g => g.Token == request.GuestToken)
            ?? throw new KeyNotFoundException("Гость не найден.");

        var claim = await db.GiftClaims
            .Include(c => c.WishlistItem)
            .Include(c => c.Participants)
            .FirstOrDefaultAsync(c => c.Id == claimId && c.Type == ClaimType.Collective && c.IsActive)
            ?? throw new KeyNotFoundException("Сбор не найден или уже закрыт.");

        if (claim.Participants.Any(p => p.GuestId == guest.Id))
            throw new InvalidOperationException("Вы уже участвуете в этом сборе.");

        db.CollectiveParticipants.Add(new CollectiveParticipant
        {
            GiftClaimId = claimId,
            GuestId = guest.Id
        });

        await db.SaveChangesAsync();
        return await LoadAndMapItemAsync(claim.WishlistItemId);
    }

    public async Task<WishlistItemDto> CancelClaimAsync(Guid claimId, CancelClaimRequest request)
    {
        var guest = await db.Guests.FirstOrDefaultAsync(g => g.Token == request.GuestToken)
            ?? throw new KeyNotFoundException("Гость не найден.");

        var claim = await db.GiftClaims
            .Include(c => c.WishlistItem)
            .FirstOrDefaultAsync(c => c.Id == claimId && c.GuestId == guest.Id && c.IsActive)
            ?? throw new KeyNotFoundException("Выбор не найден или нет прав на отмену.");

        claim.IsActive = false;
        claim.WishlistItem.Status = WishlistItemStatus.Available;
        claim.WishlistItem.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return await LoadAndMapItemAsync(claim.WishlistItemId);
    }

    private async Task<WishlistItemDto> LoadAndMapItemAsync(Guid itemId)
    {
        var item = await db.WishlistItems
            .Include(wi => wi.ActiveClaim)
                .ThenInclude(c => c!.Guest)
            .Include(wi => wi.ActiveClaim)
                .ThenInclude(c => c!.Participants)
                    .ThenInclude(p => p.Guest)
            .FirstAsync(wi => wi.Id == itemId);

        return WishlistService.MapToDto(item);
    }
}
