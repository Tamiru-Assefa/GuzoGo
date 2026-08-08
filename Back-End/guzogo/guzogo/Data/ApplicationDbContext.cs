using guzogo.Entities;
using guzogo.Entities.Spaces;
using Microsoft.EntityFrameworkCore;

namespace guzogo.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {

        }

        public DbSet<User> Users { get; set; }
        public DbSet<Profile> Profiles { get; set; }

        public DbSet<ProfessionCategory> ProfessionCategories { get; set; }

        public DbSet<ProfessionTitle> ProfessionTitles { get; set; }
        public DbSet<Skill> Skills { get; set; }

        public DbSet<ProfileSkill> ProfileSkills { get; set; }

        public DbSet<Experience> Experiences { get; set; }
        public DbSet<UserPresence> UserPresences { get; set; }

        public DbSet<MatchPreference> MatchPreferences { get; set; }

        public DbSet<MatchSession> MatchSessions { get; set; }

        public DbSet<UserStatistic> UserStatistics { get; set; }

        public DbSet<PreferenceSkill> PreferenceSkills { get; set; }

        //SPACES ROOM FEATURE ENTITIES
        public DbSet<RoomCategory> RoomCategories { get; set; }
        public DbSet<Room> Rooms { get; set; }
        public DbSet<RoomParticipant> RoomParticipants { get; set; }
        public DbSet<RoomBannedUser> RoomBannedUsers { get; set; }
        public DbSet<RoomMessage> RoomMessages { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>()
                .HasOne(u => u.Profile)
                .WithOne(p => p.User)
                .HasForeignKey<Profile>(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ProfessionCategory>()
                .HasMany(c => c.ProfessionTitles)
                .WithOne(t => t.ProfessionCategory)
                .HasForeignKey(t => t.ProfessionCategoryId);

            modelBuilder.Entity<ProfessionTitle>()
                .HasMany(t => t.Profiles)
                .WithOne(p => p.ProfessionTitle)
                .HasForeignKey(p => p.ProfessionTitleId);

            modelBuilder.Entity<ProfileSkill>()
                .HasKey(ps => new
                {
                    ps.ProfileId,
                    ps.SkillId
                });

            modelBuilder.Entity<ProfileSkill>()
                .HasOne(ps => ps.Profile)
                .WithMany(p => p.ProfileSkills)
                .HasForeignKey(ps => ps.ProfileId);



            modelBuilder.Entity<ProfileSkill>()
                .HasOne(ps => ps.Skill)
                .WithMany(s => s.ProfileSkills)
                .HasForeignKey(ps => ps.SkillId);


            modelBuilder.Entity<Experience>()
                .HasOne(e => e.Profile)
                .WithMany(p => p.Experiences)
                .HasForeignKey(e => e.ProfileId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<User>()
                .HasOne(u => u.UserPresence)
                .WithOne(p => p.User)
                .HasForeignKey<UserPresence>(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<User>()
                .HasOne(u => u.MatchPreference)
                .WithOne(m => m.User)
                .HasForeignKey<MatchPreference>(m => m.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<User>()
                .HasOne(u => u.UserStatistic)
                .WithOne(s => s.User)
                .HasForeignKey<UserStatistic>(s => s.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<MatchSession>()
                .HasOne(ms => ms.User1)
                .WithMany(u => u.MatchSessionsAsUser1)
                .HasForeignKey(ms => ms.User1Id)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<MatchSession>()
                .HasOne(ms => ms.User2)
                .WithMany(u => u.MatchSessionsAsUser2)
                .HasForeignKey(ms => ms.User2Id)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<PreferenceSkill>()
                .HasKey(x => new
                {
                    x.MatchPreferenceId,
                    x.SkillId
                });


            modelBuilder.Entity<PreferenceSkill>()
                .HasOne(x => x.MatchPreference)
                .WithMany(x => x.PreferenceSkills)
                .HasForeignKey(x => x.MatchPreferenceId);


            modelBuilder.Entity<PreferenceSkill>()
                .HasOne(x => x.Skill)
                .WithMany(x => x.PreferenceSkills)
                .HasForeignKey(x => x.SkillId);

            //SPACES ROOM FEATURE ENTITIES

            modelBuilder.Entity<Room>()
        .HasOne(r => r.HostUser)
        .WithMany(u => u.HostedRooms)
        .HasForeignKey(r => r.HostUserId)
        .OnDelete(DeleteBehavior.Restrict); // Prevent deleting a User from wiping all their rooms aggressively

            // 2. Room Participant Relationship
            modelBuilder.Entity<RoomParticipant>()
                .HasOne(rp => rp.User)
                .WithMany(u => u.RoomParticipants)
                .HasForeignKey(rp => rp.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // 3. Room Banned User Relationship
            modelBuilder.Entity<RoomBannedUser>()
                .HasOne(rb => rb.User)
                .WithMany(u => u.BannedFromRooms)
                .HasForeignKey(rb => rb.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // 4. Room Messages Relationship
            modelBuilder.Entity<RoomMessage>()
                .HasOne(rm => rm.SenderUser)
                .WithMany(u => u.RoomMessages)
                .HasForeignKey(rm => rm.SenderUserId)
                .OnDelete(DeleteBehavior.Cascade);


        }
    }
}
