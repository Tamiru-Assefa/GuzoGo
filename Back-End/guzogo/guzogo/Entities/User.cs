using guzogo.Entities.Spaces;
using System.ComponentModel.DataAnnotations;

namespace guzogo.Entities
{
    public class User
    {
        [Key] // Marks this as the primary key
        public int Id { get; set; }

        [Required(ErrorMessage = "Email is required.")]
        [EmailAddress(ErrorMessage = "Invalid email format.")]
        [StringLength(256)]
        public string Email { get; set; } = string.Empty; //not null

        [Required(ErrorMessage = "Username is required.")]
        [StringLength(50, MinimumLength = 3, ErrorMessage = "Username must be between 3 and 50 characters.")]
        [RegularExpression(@"^[a-zA-Z0-9_]+$", ErrorMessage = "Username can only contain letters, numbers, and underscores.")]
        public string UserName { get; set; } = string.Empty;

        [Required]
        [StringLength(500)] // Hashes vary in length depending on algorithm (e.g., BCrypt/Argon2)
        public string PasswordHash { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public string? EmailVerificationToken { get; set; }
        public bool EmailVerified { get; set; } = false;
        public string? PasswordResetToken { get; set; }
        public DateTime? PasswordResetTokenExpiry { get; set; }

        public bool IsOnline { get; set; } = false;

        public DateTime? LastActive { get; set; }
        public Profile? Profile { get; set; }

        public UserPresence? UserPresence { get; set; }

        public MatchPreference? MatchPreference { get; set; }

        //public bool IsSearching { get; set; } = true;


        public UserStatistic? UserStatistic { get; set; }
        public ICollection<MatchSession> MatchSessionsAsUser1 { get; set; }
            = new List<MatchSession>();


        public ICollection<MatchSession> MatchSessionsAsUser2 { get; set; }
            = new List<MatchSession>();

        public ICollection<Room> HostedRooms { get; set; }
        = new List<Room>();

        public ICollection<RoomParticipant> RoomParticipants { get; set; }
            = new List<RoomParticipant>();

        public ICollection<RoomBannedUser> BannedFromRooms { get; set; }
            = new List<RoomBannedUser>();

        public ICollection<RoomMessage> RoomMessages { get; set; }
            = new List<RoomMessage>();
    }
}
