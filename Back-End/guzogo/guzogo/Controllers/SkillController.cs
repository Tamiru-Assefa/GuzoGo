using guzogo.DTOs.Skill;
using guzogo.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace guzogo.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SkillController : ControllerBase
    {
        private readonly ISkillService _skillService;

        public SkillController(ISkillService skillService)
        {
            _skillService = skillService;
        }

        // GET: api/Skill
        [HttpGet]
        public async Task<IActionResult> GetAllSkills()
        {
            var skills = await _skillService.GetAllSkillsAsync();

            return Ok(skills);
        }

        // POST: api/Skill/profile/1
        [HttpPost("profile/{profileId}")]
        public async Task<IActionResult> AssignSkills(
            int profileId,
            AssignSkillsDto dto)
        {
            var success = await _skillService.AssignSkillsToProfileAsync(
                profileId,
                dto.SkillIds);

            if (!success)
            {
                return NotFound("Profile not found.");
            }

            return Ok(new
            {
                message = "Skills assigned successfully."
            });
        }

        // GET: api/Skill/profile/1
        [HttpGet("profile/{profileId}")]
        public async Task<IActionResult> GetProfileSkills(int profileId)
        {
            var skills = await _skillService.GetProfileSkillsAsync(profileId);

            return Ok(skills);
        }

        // PUT: api/Skill/profile/1
        [HttpPut("profile/{profileId}")]
        public async Task<IActionResult> UpdateProfileSkills(
            int profileId,
            AssignSkillsDto dto)
        {
            var result = await _skillService.UpdateProfileSkillsAsync(
                profileId,
                dto.SkillIds);

            if (!result)
            {
                return NotFound("Profile not found.");
            }

            return Ok(new
            {
                message = "Profile skills updated successfully."
            });
        }
    }
}