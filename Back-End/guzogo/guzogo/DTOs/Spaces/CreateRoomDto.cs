namespace guzogo.DTOs.Spaces
{
    public class CreateRoomDto
    {
        public string Title { get; set; } = string.Empty;
        public int CategoryId { get; set; }
        public bool IsPublic { get; set; } = true;
        public string? Password { get; set; }
        public int MaxParticipants { get; set; } = 6;
        public bool AllowVideo { get; set; } = true;
        public bool AllowScreenShare { get; set; } = true;
    }
}
