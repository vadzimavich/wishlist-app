using Microsoft.EntityFrameworkCore;
using WishlistApp.API.Data;
using WishlistApp.API.DTOs;
using WishlistApp.API.Models;

namespace WishlistApp.API.Services;

public interface IActivityService
{
    Task<ActivityEventDto> RecordActivityAsync(
        Guid eventId, Guid? guestId, string actionType,
        Guid? relatedItemId = null, string? metadata = null);

    Task<ActivityFeedDto> GetActivityAsync(Guid eventId, int skip, int take);

    Task<List<ActivitySummaryItemDto>> GetActivitySummaryAsync(Guid eventId);
}

public class ActivityService(AppDbContext db) : IActivityService
{
    public async Task<ActivityEventDto> RecordActivityAsync(
        Guid eventId, Guid? guestId, string actionType,
        Guid? relatedItemId = null, string? metadata = null)
    {
        var activity = new ActivityEvent
        {
            EventId = eventId,
            GuestId = guestId,
            ActionType = actionType,
            RelatedItemId = relatedItemId,
            Metadata = metadata,
            CreatedAt = DateTime.UtcNow
        };

        db.ActivityEvents.Add(activity);
        await db.SaveChangesAsync();

        return new ActivityEventDto(
            activity.Id, activity.EventId, activity.GuestId,
            activity.ActionType, activity.RelatedItemId,
            activity.Metadata, activity.CreatedAt
        );
    }

    public async Task<ActivityFeedDto> GetActivityAsync(Guid eventId, int skip, int take)
    {
        var query = db.ActivityEvents
            .Where(ae => ae.EventId == eventId);

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(ae => ae.CreatedAt)
            .Skip(skip)
            .Take(take)
            .Select(ae => new ActivityEventDto(
                ae.Id, ae.EventId, ae.GuestId,
                ae.ActionType, ae.RelatedItemId,
                ae.Metadata, ae.CreatedAt
            ))
            .ToListAsync();

        return new ActivityFeedDto(items, totalCount);
    }

    public async Task<List<ActivitySummaryItemDto>> GetActivitySummaryAsync(Guid eventId)
    {
        var summary = await db.ActivityEvents
            .Where(ae => ae.EventId == eventId)
            .GroupBy(ae => ae.ActionType)
            .Select(g => new ActivitySummaryItemDto(g.Key, g.Count()))
            .ToListAsync();

        return summary;
    }
}
