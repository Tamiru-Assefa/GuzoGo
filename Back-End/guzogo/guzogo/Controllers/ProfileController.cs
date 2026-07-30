using guzogo.Data;
using guzogo.DTOs.Profile;
using guzogo.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace guzogo.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProfileController : ControllerBase
    {
        private readonly ApplicationDbContext _context;


        public ProfileController(ApplicationDbContext context)
        {
            _context = context;
        }



        // CREATE PROFILE
        [HttpPost("create")]
        public async Task<IActionResult> CreateProfile(CreateProfileDto dto)
        {

            // Check if user already has profile
            var existingProfile = await _context.Profiles
                .FirstOrDefaultAsync(p => p.UserId == dto.UserId);


            if (existingProfile != null)
            {
                return BadRequest("User already has a profile.");
            }



            // Check profession exists
            //var profession = await _context.ProfessionTitles
            //    .FirstOrDefaultAsync(x => x.Id == dto.ProfessionTitleId);

            var profession = await _context.ProfessionTitles
    .Include(x => x.ProfessionCategory)
    .FirstOrDefaultAsync(x => x.Id == dto.ProfessionTitleId);


            if (profession == null)
            {
                return BadRequest("Profession does not exist.");
            }



            var profile = new Profile
            {
                UserId = dto.UserId,

                FirstName = dto.FirstName,

                LastName = dto.LastName,

                ProfessionTitleId = dto.ProfessionTitleId,

                ExperienceLevel = dto.ExperienceLevel,

                Company = dto.Company,

                Country = dto.Country,

                City = dto.City,

                Bio = dto.Bio,

                LinkedInUrl = dto.LinkedInUrl,

                GitHubUrl = dto.GitHubUrl,

                PortfolioUrl = dto.PortfolioUrl,

                ProfilePictureUrl = dto.ProfilePictureUrl
            };



            _context.Profiles.Add(profile);

            await _context.SaveChangesAsync();

            // Initialize User Presence
            _context.UserPresences.Add(new UserPresence
            {
                UserId = profile.UserId,
                Status = "Offline",
                LastSeen = DateTime.UtcNow
            });

            // Initialize Match Preference
            _context.MatchPreferences.Add(new MatchPreference
            {
                UserId = profile.UserId,
                Goal = "Networking",
                MatchType = "Random",
                IsSearching = false,
                CreatedAt = DateTime.UtcNow
            });

            // Initialize User Statistics
            _context.UserStatistics.Add(new UserStatistic
            {
                UserId = profile.UserId,
                TotalMatches = 0,
                CompletedCalls = 0,
                TotalCallMinutes = 0,
                AverageRating = 0,
                UpdatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();



            //return Ok(profile);
            var response = new ProfileResponseDto
            {
                Id = profile.Id,

                UserId = profile.UserId,

                FirstName = profile.FirstName,

                LastName = profile.LastName,

                ProfessionTitle = profession.Name,

                ProfessionCategory = profession.ProfessionCategory.Name,

                Country = profile.Country,

                City = profile.City,

                Bio = profile.Bio
            };


            return Ok(response);
        }






        // UPDATE PROFILE
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProfile(
            int id,
            UpdateProfileDto dto)
        {

            var profile = await _context.Profiles
                .FirstOrDefaultAsync(p => p.Id == id);



            if (profile == null)
            {
                return NotFound("Profile not found.");
            }



            profile.FirstName = dto.FirstName;

            profile.LastName = dto.LastName;

            profile.ProfessionTitleId = dto.ProfessionTitleId;

            profile.ExperienceLevel = dto.ExperienceLevel;

            profile.Company = dto.Company;

            profile.Country = dto.Country;

            profile.City = dto.City;

            profile.Bio = dto.Bio;

            profile.LinkedInUrl = dto.LinkedInUrl;

            profile.GitHubUrl = dto.GitHubUrl;

            profile.PortfolioUrl = dto.PortfolioUrl;

            profile.ProfilePictureUrl = dto.ProfilePictureUrl;



            await _context.SaveChangesAsync();



            return Ok(profile);
        }

        // GET PROFILE BY USER ID
        
        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetProfileByUserId(int userId)
        {
            var profile = await _context.Profiles
                .Include(p => p.ProfessionTitle)
                    .ThenInclude(pt => pt.ProfessionCategory)
                .FirstOrDefaultAsync(p => p.UserId == userId);


            if (profile == null)
            {
                return NotFound("Profile not found.");
            }


            var response = new ProfileResponseDto
            {
                Id = profile.Id,

                UserId = profile.UserId,

                FirstName = profile.FirstName,

                LastName = profile.LastName,

                ProfessionTitle = profile.ProfessionTitle.Name,

                ProfessionCategory = profile.ProfessionTitle
                                            .ProfessionCategory
                                            .Name,

                Country = profile.Country,

                City = profile.City,

                Bio = profile.Bio
            };


            return Ok(response);
        }

        // GET PUBLIC PROFILE BY PROFILE ID
        [HttpGet("{id}")]
        public async Task<IActionResult> GetPublicProfile(int id)
        {
            var profile = await _context.Profiles
                .Include(p => p.ProfessionTitle)
                .ThenInclude(pt => pt.ProfessionCategory)
                .FirstOrDefaultAsync(p => p.Id == id);


            if (profile == null)
            {
                return NotFound("Profile not found.");
            }


            var response = new PublicProfileDto
            {
                Id = profile.Id,

                FirstName = profile.FirstName,

                LastName = profile.LastName,


                ProfessionTitle = profile.ProfessionTitle.Name,

                ProfessionCategory = profile.ProfessionTitle
                                            .ProfessionCategory
                                            .Name,


                ProfilePictureUrl = profile.ProfilePictureUrl,


                Company = profile.Company,


                Country = profile.Country,

                City = profile.City,


                Bio = profile.Bio,


                LinkedInUrl = profile.LinkedInUrl,

                GitHubUrl = profile.GitHubUrl,

                PortfolioUrl = profile.PortfolioUrl,


                ExperienceLevel = (int)profile.ExperienceLevel
            };


            return Ok(response);
        }

        // GET ALL PROFILES
        [HttpGet]
        public async Task<IActionResult> GetAllProfiles(
    int page = 1,
    int pageSize = 10,
    string? category = null,
    string? country = null)
        {
            var query = _context.Profiles
                .Include(p => p.ProfessionTitle)
                .ThenInclude(pt => pt.ProfessionCategory)
                .AsQueryable();


            // Filter by category
            if (!string.IsNullOrEmpty(category))
            {
                query = query.Where(p =>
                    p.ProfessionTitle.ProfessionCategory.Name
                    == category);
            }


            // Filter by country
            if (!string.IsNullOrEmpty(country))
            {
                query = query.Where(p =>
                    p.Country == country);
            }


            var totalCount = await query.CountAsync();


            var profiles = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();



            var result = profiles.Select(profile => new ProfileCardDto
            {
                Id = profile.Id,

                FirstName = profile.FirstName,

                LastName = profile.LastName,


                ProfessionTitle =
                    profile.ProfessionTitle.Name,


                ProfessionCategory =
                    profile.ProfessionTitle
                    .ProfessionCategory.Name,


                ProfilePictureUrl =
                    profile.ProfilePictureUrl,


                Country =
                    profile.Country,


                City =
                    profile.City,


                ExperienceLevel =
                    (int)profile.ExperienceLevel
            });



            return Ok(new ProfileListResponseDto
            {
                TotalCount = totalCount,

                Page = page,

                PageSize = pageSize,

                Profiles = result.ToList()
            });
        }

    }
}