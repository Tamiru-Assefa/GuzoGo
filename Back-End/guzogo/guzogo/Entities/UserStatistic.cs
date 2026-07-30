namespace guzogo.Entities
{
    public class UserStatistic
    {
        public int Id { get; set; }

        public int UserId { get; set; }


        public User User { get; set; } = null!;



        public int TotalMatches { get; set; }



        public int CompletedCalls { get; set; }



        public int TotalCallMinutes { get; set; }



        public double AverageRating { get; set; }



        public DateTime UpdatedAt { get; set; }
    }
}