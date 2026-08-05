using guzogo.Entities;
namespace guzogo.Entities.Spaces
{
    public class RoomParticipant
    {
        public int Id { get; set; }
        public int RoomId { get; set; }
        public Room Room { get; set; } = null!;

        public int UserId { get; set; }
        public User User { get; set; } = null!;

        // Real-Time Flags
        public bool IsMuted { get; set; } = false; // Set by self or host
        public bool IsMutedByHost { get; set; } = false; // Prevents self-unmuting if host force-muted
        public bool IsVideoOn { get; set; } = false;
        public bool IsScreenSharing { get; set; } = false;
        public bool IsHandRaised { get; set; } = false;

        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LeftAt { get; set; } // Set when user leaves


    }
}
