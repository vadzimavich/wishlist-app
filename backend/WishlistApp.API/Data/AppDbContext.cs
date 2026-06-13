using Microsoft.EntityFrameworkCore;
using WishlistApp.API.Models;

namespace WishlistApp.API.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<WishlistItem> WishlistItems => Set<WishlistItem>();
    public DbSet<Event> Events => Set<Event>();
    public DbSet<Guest> Guests => Set<Guest>();
    public DbSet<GiftClaim> GiftClaims => Set<GiftClaim>();
    public DbSet<CollectiveParticipant> CollectiveParticipants => Set<CollectiveParticipant>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        base.OnModelCreating(mb);

        // ── User ──────────────────────────────────────────────────
        mb.Entity<User>(e =>
        {
            e.HasKey(u => u.Id);
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Name).HasMaxLength(100).IsRequired();
            e.Property(u => u.Email).HasMaxLength(256).IsRequired();
        });

        // ── RefreshToken ──────────────────────────────────────────
        mb.Entity<RefreshToken>(e =>
        {
            e.HasKey(rt => rt.Id);
            e.HasOne(rt => rt.User)
             .WithMany(u => u.RefreshTokens)
             .HasForeignKey(rt => rt.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── WishlistItem ──────────────────────────────────────────
        mb.Entity<WishlistItem>(e =>
        {
            e.HasKey(wi => wi.Id);
            e.Property(wi => wi.Name).HasMaxLength(200).IsRequired();
            e.Property(wi => wi.Price).HasColumnType("decimal(18,2)");
            e.Property(wi => wi.Status).HasConversion<string>();
            e.HasQueryFilter(wi => !wi.IsDeleted);    // Глобальный фильтр soft delete

            e.HasOne(wi => wi.User)
             .WithMany(u => u.WishlistItems)
             .HasForeignKey(wi => wi.UserId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(wi => wi.ActiveClaim)
             .WithOne(c => c.WishlistItem)
             .HasForeignKey<GiftClaim>(c => c.WishlistItemId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Event ─────────────────────────────────────────────────
        mb.Entity<Event>(e =>
        {
            e.HasKey(ev => ev.Id);
            e.Property(ev => ev.Title).HasMaxLength(200).IsRequired();

            e.HasOne(ev => ev.User)
             .WithMany(u => u.Events)
             .HasForeignKey(ev => ev.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Guest ─────────────────────────────────────────────────
        mb.Entity<Guest>(e =>
        {
            e.HasKey(g => g.Id);
            e.HasIndex(g => g.Token).IsUnique();
            e.Property(g => g.Name).HasMaxLength(100).IsRequired();
            e.Property(g => g.Token).HasMaxLength(64).IsRequired();
            e.Property(g => g.GuestCount).IsRequired().HasDefaultValue(1);
            e.Property(g => g.RsvpStatus).HasConversion<string>();

            e.HasOne(g => g.Event)
             .WithMany(ev => ev.Guests)
             .HasForeignKey(g => g.EventId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── GiftClaim ─────────────────────────────────────────────
        mb.Entity<GiftClaim>(e =>
        {
            e.HasKey(c => c.Id);
            e.Property(c => c.Type).HasConversion<string>();

            e.HasOne(c => c.Guest)
             .WithMany(g => g.GiftClaims)
             .HasForeignKey(c => c.GuestId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ── CollectiveParticipant ─────────────────────────────────
        mb.Entity<CollectiveParticipant>(e =>
        {
            e.HasKey(cp => cp.Id);
            e.HasIndex(cp => new { cp.GiftClaimId, cp.GuestId }).IsUnique(); // один гость — один раз

            e.HasOne(cp => cp.GiftClaim)
             .WithMany(c => c.Participants)
             .HasForeignKey(cp => cp.GiftClaimId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(cp => cp.Guest)
             .WithMany(g => g.CollectiveParticipations)
             .HasForeignKey(cp => cp.GuestId)
             .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
