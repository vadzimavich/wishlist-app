using System.ComponentModel.DataAnnotations;

namespace WishlistApp.API.Models;

// ─── User ───────────────────────────────────────────────────────────────────

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public List<WishlistItem> WishlistItems { get; set; } = [];
    public List<Event> Events { get; set; } = [];
    public List<RefreshToken> RefreshTokens { get; set; } = [];
}

// ─── RefreshToken ────────────────────────────────────────────────────────────

public class RefreshToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public bool IsRevoked { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
}

// ─── WishlistItem ─────────────────────────────────────────────────────────────

public enum WishlistItemStatus
{
    Available,    // Доступен для выбора
    Reserved,     // Выбран одним гостем (соло)
    Collective,   // Открыт групповой сбор
    Purchased     // Уже куплен
}

public class WishlistItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }

    public string Name { get; set; } = string.Empty;
    public decimal? Price { get; set; }
    public string Currency { get; set; } = "RUB";
    public string? PhotoUrl { get; set; }
    public string? SourceUrl { get; set; }
    public string? Description { get; set; }

    public WishlistItemStatus Status { get; set; } = WishlistItemStatus.Available;
    public bool IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
    public GiftClaim? ActiveClaim { get; set; }
}

// ─── Event ───────────────────────────────────────────────────────────────────

public class Event
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }

    public string Title { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public string? Location { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? Description { get; set; }
    public string? CoverImageUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
    public List<Guest> Guests { get; set; } = [];
}

// ─── Guest ───────────────────────────────────────────────────────────────────

public enum RsvpStatus
{
    Pending,      // Ещё не ответил
    Attending,    // Придёт
    NotAttending  // Не придёт
}

public class Guest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid EventId { get; set; }

    public string Name { get; set; } = string.Empty;
    public string Emoji { get; set; } = "🙂";
    public int GuestCount { get; set; } = 1;
    public string Token { get; set; } = Guid.NewGuid().ToString("N"); // Уникальный токен для ссылки
    public RsvpStatus RsvpStatus { get; set; } = RsvpStatus.Pending;
    public string? RsvpNote { get; set; }
    [MaxLength(100)]
    public string? Telegram { get; set; }            // Telegram username/contact
    [MaxLength(30)]
    public string? Phone { get; set; }               // Phone number
    public bool IsContactShared { get; set; }        // Opt-in flag to share contact info
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Event Event { get; set; } = null!;
    public List<GiftClaim> GiftClaims { get; set; } = [];
    public List<CollectiveParticipant> CollectiveParticipations { get; set; } = [];
}

// ─── GiftClaim ────────────────────────────────────────────────────────────────

public enum ClaimType
{
    Solo,        // Один гость покупает сам
    Collective   // Групповой сбор
}

public class GiftClaim
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WishlistItemId { get; set; }
    public Guid GuestId { get; set; }    // Инициатор

    public ClaimType Type { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public WishlistItem WishlistItem { get; set; } = null!;
    public Guest Guest { get; set; } = null!;
    public List<CollectiveParticipant> Participants { get; set; } = [];
}

// ─── CollectiveParticipant ───────────────────────────────────────────────────

public class CollectiveParticipant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid GiftClaimId { get; set; }
    public Guid GuestId { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
    public DateTime? LeftAt { get; set; }

    // Navigation
    public GiftClaim GiftClaim { get; set; } = null!;
    public Guest Guest { get; set; } = null!;
}

// ─── ChatMessage ───────────────────────────────────────────────────

public class ChatMessage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid EventId { get; set; }
    public Guid? ClaimId { get; set; }             // NULL = event chat, non-NULL = gift-claim chat
    public Guid GuestId { get; set; }
    public string Text { get; set; } = string.Empty;
    public DateTime? EditedAt { get; set; }         // NULL = never edited
    public bool IsDeleted { get; set; }             // soft-delete for moderation
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Event Event { get; set; } = null!;
    public Guest Guest { get; set; } = null!;
    public GiftClaim? GiftClaim { get; set; }
}

// ─── ActivityEvent ──────────────────────────────────────────────────────────

public class ActivityEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid EventId { get; set; }
    public Guid? GuestId { get; set; }

    public string ActionType { get; set; } = string.Empty;
    public Guid? RelatedItemId { get; set; }
    public string? Metadata { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Event Event { get; set; } = null!;
    public Guest? Guest { get; set; }
}
