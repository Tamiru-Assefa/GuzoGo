namespace guzogo.DTOs.Spaces
{
    public class RoomParticipantDto
    {
        public int UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? ProfilePictureUrl { get; set; }
        public string Profession { get; set; } = string.Empty;
        public bool IsHost { get; set; }
        public bool IsMuted { get; set; }
        public bool IsMutedByHost { get; set; }
        public bool IsVideoOn { get; set; }
        public bool IsScreenSharing { get; set; }
        public bool IsHandRaised { get; set; }
    }
}
