using guzogo.Data;
using guzogo.DTOs.Experience;
using guzogo.Entities;
using guzogo.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace guzogo.Services.Implementation
{
    public class ExperienceService : IExperienceService 
    {
        private readonly ApplicationDbContext _context;


        public ExperienceService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<ExperienceDto> CreateExperienceAsync(
    int profileId,
    CreateExperienceDto dto)
        {
            var profileExists = await _context.Profiles
                .AnyAsync(p => p.Id == profileId);

            if (!profileExists)
            {
                throw new Exception("Profile not found.");
            }


            var experience = new Experience
            {
                ProfileId = profileId,

                JobTitle = dto.JobTitle,

                CompanyName = dto.CompanyName,

                Description = dto.Description,

                StartDate = dto.StartDate,

                EndDate = dto.EndDate,

                IsCurrent = dto.IsCurrent
            };


            _context.Experiences.Add(experience);

            await _context.SaveChangesAsync();


            return new ExperienceDto
            {
                Id = experience.Id,

                JobTitle = experience.JobTitle,

                CompanyName = experience.CompanyName,

                Description = experience.Description,

                StartDate = experience.StartDate,

                EndDate = experience.EndDate,

                IsCurrent = experience.IsCurrent
            };
        }

        public async Task<IEnumerable<ExperienceDto>> GetProfileExperiencesAsync(
            int profileId)
        {
            return await _context.Experiences
                .Where(e => e.ProfileId == profileId)
                .Select(e => new ExperienceDto
                {
                    Id = e.Id,

                    JobTitle = e.JobTitle,

                    CompanyName = e.CompanyName,

                    Description = e.Description,

                    StartDate = e.StartDate,

                    EndDate = e.EndDate,

                    IsCurrent = e.IsCurrent
                })
                .OrderByDescending(e => e.StartDate)
                .ToListAsync();
        }

        public async Task<bool> UpdateExperienceAsync(
    int id,
    CreateExperienceDto dto)
        {
            var experience = await _context.Experiences
                .FindAsync(id);


            if (experience == null)
                return false;


            experience.JobTitle = dto.JobTitle;

            experience.CompanyName = dto.CompanyName;

            experience.Description = dto.Description;

            experience.StartDate = dto.StartDate;

            experience.EndDate = dto.EndDate;

            experience.IsCurrent = dto.IsCurrent;


            await _context.SaveChangesAsync();


            return true;
        }

        public async Task<bool> DeleteExperienceAsync(int id)
        {
            var experience = await _context.Experiences
                .FindAsync(id);


            if (experience == null)
                return false;


            _context.Experiences.Remove(experience);


            await _context.SaveChangesAsync();


            return true;
        }


    }
}