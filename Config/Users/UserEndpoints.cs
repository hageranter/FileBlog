using System.Text.Json;
using Microsoft.AspNetCore.Authorization;

namespace FileBlogApi.Features.Users;

public static class UserEndpoints
{
    public static void MapUserEndpoints(this WebApplication app)
    {
        // Upload avatar (Authorized)
        app.MapPost("/users/{username}/avatar", [Authorize] async (HttpContext ctx, HttpRequest request, string username, UserService userService) =>
        {
            var tokenUser = ctx.User?.FindFirst("username")?.Value;
            if (string.IsNullOrWhiteSpace(tokenUser))
                return Results.Unauthorized();

            var role = ctx.User?.FindFirst("role")?.Value ?? "";
            if (!string.Equals(tokenUser, username, StringComparison.OrdinalIgnoreCase) &&
                !role.Equals("admin", StringComparison.OrdinalIgnoreCase))
            {
                return Results.Forbid();
            }

            var form = await request.ReadFormAsync();
            var file = form.Files.GetFile("file");
            if (file is null)
                return Results.BadRequest("No file uploaded.");

            var allowedExtensions = new[] { ".png", ".jpg", ".jpeg", ".webp" };
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(ext))
                return Results.BadRequest("Invalid file type. Only PNG, JPG, and WEBP are allowed.");

            if (file.Length > 2 * 1024 * 1024)
                return Results.BadRequest("File too large. Max size is 2MB.");

            // Save under Content/Users so it's served by /userfiles
            var uploadsFolder = Path.Combine("Content", "Users", username);
            Directory.CreateDirectory(uploadsFolder);

            var uniqueName = $"avatar_{DateTime.UtcNow:yyyyMMdd_HHmmssfff}{ext}";
            var filePath = Path.Combine(uploadsFolder, uniqueName);
            using var stream = new FileStream(filePath, FileMode.Create);
            await file.CopyToAsync(stream);

            var avatarUrl = $"/userfiles/{username}/{uniqueName}";

            var user = userService.GetUser(username);
            if (user != null)
            {
                user.AvatarUrl = avatarUrl;
                userService.UpdateUser(user);
            }

            return Results.Ok(new { avatarUrl });
        });

        // Get user profile
        app.MapGet("/users/{username}", (string username) =>
        {
            if (string.IsNullOrWhiteSpace(username))
                return Results.BadRequest("Invalid username.");

            var filePath = Path.Combine("Content", "Users", username, "profile.json");
            if (!File.Exists(filePath))
                return Results.NotFound();

            var json = File.ReadAllText(filePath);
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var user = JsonSerializer.Deserialize<User>(json, options);

            if (user == null)
                return Results.NotFound();

            if (string.IsNullOrEmpty(user.AvatarUrl))
            {
                user.AvatarUrl = "/images/avatar.png";
            }

            return Results.Ok(user);
        });
    }
}
