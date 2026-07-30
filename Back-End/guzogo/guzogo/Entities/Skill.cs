namespace guzogo.Entities
{
    public class Skill
    {
        public int Id { get; set; }


        public string Name { get; set; } = string.Empty;


        // Navigation
        public ICollection<ProfileSkill> ProfileSkills { get; set; }
            = new List<ProfileSkill>();
        public ICollection<PreferenceSkill> PreferenceSkills { get; set; }
            = new List<PreferenceSkill>();
    }
}