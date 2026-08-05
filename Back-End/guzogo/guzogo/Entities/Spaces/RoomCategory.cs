namespace guzogo.Entities.Spaces
{
    public class RoomCategory
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty; // e.g., "Software Development", "Language Exchange"
        public string Slug { get; set; } = string.Empty; // e.g., "software-dev"
        public string Icon { get; set; } = string.Empty; // Icon identifier for frontend

        public ICollection<Room> Rooms { get; set; } = new List<Room>();
    }
}
