namespace guzogo.Entities
{
    public class PreferenceSkill
    {
        public int MatchPreferenceId { get; set; }

        public MatchPreference MatchPreference { get; set; } = null!;


        public int SkillId { get; set; }

        public Skill Skill { get; set; } = null!;
    }
}