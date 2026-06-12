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
    string? PhotoUrl,
    string? SourceUrl,
    string? Description,
    int Priority,
    WishlistItemStatus Status,
    GiftClaimDto? ActiveClaim,
    DateTime CreatedAt
);

public record CreateWishlistItemRequest(
    [Required, MaxLength(200)] string Name,
    decimal? Price,
    string? PhotoUrl,
    string? SourceUrl,
    [MaxLength(1000)] string? Description,
    int Priority = 0
);

public record UpdateWishlistItemRequest(
    [MaxLength(200)] string? Name,
    decimal? Price,
    string? PhotoUrl,
    string? SourceUrl,
    [MaxLength(1000)] string? Description,
    int? Priority
);

// ─── Event ────────────────────────────────────────────────────────────────────

public record EventDto(
    Guid Id,
    string Title,
    DateTime Date,
    string? Location,
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
    [MaxLength(2000)] string? Description,
    string? CoverImageUrl
);

public record UpdateEventRequest(
    [MaxLength(200)] string? Title,
    DateTime? Date,
    [MaxLength(500)] string? Location,
    [MaxLength(2000)] string? Description,
    string? CoverImageUrl,
    bool? IsActive
);

// ─── Guest ────────────────────────────────────────────────────────────────────

public record GuestDto(
    Guid Id,
    string Name,
    string? Phone,
    string? Email,
    string Token,
    RsvpStatus RsvpStatus,
    string? RsvpNote,
    string InviteUrl  // Генерируется динамически
);

public record CreateGuestRequest(
    [Required, MaxLength(100)] string Name,
    [Phone] string? Phone,
    [EmailAddress] string? Email
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
    string? EventDescription,
    string? CoverImageUrl,
    string HostName,
    string? HostAvatarUrl,
    List<GuestPublicDto> Guests,        // Статусы гостей без контактов
    List<WishlistItemDto> WishlistItems,
    GuestSelfDto CurrentGuest           // Данные текущего гостя
);

public record GuestPublicDto(
    Guid Id,
    string Name,
    RsvpStatus RsvpStatus
);

public record GuestSelfDto(
    Guid Id,
    string Name,
    string Token,
    RsvpStatus RsvpStatus,
    string? RsvpNote
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

// ─── Media ────────────────────────────────────────────────────────────────────

public record UploadSignatureResponse(
    string Signature,
    long Timestamp,
    string CloudName,
    string ApiKey,
    string UploadPreset
);

public record MediaUploadRequest(
    [Required] string Base64Image,
    string? Folder
);

public record MediaUploadResponse(
    string Url,
    string PublicId
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
