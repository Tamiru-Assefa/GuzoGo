using guzogo.Entities;

namespace guzogo.Services.Matching
{
    public class MatchScoreCalculator
    {
        public int CalculateScore(
            Profile currentUser,
            MatchPreference currentPreference,
            Profile candidate,
            MatchPreference candidatePreference)
        {
            int score = 0;

            // Profession Match
            if (currentPreference.PreferredProfessionId == candidate.ProfessionTitleId)
            {
                score += 40;
            }

            // Goal Match
            if (currentPreference.Goal == candidatePreference.Goal)
            {
                score += 20;
            }

            
            // ===========================
            // Preferred Skills Match
            // ===========================

            var preferredSkillIds = currentPreference.PreferenceSkills
                .Select(ps => ps.SkillId)
                .ToHashSet();


            var candidateSkillIds = candidate.ProfileSkills
                .Select(ps => ps.SkillId)
                .ToHashSet();


            int matchedSkills = preferredSkillIds
                .Intersect(candidateSkillIds)
                .Count();


            score += Math.Min(matchedSkills * 15, 30);

            // Random Bonus
            score += Random.Shared.Next(0, 5);

            return score;
        }
       
        
    }
}