using System.Text.Json.Serialization;

public class User
{
    [JsonPropertyName("username")]
    public string Username { get; set; } = string.Empty;

    [JsonPropertyName("passwordHash")]
    public string PasswordHash { get; set; } = string.Empty;

    [JsonPropertyName("role")]
    public string Role { get; set; } = "Author";
}
