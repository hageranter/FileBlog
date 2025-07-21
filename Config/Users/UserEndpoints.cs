using System.Text.Json;
using Microsoft.AspNetCore.Authorization;

namespace FileBlogApi.Features.Users;

public static class UserEndpoints
{
    public static void MapUserEndpoints(this WebApplication app)
    {
        app.MapPost("/users/{username}/avatar", async (HttpRequest request, string username) =>
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
            return Results.Ok(new { avatarUrl });
        });

        app.MapGet("/users/{username}", (string username) =>
        {
            var filePath = Path.Combine("Content", "Users", username, "profile.json");
            if (!File.Exists(filePath))
                return Results.NotFound();

            var json = File.ReadAllText(filePath);
            var user = JsonSerializer.Deserialize<Dictionary<string, object>>(json);

            var avatarFolder = Path.Combine("wwwroot", "userfiles", username);
            string? avatarUrl = null;

            if (Directory.Exists(avatarFolder))
            {
                var latestAvatar = Directory.GetFiles(avatarFolder, "avatar_*.png")
                                            .OrderByDescending(f => f)
                                            .FirstOrDefault();
                if (latestAvatar != null)
                    avatarUrl = $"/userfiles/{username}/{Path.GetFileName(latestAvatar)}";
            }

            return Results.Json(user);
        });

    }
}
