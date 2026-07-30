namespace guzogo.Entities
{
    public class ProfileSkill
    {
        public int ProfileId { get; set; }

        public Profile Profile { get; set; } = null!;


        public int SkillId { get; set; }

        public Skill Skill { get; set; } = null!;
    }
}