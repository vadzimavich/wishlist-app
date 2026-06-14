using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WishlistApp.API.DTOs;
using WishlistApp.API.Hubs;
using WishlistApp.API.Services;

namespace WishlistApp.API.Controllers;

// ─── Base ─────────────────────────────────────────────────────────────────────

[ApiController]
[Route("api/[controller]")]
public abstract class ApiControllerBase : ControllerBase
{
    protected Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    protected IActionResult ApiOk<T>(T data, string? message = null) =>
        Ok(new { data, message });

    protected IActionResult ApiCreated<T>(T data, string? message = null) =>
        StatusCode(201, new { data, message });
}

// ─── AuthController ───────────────────────────────────────────────────────────

[Route("api/auth")]
public class AuthController(IAuthService authService) : ApiControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var result = await authService.RegisterAsync(request);
        return ApiCreated(result, "Регистрация успешна.");
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await authService.LoginAsync(request);
        return ApiOk(result, "Вход выполнен.");
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest request)
    {
        // Также поддерживаем cookie
        var token = request.RefreshToken
            ?? Request.Cookies["refreshToken"]
            ?? throw new UnauthorizedAccessException("Refresh token не передан.");

        var result = await authService.RefreshAsync(token);
        return ApiOk(result);
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout([FromBody] RefreshRequest? request)
    {
        var token = request?.RefreshToken ?? Request.Cookies["refreshToken"];
        if (token is not null) await authService.RevokeRefreshTokenAsync(token);

        Response.Cookies.Delete("refreshToken");
        return ApiOk<object?>(null, "Выход выполнен.");
    }
}

// ─── WishlistController ───────────────────────────────────────────────────────

