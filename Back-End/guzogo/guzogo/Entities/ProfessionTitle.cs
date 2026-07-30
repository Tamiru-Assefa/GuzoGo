using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace guzogo.Entities
{
    public class ProfessionTitle
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [StringLength(300)]
        public string? Description { get; set; }

        public bool IsActive { get; set; } = true;

        // Foreign Key
        public int ProfessionCategoryId { get; set; }

        [ForeignKey(nameof(ProfessionCategoryId))]
        public ProfessionCategory ProfessionCategory { get; set; } = null!;

        // Navigation Property
        public ICollection<Profile> Profiles { get; set; }
            = new List<Profile>();
    }
}