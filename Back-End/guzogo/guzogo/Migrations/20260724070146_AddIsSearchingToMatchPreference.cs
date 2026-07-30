using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace guzogo.Migrations
{
    /// <inheritdoc />
    public partial class AddIsSearchingToMatchPreference : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsSearching",
                table: "MatchPreferences",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsSearching",
                table: "MatchPreferences");
        }
    }
}
