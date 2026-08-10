using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using guzogo.Enums;

namespace guzogo.Entities
{
    public class Profile
    {
        [Key]
        public int Id { get; set; }

        // ---------- User Relationship ----------

        public int UserId { get; set; }

        [ForeignKey(nameof(UserId))]
        public User User { get; set; } = null!;

        // ---------- Basic Information ----------

        [Required]
        [StringLength(50)]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string LastName { get; set; } = string.Empty;

        // ---------- Career ----------

        public int? ProfessionTitleId { get; set; }

        [ForeignKey(nameof(ProfessionTitleId))]
        public ProfessionTitle? ProfessionTitle { get; set; } = null!;

        public ExperienceLevel ExperienceLevel { get; set; }

        [StringLength(100)]
        public string? Company { get; set; }

        // ---------- Location ----------

        [StringLength(100)]
        public string? Country { get; set; }

        [StringLength(100)]
        public string? City { get; set; }

        // ---------- About ----------

        [StringLength(500)]
        public string? Bio { get; set; }

        // ---------- Links ----------

        public string? LinkedInUrl { get; set; }

        public string? GitHubUrl { get; set; }

        public string? PortfolioUrl { get; set; }

        // ---------- Profile Picture ----------

        public string? ProfilePictureUrl { get; set; }

        // ---------- Rating ----------

        public double Rating { get; set; } = 0;

        public string? Profession { get; set; }

        public int TotalRatings { get; set; } = 0;

        // ---------- Badge ----------

        [StringLength(50)]
        public string BadgeLevel { get; set; } = "New Member";
        public ICollection<ProfileSkill> ProfileSkills { get; set; }
        = new List<ProfileSkill>();

        public ICollection<Experience> Experiences { get; set; }
        = new List<Experience>();
    }
}