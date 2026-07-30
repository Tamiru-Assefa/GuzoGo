using guzogo.DTOs.Experience;
using guzogo.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace guzogo.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ExperienceController : ControllerBase
    {
        private readonly IExperienceService _experienceService;


        public ExperienceController(
            IExperienceService experienceService)
        {
            _experienceService = experienceService;
        }



        // POST: api/Experience/profile/1
        [HttpPost("profile/{profileId}")]
        public async Task<IActionResult> CreateExperience(
            int profileId,
            CreateExperienceDto dto)
        {
            var result = await _experienceService
                .CreateExperienceAsync(profileId, dto);


            return Ok(result);
        }



        // GET: api/Experience/profile/1
        [HttpGet("profile/{profileId}")]
        public async Task<IActionResult> GetProfileExperiences(
            int profileId)
        {
            var result = await _experienceService
                .GetProfileExperiencesAsync(profileId);


            return Ok(result);
        }



        // PUT: api/Experience/1
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateExperience(
            int id,
            CreateExperienceDto dto)
        {
            var result = await _experienceService
                .UpdateExperienceAsync(id, dto);


            if (!result)
                return NotFound("Experience not found.");


            return Ok(new
            {
                message = "Experience updated successfully."
            });
        }



        // DELETE: api/Experience/1
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteExperience(
            int id)
        {
            var result = await _experienceService
                .DeleteExperienceAsync(id);


            if (!result)
                return NotFound("Experience not found.");


            return Ok(new
            {
                message = "Experience deleted successfully."
            });
        }
    }
}