using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace guzogo.Migrations
{
    /// <inheritdoc />
    public partial class FreeTextMatching : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "MatchType",
                table: "MatchPreferences",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<string>(
                name: "AdditionalDescription",
                table: "MatchPreferences",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DesiredProfession",
                table: "MatchPreferences",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "DesiredSkills",
                table: "MatchPreferences",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AdditionalDescription",
                table: "MatchPreferences");

            migrationBuilder.DropColumn(
                name: "DesiredProfession",
                table: "MatchPreferences");

            migrationBuilder.DropColumn(
                name: "DesiredSkills",
                table: "MatchPreferences");

            migrationBuilder.AlterColumn<string>(
                name: "MatchType",
                table: "MatchPreferences",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);
        }
    }
}
