namespace guzogo.Entities.Spaces
{
    public class RoomBannedUser
    {
        public int Id { get; set; }

        public int RoomId { get; set; }
        public Room Room { get; set; } = null!;

        public int UserId { get; set; }
        public User User { get; set; } = null!;

        public DateTime BannedAt { get; set; } = DateTime.UtcNow;
    }
}
