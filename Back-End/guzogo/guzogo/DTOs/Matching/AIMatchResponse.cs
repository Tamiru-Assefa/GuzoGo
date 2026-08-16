namespace guzogo.DTOs.Matching
{
    public class AIMatchResponse
    {
        public bool Matched { get; set; }
        public AIMatchResult? BestMatch { get; set; }
        public List<AIMatchResult> Results { get; set; } = new();
    }

    public class AIMatchResult
    {
        public int CandidateUserId { get; set; }
        public double Score { get; set; }
    }
}