using guzogo.Entities;

namespace guzogo.Services.Matching
{
    public class MatchScoreCalculator
    {
        public int CalculateScore(
            MatchPreference currentPref,
            Profile candidateProfile,
            MatchPreference candidatePref)
        {
            int score = 0;

            // ===========================
            // Profession Match
            // ===========================
            if (!string.IsNullOrWhiteSpace(currentPref.DesiredProfession) &&
                !string.IsNullOrWhiteSpace(candidateProfile.ProfessionTitle?.Name))
            {
                if (currentPref.DesiredProfession.Equals(
                    candidateProfile.ProfessionTitle.Name,
                    StringComparison.OrdinalIgnoreCase))
                {
                    score += 40;
                }
            }

            // ===========================
            // Goal Match
            // ===========================
            if (!string.IsNullOrWhiteSpace(currentPref.Goal) &&
                !string.IsNullOrWhiteSpace(candidatePref.Goal))
            {
                if (currentPref.Goal.Equals(
                    candidatePref.Goal,
                    StringComparison.OrdinalIgnoreCase))
                {
                    score += 20;
                }
            }

            // ===========================
            // Desired Skills Match
            // ===========================
            var candidateSkillNames = candidateProfile.ProfileSkills
                .Where(ps => ps.Skill != null)
                .Select(ps => ps.Skill.Name)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            int matchedSkills = currentPref.DesiredSkills
                .Count(skill => candidateSkillNames.Contains(skill));

            // Maximum 30 points from skills
            score += Math.Min(matchedSkills * 15, 30);

            // ===========================
            // Small Random Bonus
            // ===========================
            score += Random.Shared.Next(0, 5);

            return score;
        }
    }
}