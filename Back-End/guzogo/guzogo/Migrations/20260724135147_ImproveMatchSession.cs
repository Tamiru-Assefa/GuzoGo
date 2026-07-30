using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace guzogo.Migrations
{
    /// <inheritdoc />
    public partial class ImproveMatchSession : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "Status",
                table: "MatchSessions",
                type: "int",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<string>(
                name: "EndReason",
                table: "MatchSessions",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RoomId",
                table: "MatchSessions",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EndReason",
                table: "MatchSessions");

            migrationBuilder.DropColumn(
                name: "RoomId",
                table: "MatchSessions");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "MatchSessions",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");
        }
    }
}
