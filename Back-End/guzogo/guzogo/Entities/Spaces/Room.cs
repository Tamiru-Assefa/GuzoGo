namespace guzogo.Entities.Spaces
{
    public class Room
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty; // Custom Topic Title

        // Category Relationship
        public int CategoryId { get; set; }
        public RoomCategory Category { get; set; } = null!;

        // Host / Owner Relationship
        public int HostUserId { get; set; }
        public User HostUser { get; set; } = null!;

        // Room Security & Privacy
        public bool IsPublic { get; set; } = true;
        public string? PasswordHash { get; set; } // Hashed using BCrypt/IdentityHasher if private

        // Room Configurations
        public int MaxParticipants { get; set; } = 6;
        public bool AllowVideo { get; set; } = true;
        public bool AllowScreenShare { get; set; } = true;

        // Status & Timestamps
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? EndedAt { get; set; }

        // Navigation Collections
        public ICollection<RoomParticipant> Participants { get; set; } = new List<RoomParticipant>();
        public ICollection<RoomBannedUser> BannedUsers { get; set; } = new List<RoomBannedUser>();
        public ICollection<RoomMessage> Messages { get; set; } = new List<RoomMessage>();
    }
}
