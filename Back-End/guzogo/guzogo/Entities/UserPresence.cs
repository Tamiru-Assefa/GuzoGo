namespace guzogo.Entities
{
    public class UserPresence
    {
        public int Id { get; set; }


        // Foreign Key
        public int UserId { get; set; }


        // Navigation
        public User User { get; set; } = null!;


        // Online, Searching, InCall, Offline
        public string Status { get; set; } = "Offline";


        public DateTime LastSeen { get; set; }


        public DateTime UpdatedAt { get; set; }
    }
}