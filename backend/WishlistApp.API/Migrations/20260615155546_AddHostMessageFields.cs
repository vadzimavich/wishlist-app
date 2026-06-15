using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WishlistApp.API.Migrations
{
    /// <inheritdoc />
    public partial class AddHostMessageFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "HostName",
                table: "ChatMessages",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsFromHost",
                table: "ChatMessages",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HostName",
                table: "ChatMessages");

            migrationBuilder.DropColumn(
                name: "IsFromHost",
                table: "ChatMessages");
        }
    }
}
