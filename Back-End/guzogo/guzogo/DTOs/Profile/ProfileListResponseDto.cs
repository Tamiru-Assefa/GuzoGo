namespace guzogo.DTOs.Profile
{

    //THIS IS FOR EXPORTING PROFILE DATA TO FRONTEND WITH FILTERING AND PAGINATION,
    public class ProfileListResponseDto
    {
        public int TotalCount { get; set; }

        public int Page { get; set; }

        public int PageSize { get; set; }

        public List<ProfileCardDto> Profiles { get; set; } = new();
    }
}