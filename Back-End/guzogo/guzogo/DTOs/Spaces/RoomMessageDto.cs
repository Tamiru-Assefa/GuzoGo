namespace guzogo.DTOs.Spaces
{
    public class RoomMessageDto
    {
        public int Id { get; set; }
        public int RoomId { get; set; }
        public int SenderUserId { get; set; }
        public string SenderFullName { get; set; } = string.Empty;
        public string? SenderProfilePictureUrl { get; set; }
        public string Content { get; set; } = string.Empty;
        public DateTime SentAt { get; set; }
    }
}
