using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using WishlistApp.API.Data;
using WishlistApp.API.DTOs;
using WishlistApp.API.Hubs;
using WishlistApp.API.Services;

namespace WishlistApp.API.Controllers;

/// <summary>
/// REST API для сообщений чата события.
/// Гостевые операции аутентифицируются через guestToken в query string.
/// Хост-операции требуют JWT (Authorization: Bearer ...).
/// </summary>
[Route("api/events/{eventId}/messages")]
[ApiController]
public class ChatController : ControllerBase
{
    private readonly IChatService _chatService;
    private readonly AppDbContext _db;
    private readonly IHubContext<ChatHub> _hubContext;

    public ChatController(IChatService chatService, AppDbContext db, IHubContext<ChatHub> hubContext)
    {
        _chatService = chatService;
        _db = db;
        _hubContext = hubContext;
    }

    /// <summary>
    /// Получить сообщения чата события (с пагинацией).
    /// Доступно гостям (guestToken) и хозяину (JWT).
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetMessages(Guid eventId, [FromQuery] int skip = 0, [FromQuery] int take = 50)
    {
        var (messages, total) = await _chatService.GetMessages(eventId, skip, take);
        return Ok(new { data = new { messages, total } });
    }

    /// <summary>
    /// Редактировать сообщение.
    /// </summary>
    [HttpPut("{messageId:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> EditMessage(Guid eventId, Guid messageId, [FromBody] EditMessageBody body, [FromQuery] string guestToken)
    {
        var guest = await _db.Guests.FirstOrDefaultAsync(g => g.Token == guestToken)
            ?? throw new KeyNotFoundException("Гость не найден.");

        var msg = await _chatService.EditMessage(messageId, guest.Id, body.Text);

        // Уведомляем всех в группе чата
        await _hubContext.Clients.Group($"event-chat-{eventId}")
            .SendAsync("MessageEdited", messageId, body.Text, msg.EditedAt);

        return Ok(new { data = msg });
    }

    /// <summary>
    /// Гость удаляет своё сообщение (soft-delete).
    /// </summary>
    [HttpDelete("{messageId:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> DeleteMessage(Guid eventId, Guid messageId, [FromQuery] string guestToken)
    {
        var guest = await _db.Guests.FirstOrDefaultAsync(g => g.Token == guestToken)
            ?? throw new KeyNotFoundException("Гость не найден.");

        await _chatService.DeleteMessage(messageId, guest.Id);

        // Уведомляем всех в группе чата
        await _hubContext.Clients.Group($"event-chat-{eventId}")
            .SendAsync("MessageDeleted", messageId);

        return Ok(new { data = (object?)null, message = "Сообщение удалено." });
    }

    /// <summary>
    /// Хозяин события удаляет любое сообщение.
    /// Требует JWT аутентификации.
    /// </summary>
    [HttpDelete("{messageId:guid}/host")]
    [Authorize]
    public async Task<IActionResult> HostDeleteMessage(Guid eventId, Guid messageId)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        await _chatService.HostDeleteMessage(messageId, eventId, userId);

        // Уведомляем всех в группе чата
        await _hubContext.Clients.Group($"event-chat-{eventId}")
            .SendAsync("MessageDeleted", messageId);

        return Ok(new { data = (object?)null, message = "Сообщение удалено хозяином." });
    }
}

/// <summary>
/// Модель для редактирования сообщения.
/// </summary>
public record EditMessageBody(string Text);
