using Microsoft.EntityFrameworkCore;
using WishlistApp.API.Data;
using WishlistApp.API.DTOs;
using WishlistApp.API.Models;

namespace WishlistApp.API.Services;

public interface IChatService
{
    Task<ChatMessageDto> SaveMessage(Guid eventId, Guid guestId, string text, Guid? claimId);
    Task<ChatMessageDto> HostSaveMessage(Guid eventId, Guid hostUserId, string text, string hostName);
    Task<ChatMessageDto> EditMessage(Guid messageId, Guid guestId, string newText);
    Task DeleteMessage(Guid messageId, Guid guestId);
    Task HostDeleteMessage(Guid messageId, Guid eventId, Guid hostUserId);
    Task<(List<ChatMessageDto> Messages, int TotalCount)> GetMessages(Guid eventId, int skip, int take);
    Task<int> GetMessageCount(Guid eventId);
}

public class ChatService(AppDbContext db) : IChatService
{
    public async Task<ChatMessageDto> SaveMessage(Guid eventId, Guid guestId, string text, Guid? claimId)
    {
        var message = new ChatMessage
        {
            EventId = eventId,
            GuestId = guestId,
            Text = text,
            ClaimId = claimId
        };

        db.ChatMessages.Add(message);
        await db.SaveChangesAsync();

        // Загружаем навигационные свойства для DTO
        await db.Entry(message).Reference(m => m.Guest).LoadAsync();

        return MapToDto(message);
    }

    public async Task<ChatMessageDto> HostSaveMessage(Guid eventId, Guid hostUserId, string text, string hostName)
    {
        // Verify the host owns this event
        var ev = await db.Events
            .FirstOrDefaultAsync(e => e.Id == eventId && e.UserId == hostUserId)
            ?? throw new UnauthorizedAccessException("Только хозяин события может отправлять сообщения от имени админа.");

        // Use the first guest of the event as the FK reference (required by DB)
        var firstGuest = await db.Guests
            .Where(g => g.EventId == eventId)
            .OrderBy(g => g.CreatedAt)
            .FirstOrDefaultAsync()
            ?? throw new InvalidOperationException("Нет гостей в событии.");

        var message = new ChatMessage
        {
            EventId = eventId,
            GuestId = firstGuest.Id,
            Text = text,
            IsFromHost = true,
            HostName = hostName,
        };

        db.ChatMessages.Add(message);
        await db.SaveChangesAsync();

        return MapToDto(message);
    }

    public async Task<ChatMessageDto> EditMessage(Guid messageId, Guid guestId, string newText)
    {
        var message = await db.ChatMessages
            .Include(m => m.Guest)
            .FirstOrDefaultAsync(m => m.Id == messageId)
            ?? throw new KeyNotFoundException("Сообщение не найдено.");

        if (message.GuestId != guestId)
            throw new UnauthorizedAccessException("Нельзя редактировать чужое сообщение.");

        message.Text = newText;
        message.EditedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return MapToDto(message);
    }

    public async Task DeleteMessage(Guid messageId, Guid guestId)
    {
        var message = await db.ChatMessages
            .FirstOrDefaultAsync(m => m.Id == messageId)
            ?? throw new KeyNotFoundException("Сообщение не найдено.");

        if (message.GuestId != guestId)
            throw new UnauthorizedAccessException("Нельзя удалить чужое сообщение.");

        message.IsDeleted = true;
        await db.SaveChangesAsync();
    }

    public async Task HostDeleteMessage(Guid messageId, Guid eventId, Guid hostUserId)
    {
        // Проверяем, что вызывающий — хозяин события
        var ev = await db.Events
            .FirstOrDefaultAsync(e => e.Id == eventId && e.UserId == hostUserId)
            ?? throw new UnauthorizedAccessException("Только хозяин события может удалять сообщения.");

        var message = await db.ChatMessages
            .FirstOrDefaultAsync(m => m.Id == messageId && m.EventId == eventId)
            ?? throw new KeyNotFoundException("Сообщение не найдено.");

        message.IsDeleted = true;
        await db.SaveChangesAsync();
    }

    public async Task<(List<ChatMessageDto> Messages, int TotalCount)> GetMessages(Guid eventId, int skip, int take)
    {
        var query = db.ChatMessages
            .Include(m => m.Guest)
            .Where(m => m.EventId == eventId && !m.IsDeleted)
            .OrderBy(m => m.CreatedAt); // ASC — oldest first

        var totalCount = await query.CountAsync();
        var messages = await query
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        return (messages.Select(MapToDto).ToList(), totalCount);
    }

    public async Task<int> GetMessageCount(Guid eventId)
    {
        return await db.ChatMessages
            .CountAsync(m => m.EventId == eventId && !m.IsDeleted);
    }

    private static ChatMessageDto MapToDto(ChatMessage msg) => new(
        msg.Id,
        msg.EventId,
        msg.GuestId,
        msg.ClaimId,
        msg.IsFromHost ? (msg.HostName ?? "Администратор") : msg.Guest.Name,
        msg.IsFromHost ? "🛡️" : msg.Guest.Emoji,
        msg.Text,
        msg.EditedAt,
        msg.IsDeleted,
        msg.CreatedAt,
        msg.IsFromHost,
        msg.HostName
    );
}
