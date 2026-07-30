using guzogo.Enums;
namespace guzogo.Entities
{
    public class MatchSession
    {
        public int Id { get; set; }



        // First user
        public int User1Id { get; set; }


        public User User1 { get; set; } = null!;



        // Second user
        public int User2Id { get; set; }


        public User User2 { get; set; } = null!;



        public DateTime StartedAt { get; set; }


        public DateTime? EndedAt { get; set; }



        // Duration in minutes
        public int Duration { get; set; }
        public string RoomId { get; set; }
            = Guid.NewGuid().ToString();

        public string? EndReason { get; set; }



        // Waiting
        // Active
        // Completed
        // Cancelled
        public MatchSessionStatus Status { get; set; }
            = MatchSessionStatus.Waiting;
    }
}