using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using WishlistApp.API.Data;
using WishlistApp.API.DTOs;
using WishlistApp.API.Services;

namespace WishlistApp.API.Hubs;

/// <summary>
/// SignalR Hub для чата события.
/// Гости подключаются с guestToken в query string.
/// Хозяин события подключается с access_token (JWT).
/// </summary>
public class ChatHub : Hub
{
    private readonly AppDbContext _db;
    private readonly IChatService _chatService;

    public ChatHub(AppDbContext db, IChatService chatService)
    {
        _db = db;
        _chatService = chatService;
    }

    public override async Task OnConnectedAsync()
    {
        var httpContext = Context.GetHttpContext();
        var query = httpContext?.Request.Query;
        var eventIdStr = query?["eventId"].ToString();
        var guestToken = query?["guestToken"].ToString();

        if (string.IsNullOrEmpty(eventIdStr) || !Guid.TryParse(eventIdStr, out var eventId))
        {
            Context.Abort();
            return;
        }

        Context.Items["EventId"] = eventId;

        // ── Guest auth via guestToken ────────────────────────────────────
        if (!string.IsNullOrEmpty(guestToken))
        {
            var guest = await _db.Guests
                .FirstOrDefaultAsync(g => g.Token == guestToken);

            if (guest == null || guest.EventId != eventId)
            {
                Context.Abort();
                return;
            }

            Context.Items["GuestId"] = guest.Id;
        }
        else
        {
            // ── Host auth via JWT (access_token in query string) ──────────
            var userId = httpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                Context.Abort();
                return;
            }
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, $"event-chat-{eventId}");

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var eventId = Context.Items["EventId"];
        if (eventId is Guid evId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"event-chat-{evId}");
        }

        await base.OnDisconnectedAsync(exception);
    }

    // ── Client-callable methods ──────────────────────────────────────────

    /// <summary>
    /// Гость отправляет сообщение в общий чат события.
    /// </summary>
    public async Task SendEventMessage(string text)
    {
        if (Context.Items["GuestId"] is not Guid guestId)
            throw new HubException("Только гости могут отправлять сообщения.");

        var eventId = (Guid)Context.Items["EventId"]!;
        var message = await _chatService.SaveMessage(eventId, guestId, text, null);
        await Clients.Group($"event-chat-{eventId}").SendAsync("MessageReceived", message);
    }

    /// <summary>
    /// Гость редактирует своё сообщение.
    /// </summary>
    public async Task EditMessage(Guid messageId, string newText)
    {
        if (Context.Items["GuestId"] is not Guid guestId)
            throw new HubException("Только гости могут редактировать сообщения.");

        var msg = await _chatService.EditMessage(messageId, guestId, newText);
        await Clients.Group($"event-chat-{msg.EventId}").SendAsync("MessageEdited", messageId, newText, msg.EditedAt);
    }

    /// <summary>
    /// Гость удаляет своё сообщение.
    /// </summary>
    public async Task DeleteMessage(Guid messageId)
    {
        if (Context.Items["GuestId"] is not Guid guestId)
            throw new HubException("Только гости могут удалять сообщения.");

        var eventId = (Guid)Context.Items["EventId"]!;
        await _chatService.DeleteMessage(messageId, guestId);
        await Clients.Group($"event-chat-{eventId}").SendAsync("MessageDeleted", messageId);
    }

    /// <summary>
    /// Хозяин события удаляет любое сообщение.
    /// Требует JWT аутентификации (access_token в query string).
    /// </summary>
    public async Task HostDeleteMessage(Guid messageId)
    {
        var httpContext = Context.GetHttpContext();
        var userIdClaim = httpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            throw new HubException("Только хозяин события может удалять сообщения.");
        }

        var eventId = (Guid)Context.Items["EventId"]!;
        await _chatService.HostDeleteMessage(messageId, eventId, userId);
        await Clients.Group($"event-chat-{eventId}").SendAsync("MessageDeleted", messageId);
    }
}
