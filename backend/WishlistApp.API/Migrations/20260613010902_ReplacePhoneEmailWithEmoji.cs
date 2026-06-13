using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WishlistApp.API.Migrations
{
    /// <inheritdoc />
    public partial class ReplacePhoneEmailWithEmoji : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Email",
                table: "Guests");

            migrationBuilder.DropColumn(
                name: "Phone",
                table: "Guests");

            migrationBuilder.AddColumn<string>(
                name: "Emoji",
                table: "Guests",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Emoji",
                table: "Guests");

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "Guests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Phone",
                table: "Guests",
                type: "text",
                nullable: true);
        }
    }
}
