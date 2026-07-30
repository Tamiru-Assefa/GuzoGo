using System.ComponentModel.DataAnnotations;

namespace guzogo.Entities
{
    public class ProfessionCategory
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [StringLength(300)]
        public string? Description { get; set; }

        // Navigation Property
        public ICollection<ProfessionTitle> ProfessionTitles { get; set; }
            = new List<ProfessionTitle>();
    }
}