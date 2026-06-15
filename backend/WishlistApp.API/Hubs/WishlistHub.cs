using Microsoft.AspNetCore.SignalR;
using WishlistApp.API.DTOs;

namespace WishlistApp.API.Hubs;

/// <summary>
/// SignalR Hub для real-time обновлений вишлиста.
/// Гости подключаются к группе события по его ID.
/// Сервер рассылает события всем в группе при изменениях.
/// </summary>
public class WishlistHub : Hub
{
    /// <summary>
    /// Вызывается при подключении клиента.
    /// Клиент должен передать eventId в query string.
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        var eventId = Context.GetHttpContext()?.Request.Query["eventId"].ToString();
        if (!string.IsNullOrEmpty(eventId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"event-{eventId}");
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var eventId = Context.GetHttpContext()?.Request.Query["eventId"].ToString();
        if (!string.IsNullOrEmpty(eventId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"event-{eventId}");
        }

        await base.OnDisconnectedAsync(exception);
    }

    // ── Клиентские методы (вызываются с сервера) ──────────────────────────────
    // Имена методов должны точно совпадать с тем, что слушает фронтенд:
    //
    // connection.on('GiftClaimed', (item: WishlistItemDto) => {...})
    // connection.on('CollectiveJoined', (item: WishlistItemDto) => {...})
    // connection.on('ClaimCancelled', (item: WishlistItemDto) => {...})
    // connection.on('GuestRsvpUpdated', (guest: GuestPublicDto) => {...})
    // connection.on('GuestContactUpdated', (contact: SharedContactDto) => {...})
    // connection.on('GuestEmojiUpdated', (guest: GuestPublicDto) => {...})
    // connection.on('WishlistItemUpdated', (item: WishlistItemDto) => {...})
    // connection.on('ActivityUpdated', (activity: ActivityEventDto) => {...})
}

/// <summary>
/// Сервис для отправки SignalR событий из контроллеров и сервисов.
/// </summary>
public interface IWishlistHubService
{
    Task NotifyGiftClaimedAsync(Guid eventId, WishlistItemDto item);
    Task NotifyCollectiveJoinedAsync(Guid eventId, WishlistItemDto item);
    Task NotifyClaimCancelledAsync(Guid eventId, WishlistItemDto item);
    Task NotifyGuestRsvpUpdatedAsync(Guid eventId, GuestPublicDto guest);
    Task NotifyGuestContactUpdatedAsync(Guid eventId, SharedContactDto contact);
    Task NotifyGuestEmojiUpdatedAsync(Guid eventId, GuestPublicDto guest);
    Task NotifyWishlistItemUpdatedAsync(Guid eventId, WishlistItemDto item);
    Task NotifyActivityUpdatedAsync(Guid eventId, ActivityEventDto activity);
}

public class WishlistHubService(IHubContext<WishlistHub> hubContext) : IWishlistHubService
{
    private string GroupName(Guid eventId) => $"event-{eventId}";

    public Task NotifyGiftClaimedAsync(Guid eventId, WishlistItemDto item) =>
        hubContext.Clients.Group(GroupName(eventId)).SendAsync("GiftClaimed", item);

    public Task NotifyCollectiveJoinedAsync(Guid eventId, WishlistItemDto item) =>
        hubContext.Clients.Group(GroupName(eventId)).SendAsync("CollectiveJoined", item);

    public Task NotifyClaimCancelledAsync(Guid eventId, WishlistItemDto item) =>
        hubContext.Clients.Group(GroupName(eventId)).SendAsync("ClaimCancelled", item);

    public Task NotifyGuestRsvpUpdatedAsync(Guid eventId, GuestPublicDto guest) =>
        hubContext.Clients.Group(GroupName(eventId)).SendAsync("GuestRsvpUpdated", guest);

    public Task NotifyGuestContactUpdatedAsync(Guid eventId, SharedContactDto contact) =>
        hubContext.Clients.Group(GroupName(eventId)).SendAsync("GuestContactUpdated", contact);

    public Task NotifyGuestEmojiUpdatedAsync(Guid eventId, GuestPublicDto guest) =>
        hubContext.Clients.Group(GroupName(eventId)).SendAsync("GuestEmojiUpdated", guest);

    public Task NotifyWishlistItemUpdatedAsync(Guid eventId, WishlistItemDto item) =>
        hubContext.Clients.Group(GroupName(eventId)).SendAsync("WishlistItemUpdated", item);

    public Task NotifyActivityUpdatedAsync(Guid eventId, ActivityEventDto activity) =>
        hubContext.Clients.Group(GroupName(eventId)).SendAsync("ActivityUpdated", activity);
}
