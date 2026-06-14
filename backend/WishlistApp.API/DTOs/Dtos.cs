using System.ComponentModel.DataAnnotations;
using WishlistApp.API.Models;

namespace WishlistApp.API.DTOs;

// ─── Auth ─────────────────────────────────────────────────────────────────────

public record RegisterRequest(
    [Required, EmailAddress] string Email,
    [Required, MinLength(8)] string Password,
    [Required, MaxLength(100)] string Name
);

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password
);

public record AuthResponse(
    string AccessToken,
    string TokenType,
    int ExpiresIn,
    UserDto User
);

public record RefreshRequest(
    [Required] string RefreshToken
);

// ─── User ─────────────────────────────────────────────────────────────────────

public record UserDto(
    Guid Id,
    string Email,
    string Name,
    string? AvatarUrl,
    DateTime CreatedAt
);

// ─── WishlistItem ─────────────────────────────────────────────────────────────

public record WishlistItemDto(
    Guid Id,
    string Name,
    decimal? Price,
    string Currency,
    string? PhotoUrl,
    string? SourceUrl,
    string? Description,
    WishlistItemStatus Status,
    GiftClaimDto? ActiveClaim,
    DateTime CreatedAt
);

public record CreateWishlistItemRequest(
    [Required, MaxLength(200)] string Name,
    decimal? Price,
    string? Currency,
    string? PhotoUrl,
    string? SourceUrl,
    [MaxLength(1000)] string? Description
);

public record UpdateWishlistItemRequest(
    [MaxLength(200)] string? Name,
    decimal? Price,
    string? Currency,
    string? PhotoUrl,
    string? SourceUrl,
    [MaxLength(1000)] string? Description
);

// ─── Event ────────────────────────────────────────────────────────────────────

public record EventDto(
    Guid Id,
    string Title,
    DateTime Date,
    string? Location,
    double? Latitude,
    double? Longitude,
    string? Description,
    string? CoverImageUrl,
    bool IsActive,
    List<GuestDto> Guests,
    DateTime CreatedAt
);

public record CreateEventRequest(
    [Required, MaxLength(200)] string Title,
    [Required] DateTime Date,
    [MaxLength(500)] string? Location,
    double? Latitude,
    double? Longitude,
    [MaxLength(2000)] string? Description,
    string? CoverImageUrl
);

public record UpdateEventRequest(
    [MaxLength(200)] string? Title,
    DateTime? Date,
    [MaxLength(500)] string? Location,
    double? Latitude,
    double? Longitude,
    [MaxLength(2000)] string? Description,
    string? CoverImageUrl,
    bool? IsActive
);

// ─── Contact Sharing ──────────────────────────────────────────────────────────

public record UpdateContactRequest(
    [MaxLength(100)] string? Telegram,
    [MaxLength(30), Phone] string? Phone
);

public record ShareContactRequest(
    bool IsShared
);

public record SharedContactDto(
    Guid GuestId,
    string Name,
    string Emoji,
    string? Telegram,
    string? Phone
);

// ─── Guest ────────────────────────────────────────────────────────────────────

public record GuestDto(
    Guid Id,
    string Name,
    string Emoji,
    string Token,
    RsvpStatus RsvpStatus,
    string? RsvpNote,
    int GuestCount,
    string InviteUrl,  // Генерируется динамически
    string? Telegram,
    string? Phone,
    bool IsContactShared
);

public record CreateGuestRequest(
    [Required, MaxLength(100)] string Name,
    [MaxLength(10)] string Emoji = "🙂",
    [Range(1, int.MaxValue)] int GuestCount = 1
);

public record UpdateGuestRequest(
    [Required, MaxLength(100)] string Name,
    [MaxLength(10)] string? Emoji,
    [Range(1, int.MaxValue)] int? GuestCount
);

public record RsvpRequest(
    [Required] RsvpStatus Status,
    [MaxLength(500)] string? Note
);

// ─── Invite Page (публичные данные события) ───────────────────────────────────

public record InvitePageDto(
    Guid EventId,
    string EventTitle,
    DateTime EventDate,
    string? EventLocation,
    double? EventLatitude,
    double? EventLongitude,
    string? EventDescription,
    string? CoverImageUrl,
    string HostName,
    string? HostAvatarUrl,
    List<GuestPublicDto> Guests,
    List<WishlistItemDto> WishlistItems,
    GuestSelfDto CurrentGuest
);

public record GuestPublicDto(
    Guid Id,
    string Name,
    string Emoji,
    RsvpStatus RsvpStatus,
    int GuestCount,
    string? Telegram,
    string? Phone
);

public record GuestSelfDto(
    Guid Id,
    string Name,
    string Emoji,
    string Token,
    RsvpStatus RsvpStatus,
    string? RsvpNote,
    int GuestCount,
    string? Telegram,
    string? Phone,
    bool IsContactShared
);

// ─── GiftClaim ────────────────────────────────────────────────────────────────

public record GiftClaimDto(
    Guid Id,
    Guid WishlistItemId,
    GuestPublicDto Claimer,
    ClaimType Type,
    List<GuestPublicDto> Participants,
    DateTime CreatedAt
);

public record ClaimGiftRequest(
    [Required] string GuestToken,
    [Required] Guid WishlistItemId,
    [Required] ClaimType ClaimType
);

public record JoinCollectiveRequest(
    [Required] string GuestToken
);

public record CancelClaimRequest(
    [Required] string GuestToken
);

// ─── Parser ───────────────────────────────────────────────────────────────────

public record ParseUrlRequest(
    [Required, Url] string Url
);

public record ParsedProductDto(
    string? Name,
    decimal? Price,
    string? ImageUrl,
    string? Description,
    string SourceUrl
);

// ─── ChatMessage ───────────────────────────────────────────────────

public record ChatMessageDto(
    Guid Id,
    Guid EventId,
    Guid? GuestId,
    string GuestName,
    string GuestEmoji,
    string Text,
    DateTime? EditedAt,
    bool IsDeleted,
    DateTime CreatedAt
);

// ─── ActivityEvent ───────────────────────────────────────────────────────────

public record ActivityEventDto(
    Guid Id,
    Guid EventId,
    Guid? GuestId,
    string ActionType,
    Guid? RelatedItemId,
    string? Metadata,
    DateTime CreatedAt
);

public record ActivityFeedDto(
    List<ActivityEventDto> Items,
    int TotalCount
);

public record ActivitySummaryItemDto(
    string ActionType,
    int Count
);
