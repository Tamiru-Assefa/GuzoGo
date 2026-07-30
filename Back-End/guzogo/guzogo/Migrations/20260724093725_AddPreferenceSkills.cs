using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace guzogo.Migrations
{
    /// <inheritdoc />
    public partial class AddPreferenceSkills : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PreferenceSkills",
                columns: table => new
                {
                    MatchPreferenceId = table.Column<int>(type: "int", nullable: false),
                    SkillId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PreferenceSkills", x => new { x.MatchPreferenceId, x.SkillId });
                    table.ForeignKey(
                        name: "FK_PreferenceSkills_MatchPreferences_MatchPreferenceId",
                        column: x => x.MatchPreferenceId,
                        principalTable: "MatchPreferences",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PreferenceSkills_Skills_SkillId",
                        column: x => x.SkillId,
                        principalTable: "Skills",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PreferenceSkills_SkillId",
                table: "PreferenceSkills",
                column: "SkillId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PreferenceSkills");
        }
    }
}
