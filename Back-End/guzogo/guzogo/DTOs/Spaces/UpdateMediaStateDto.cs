namespace guzogo.DTOs.Spaces
{
    public class UpdateMediaStateDto
    {
        public bool? IsMuted { get; set; }
        public bool? IsVideoOn { get; set; }
        public bool? IsScreenSharing { get; set; }
        public bool? IsHandRaised { get; set; }
    }
}