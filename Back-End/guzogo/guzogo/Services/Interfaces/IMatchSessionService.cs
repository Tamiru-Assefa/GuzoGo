namespace guzogo.Services.Interface
{
    public interface IMatchSessionService
    {
        Task<bool> EndSessionAsync(int sessionId);
    }
}