[Authorize]
public class WishlistController(IWishlistService wishlistService) : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetItems()
    {
        var items = await wishlistService.GetItemsAsync(CurrentUserId);
        return ApiOk(items);
    }

    [HttpPost]
    public async Task<IActionResult> CreateItem([FromBody] CreateWishlistItemRequest request)
    {
        var item = await wishlistService.CreateItemAsync(CurrentUserId, request);
        return ApiCreated(item);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateItem(Guid id, [FromBody] UpdateWishlistItemRequest request)
    {
        var item = await wishlistService.UpdateItemAsync(CurrentUserId, id, request);
        return ApiOk(item);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteItem(Guid id)
    {
        await wishlistService.DeleteItemAsync(CurrentUserId, id);
        return ApiOk<object?>(null, "Товар удалён.");
    }
}

// ─── EventsController ────────────────────────────────────────────────────────

[Authorize]
public class EventsController(IEventService eventService, IGuestService guestService) : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetEvents()
    {
        var events = await eventService.GetEventsAsync(CurrentUserId);
        return ApiOk(events);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetEvent(Guid id)
    {
        var ev = await eventService.GetEventAsync(CurrentUserId, id);
        return ApiOk(ev);
    }

    [HttpPost]
    public async Task<IActionResult> CreateEvent([FromBody] CreateEventRequest request)
    {
        var ev = await eventService.CreateEventAsync(CurrentUserId, request);
        return ApiCreated(ev);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateEvent(Guid id, [FromBody] UpdateEventRequest request)
    {
        var ev = await eventService.UpdateEventAsync(CurrentUserId, id, request);
        return ApiOk(ev);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteEvent(Guid id)
    {
        await eventService.DeleteEventAsync(CurrentUserId, id);
        return ApiOk<object?>(null, "Событие удалено.");
    }

    // ── Guests ──────────────────────────────────────────────────────────────

    [HttpPost("{eventId:guid}/guests")]
    public async Task<IActionResult> AddGuest(Guid eventId, [FromBody] CreateGuestRequest request)
    {
        var guest = await guestService.AddGuestAsync(CurrentUserId, eventId, request);
        return ApiCreated(guest, "Гость добавлен.");
    }

    [HttpPut("{eventId:guid}/guests/{guestId:guid}")]
    public async Task<IActionResult> UpdateGuest(Guid eventId, Guid guestId, [FromBody] UpdateGuestRequest request)
    {
        var guest = await guestService.UpdateGuestAsync(CurrentUserId, eventId, guestId, request);
        return ApiOk(guest, "Гость обновлён.");
    }

    [HttpDelete("{eventId:guid}/guests/{guestId:guid}")]
    public async Task<IActionResult> RemoveGuest(Guid eventId, Guid guestId)
    {
        await guestService.DeleteGuestAsync(CurrentUserId, eventId, guestId);
        return ApiOk<object?>(null, "Гость удалён.");
    }
}

// ─── GuestsController (публичные маршруты) ───────────────────────────────────

[Route("api/guests")]
public class GuestsController(IGuestService guestService, IWishlistHubService hub) : ApiControllerBase
{
    /// <summary>
    /// Загрузка страницы приглашения по токену. Не требует авторизации.
    /// </summary>
    [HttpGet("by-token/{token}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetByToken(string token)
    {
        var page = await guestService.GetInvitePageAsync(token);
        return ApiOk(page);
    }

    /// <summary>
    /// RSVP — гость подтверждает или отклоняет присутствие.
    /// </summary>
    [HttpPost("{token}/rsvp")]
    [AllowAnonymous]
    public async Task<IActionResult> Rsvp(string token, [FromBody] RsvpRequest request)
    {
        var guest = await guestService.UpdateRsvpAsync(token, request);

        // Уведомляем всех в группе события о смене статуса
        var pageDto = await guestService.GetInvitePageAsync(token);
        await hub.NotifyGuestRsvpUpdatedAsync(
            pageDto.EventId,
            new GuestPublicDto(guest.Id, guest.Name, guest.Emoji, guest.RsvpStatus, guest.GuestCount, guest.Telegram, guest.Phone)
        );

        return ApiOk(guest);
    }
}

// ─── GiftsController ─────────────────────────────────────────────────────────

[Route("api/gifts")]
public class GiftsController(IGiftService giftService, IGuestService guestService, IWishlistHubService hub) : ApiControllerBase
{
    [HttpPost("claim")]
    [AllowAnonymous]
    public async Task<IActionResult> Claim([FromBody] ClaimGiftRequest request)
    {
        var item = await giftService.ClaimGiftAsync(request);

        // Real-time уведомление
        var page = await guestService.GetInvitePageAsync(request.GuestToken);
        await hub.NotifyGiftClaimedAsync(page.EventId, item);

        return ApiOk(item);
    }

    [HttpPost("{claimId:guid}/join")]
    [AllowAnonymous]
    public async Task<IActionResult> JoinCollective(Guid claimId, [FromBody] JoinCollectiveRequest request)
    {
        var item = await giftService.JoinCollectiveAsync(claimId, request);

        var page = await guestService.GetInvitePageAsync(request.GuestToken);
        await hub.NotifyCollectiveJoinedAsync(page.EventId, item);

        return ApiOk(item);
    }

    [HttpPost("{claimId:guid}/cancel")]
    [AllowAnonymous]
    public async Task<IActionResult> CancelClaim(Guid claimId, [FromBody] CancelClaimRequest request)
    {
        var item = await giftService.CancelClaimAsync(claimId, request);

        var page = await guestService.GetInvitePageAsync(request.GuestToken);
        await hub.NotifyClaimCancelledAsync(page.EventId, item);

        return ApiOk(item);
    }
}

// ─── ParserController (заглушка для будущего парсера) ────────────────────────

[Route("api/parser")]
[Authorize]
public class ParserController(IParserService parserService) : ApiControllerBase
{
    /// <summary>
    /// Загружает мета-данные товара по URL маркетплейса.
    /// Поддерживает Open Graph, Schema.org и частичный парсинг Wildberries/Ozon.
    /// </summary>
    [HttpPost("fetch-meta")]
    public async Task<IActionResult> FetchMeta([FromBody] ParseUrlRequest request)
    {
        var result = await parserService.FetchProductMetaAsync(request.Url);
        return ApiOk(result);
    }
}
