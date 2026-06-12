using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WishlistApp.API.Data.Migrations;

/// <inheritdoc />
public partial class InitialCreate : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Users",
            columns: table => new
            {
                Id           = table.Column<Guid>(nullable: false),
                Email        = table.Column<string>(maxLength: 256, nullable: false),
                PasswordHash = table.Column<string>(nullable: false),
                Name         = table.Column<string>(maxLength: 100, nullable: false),
                AvatarUrl    = table.Column<string>(nullable: true),
                CreatedAt    = table.Column<DateTime>(nullable: false),
            },
            constraints: t => t.PrimaryKey("PK_Users", x => x.Id));

        migrationBuilder.CreateIndex("IX_Users_Email", "Users", "Email", unique: true);

        migrationBuilder.CreateTable(
            name: "RefreshTokens",
            columns: table => new
            {
                Id        = table.Column<Guid>(nullable: false),
                UserId    = table.Column<Guid>(nullable: false),
                Token     = table.Column<string>(nullable: false),
                ExpiresAt = table.Column<DateTime>(nullable: false),
                IsRevoked = table.Column<bool>(nullable: false),
                CreatedAt = table.Column<DateTime>(nullable: false),
            },
            constraints: t =>
            {
                t.PrimaryKey("PK_RefreshTokens", x => x.Id);
                t.ForeignKey("FK_RefreshTokens_Users_UserId", x => x.UserId, "Users", "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "WishlistItems",
            columns: table => new
            {
                Id          = table.Column<Guid>(nullable: false),
                UserId      = table.Column<Guid>(nullable: false),
                Name        = table.Column<string>(maxLength: 200, nullable: false),
                Price       = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                PhotoUrl    = table.Column<string>(nullable: true),
                SourceUrl   = table.Column<string>(nullable: true),
                Description = table.Column<string>(nullable: true),
                Priority    = table.Column<int>(nullable: false),
                Status      = table.Column<string>(nullable: false),
                IsDeleted   = table.Column<bool>(nullable: false),
                CreatedAt   = table.Column<DateTime>(nullable: false),
                UpdatedAt   = table.Column<DateTime>(nullable: false),
            },
            constraints: t =>
            {
                t.PrimaryKey("PK_WishlistItems", x => x.Id);
                t.ForeignKey("FK_WishlistItems_Users_UserId", x => x.UserId, "Users", "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "Events",
            columns: table => new
            {
                Id             = table.Column<Guid>(nullable: false),
                UserId         = table.Column<Guid>(nullable: false),
                Title          = table.Column<string>(maxLength: 200, nullable: false),
                Date           = table.Column<DateTime>(nullable: false),
                Location       = table.Column<string>(nullable: true),
                Description    = table.Column<string>(nullable: true),
                CoverImageUrl  = table.Column<string>(nullable: true),
                IsActive       = table.Column<bool>(nullable: false),
                CreatedAt      = table.Column<DateTime>(nullable: false),
            },
            constraints: t =>
            {
                t.PrimaryKey("PK_Events", x => x.Id);
                t.ForeignKey("FK_Events_Users_UserId", x => x.UserId, "Users", "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "Guests",
            columns: table => new
            {
                Id         = table.Column<Guid>(nullable: false),
                EventId    = table.Column<Guid>(nullable: false),
                Name       = table.Column<string>(maxLength: 100, nullable: false),
                Phone      = table.Column<string>(nullable: true),
                Email      = table.Column<string>(nullable: true),
                Token      = table.Column<string>(maxLength: 64, nullable: false),
                RsvpStatus = table.Column<string>(nullable: false),
                RsvpNote   = table.Column<string>(nullable: true),
                CreatedAt  = table.Column<DateTime>(nullable: false),
            },
            constraints: t =>
            {
                t.PrimaryKey("PK_Guests", x => x.Id);
                t.ForeignKey("FK_Guests_Events_EventId", x => x.EventId, "Events", "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex("IX_Guests_Token", "Guests", "Token", unique: true);

        migrationBuilder.CreateTable(
            name: "GiftClaims",
            columns: table => new
            {
                Id              = table.Column<Guid>(nullable: false),
                WishlistItemId  = table.Column<Guid>(nullable: false),
                GuestId         = table.Column<Guid>(nullable: false),
                Type            = table.Column<string>(nullable: false),
                IsActive        = table.Column<bool>(nullable: false),
                CreatedAt       = table.Column<DateTime>(nullable: false),
            },
            constraints: t =>
            {
                t.PrimaryKey("PK_GiftClaims", x => x.Id);
                t.ForeignKey("FK_GiftClaims_WishlistItems_WishlistItemId", x => x.WishlistItemId, "WishlistItems", "Id", onDelete: ReferentialAction.Cascade);
                t.ForeignKey("FK_GiftClaims_Guests_GuestId", x => x.GuestId, "Guests", "Id", onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateTable(
            name: "CollectiveParticipants",
            columns: table => new
            {
                Id          = table.Column<Guid>(nullable: false),
                GiftClaimId = table.Column<Guid>(nullable: false),
                GuestId     = table.Column<Guid>(nullable: false),
                JoinedAt    = table.Column<DateTime>(nullable: false),
            },
            constraints: t =>
            {
                t.PrimaryKey("PK_CollectiveParticipants", x => x.Id);
                t.ForeignKey("FK_CollectiveParticipants_GiftClaims_GiftClaimId", x => x.GiftClaimId, "GiftClaims", "Id", onDelete: ReferentialAction.Cascade);
                t.ForeignKey("FK_CollectiveParticipants_Guests_GuestId", x => x.GuestId, "Guests", "Id", onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex("IX_CollectiveParticipants_GiftClaimId_GuestId",
            "CollectiveParticipants", ["GiftClaimId", "GuestId"], unique: true);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable("CollectiveParticipants");
        migrationBuilder.DropTable("GiftClaims");
        migrationBuilder.DropTable("Guests");
        migrationBuilder.DropTable("Events");
        migrationBuilder.DropTable("WishlistItems");
        migrationBuilder.DropTable("RefreshTokens");
        migrationBuilder.DropTable("Users");
    }
}
