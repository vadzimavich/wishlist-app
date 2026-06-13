using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WishlistApp.API.Migrations
{
    /// <inheritdoc />
    public partial class PendingFix : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Priority",
                table: "WishlistItems");

            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "WishlistItems",
                type: "text",
                nullable: false,
                defaultValue: "RUB");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Currency",
                table: "WishlistItems");

            migrationBuilder.AddColumn<int>(
                name: "Priority",
                table: "WishlistItems",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }
    }
}
