using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace guzogo.Migrations
{
    /// <inheritdoc />
    public partial class AddFreeTextProfession : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Profiles_ProfessionTitles_ProfessionTitleId",
                table: "Profiles");

            migrationBuilder.AlterColumn<int>(
                name: "ProfessionTitleId",
                table: "Profiles",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<string>(
                name: "Profession",
                table: "Profiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Profiles_ProfessionTitles_ProfessionTitleId",
                table: "Profiles",
                column: "ProfessionTitleId",
                principalTable: "ProfessionTitles",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Profiles_ProfessionTitles_ProfessionTitleId",
                table: "Profiles");

            migrationBuilder.DropColumn(
                name: "Profession",
                table: "Profiles");

            migrationBuilder.AlterColumn<int>(
                name: "ProfessionTitleId",
                table: "Profiles",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Profiles_ProfessionTitles_ProfessionTitleId",
                table: "Profiles",
                column: "ProfessionTitleId",
                principalTable: "ProfessionTitles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
