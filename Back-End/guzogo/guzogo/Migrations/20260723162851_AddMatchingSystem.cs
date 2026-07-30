using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace guzogo.Migrations
{
    /// <inheritdoc />
    public partial class AddMatchingSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MatchPreferences",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    PreferredProfessionId = table.Column<int>(type: "int", nullable: true),
                    PreferredSkillId = table.Column<int>(type: "int", nullable: true),
                    Goal = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MatchType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MatchPreferences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MatchPreferences_ProfessionTitles_PreferredProfessionId",
                        column: x => x.PreferredProfessionId,
                        principalTable: "ProfessionTitles",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_MatchPreferences_Skills_PreferredSkillId",
                        column: x => x.PreferredSkillId,
                        principalTable: "Skills",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_MatchPreferences_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MatchSessions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    User1Id = table.Column<int>(type: "int", nullable: false),
                    User2Id = table.Column<int>(type: "int", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Duration = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MatchSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MatchSessions_Users_User1Id",
                        column: x => x.User1Id,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MatchSessions_Users_User2Id",
                        column: x => x.User2Id,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UserPresences",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastSeen = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserPresences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserPresences_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserStatistics",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    TotalMatches = table.Column<int>(type: "int", nullable: false),
                    CompletedCalls = table.Column<int>(type: "int", nullable: false),
                    TotalCallMinutes = table.Column<int>(type: "int", nullable: false),
                    AverageRating = table.Column<double>(type: "float", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserStatistics", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserStatistics_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MatchPreferences_PreferredProfessionId",
                table: "MatchPreferences",
                column: "PreferredProfessionId");

            migrationBuilder.CreateIndex(
                name: "IX_MatchPreferences_PreferredSkillId",
                table: "MatchPreferences",
                column: "PreferredSkillId");

            migrationBuilder.CreateIndex(
                name: "IX_MatchPreferences_UserId",
                table: "MatchPreferences",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MatchSessions_User1Id",
                table: "MatchSessions",
                column: "User1Id");

            migrationBuilder.CreateIndex(
                name: "IX_MatchSessions_User2Id",
                table: "MatchSessions",
                column: "User2Id");

            migrationBuilder.CreateIndex(
                name: "IX_UserPresences_UserId",
                table: "UserPresences",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserStatistics_UserId",
                table: "UserStatistics",
                column: "UserId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MatchPreferences");

            migrationBuilder.DropTable(
                name: "MatchSessions");

            migrationBuilder.DropTable(
                name: "UserPresences");

            migrationBuilder.DropTable(
                name: "UserStatistics");
        }
    }
}
