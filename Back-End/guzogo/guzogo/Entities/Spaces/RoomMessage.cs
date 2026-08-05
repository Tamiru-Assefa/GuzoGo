namespace guzogo.Entities.Spaces
{
    public class RoomMessage
    {
        public int Id { get; set; }

        public int RoomId { get; set; }
        public Room Room { get; set; } = null!;

        public int SenderUserId { get; set; }
        public User SenderUser { get; set; } = null!;

        public string Content { get; set; } = string.Empty;
        public bool IsSystemMessage { get; set; } = false; // e.g., "User X joined the room"
        public DateTime SentAt { get; set; } = DateTime.UtcNow;
    }
}
