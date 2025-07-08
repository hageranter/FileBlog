namespace FileBlogApi.Features.Admin;

using FileBlogApi.Features.Users;
using Microsoft.AspNetCore.Authorization;
using System.Text.Json;

public static class AdminEndpoints
{
    public static void MapAdminEndpoints(this WebApplication app)
    {
        // Serve admin page
        app.MapGet("/admin.html", ctx => ctx.Response.SendFileAsync("wwwroot/admin.html"));

        // ✅ Get all posts by a specific user
        app.MapGet("/admin/users/{username}/posts", [Authorize(Roles = "Admin")] (string username) =>
        {
            var postsDir = Path.Combine("Content", "Posts");
            if (!Directory.Exists(postsDir))
                return Results.Json(new List<object>());

            var posts = new List<Dictionary<string, object>>();

            foreach (var file in Directory.GetFiles(postsDir, "*.json"))
            {
                var json = File.ReadAllText(file);
                Console.WriteLine(json); // Debug log
                var post = JsonSerializer.Deserialize<Dictionary<string, object>>(json);

                if (post != null &&
                    post.TryGetValue("author", out var author) &&
                    author?.ToString()?.ToLower() == username.ToLower())
                {
                    post["id"] = Path.GetFileNameWithoutExtension(file);
                    posts.Add(post);
                }
            }

            return Results.Json(posts);
        });

        // ✅ Delete a post by ID (regardless of user)
        app.MapDelete("/admin/users/{username}/posts/{id}", [Authorize(Roles = "Admin")] (string username, string id) =>
        {
            var filePath = Path.Combine("Content", "Posts", $"{id}.json");

            if (!File.Exists(filePath))
            {
                Console.WriteLine($"⚠️ Failed to find file: {filePath}");
                return Results.NotFound("Post not found");
            }

            File.Delete(filePath);
            return Results.Ok(new { message = "Post deleted" });
        });

        // ✅ List all users
        app.MapGet("/admin/users", [Authorize(Roles = "Admin")] (UserService userService) =>
        {
            var users = userService.GetAllUsers();
            return Results.Json(users);
        });

        // ✅ Change user role
        app.MapPost("/admin/users/{username}/role", [Authorize(Roles = "Admin")] async (
            string username,
            HttpRequest request,
            UserService userService
        ) =>
        {
            var body = await JsonSerializer.DeserializeAsync<Dictionary<string, string>>(request.Body);
            if (body == null || !body.TryGetValue("role", out var newRole))
                return Results.BadRequest("Missing role");

            var user = userService.GetUserByUsername(username);
            if (user == null)
                return Results.NotFound("User not found");

            user.Role = newRole;
            userService.UpdateUser(user);

            return Results.Ok(new { message = "Role updated", newRole });
        });
    }
}
