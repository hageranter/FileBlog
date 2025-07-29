using System.Text.Json;
using Microsoft.AspNetCore.Authorization;

namespace FileBlogApi.Features.Users;

public static class UserEndpoints
{
    public static void MapUserEndpoints(this WebApplication app)
    {
        app.MapPost("/users/{username}/avatar", async (HttpRequest request, string username, UserService userService) =>
{
    var form = await request.ReadFormAsync();
    var file = form.Files.GetFile("file");
    if (file is null) return Results.BadRequest("No file uploaded.");

    var uploadsFolder = Path.Combine("wwwroot", "userfiles", username);
    Directory.CreateDirectory(uploadsFolder);

    var uniqueName = $"avatar_{DateTime.Now:yyyyMMdd_HHmmss}.png";
    var filePath = Path.Combine(uploadsFolder, uniqueName);
    using var stream = new FileStream(filePath, FileMode.Create);
    await file.CopyToAsync(stream);

    var avatarUrl = $"/userfiles/{username}/{uniqueName}";

    // ✅ Update user profile
    var user = userService.GetUser(username);
    if (user != null)
    {
        user.AvatarUrl = avatarUrl;
        userService.UpdateUser(user); // this saves it to profile.json
    }

    return Results.Ok(new { avatarUrl });
});

        app.MapGet("/users/{username}", (string username) =>
        {
            var filePath = Path.Combine("Content", "Users", username, "profile.json");
            if (!File.Exists(filePath))
                return Results.NotFound();

            var json = File.ReadAllText(filePath);
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var user = JsonSerializer.Deserialize<User>(json, options);

            if (user == null)
                return Results.NotFound();

            // Fallback: ensure there's always an avatarUrl for the frontend
            if (string.IsNullOrEmpty(user.AvatarUrl))
            {
                user.AvatarUrl = "/images/avatar.png";
            }

            return Results.Json(user);

        });

    }
}
