namespace guzogo.DTOs.Spaces
{
    public class RoomCardDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public int CategoryId { get; set; }
        public string CategoryName { get; set; } = string.Empty;

        public int HostUserId { get; set; }
        public string HostFullName { get; set; } = string.Empty;
        public string? HostProfilePictureUrl { get; set; }

        public bool IsPublic { get; set; }
        public int ActiveParticipantCount { get; set; }
        public int MaxParticipants { get; set; }
        public bool AllowVideo { get; set; }
        public bool AllowScreenShare { get; set; }

        public List<string?> ParticipantAvatars { get; set; } = new();
    }
}
