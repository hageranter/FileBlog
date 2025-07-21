namespace FileBlogApi.Features.Admin;

using FileBlogApi.Features.Users;
using Microsoft.AspNetCore.Authorization;
using System.Text.Json;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

public static class AdminEndpoints
{
    public static void MapAdminEndpoints(this WebApplication app)
    {
        app.MapGet("/admin.html", ctx => ctx.Response.SendFileAsync("wwwroot/admin.html"));

        //  Get all published posts by a user (from meta.yaml)
        app.MapGet("/admin/users/{username}/posts", [Authorize(Roles = "Admin")] (string username) =>
        {
            var deserializer = new DeserializerBuilder()
                .WithNamingConvention(CamelCaseNamingConvention.Instance)
                .Build();

            var postsDir = Path.Combine("Content", "Posts");

            if (!Directory.Exists(postsDir))
                return Results.Json(new List<object>());

            var posts = new List<Dictionary<string, object>>();

            foreach (var dir in Directory.GetDirectories(postsDir))
            {
                var yamlPath = Path.Combine(dir, "meta.yaml");
                if (!File.Exists(yamlPath)) continue;

                try
                {
                    var yaml = File.ReadAllText(yamlPath);
                    var post = deserializer.Deserialize<Dictionary<string, object>>(yaml);

                    var author = post.ContainsKey("username") ? post["username"]?.ToString() : null;
                    var status = post.ContainsKey("status") ? post["status"]?.ToString() : null;

                    if (!string.IsNullOrEmpty(author) &&
                        author.Equals(username, StringComparison.OrdinalIgnoreCase) &&
                        !string.IsNullOrEmpty(status) &&
                        status.Equals("published", StringComparison.OrdinalIgnoreCase))
                    {
                        post["id"] = Path.GetFileName(dir); // folder name as ID
                        posts.Add(post);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"❌ Error reading {yamlPath}: {ex.Message}");
                    continue;
                }
            }

            return Results.Json(posts);
        });

        // Delete post by ID  >it doesn't work yet<
        app.MapDelete("/admin/users/{username}/posts/{id}", [Authorize(Roles = "Admin")] (string username, string id) =>
        {
            var postDir = Path.Combine("Content", "Posts", id);
            if (!Directory.Exists(postDir))
                return Results.NotFound("Post folder not found");

            Directory.Delete(postDir, true);
            return Results.Ok(new { message = "Post deleted" });
        });

        //  Get all users
        app.MapGet("/admin/users", [Authorize(Roles = "Admin")] (UserService userService) =>
        {
            var users = userService.GetAllUsers();
            return Results.Json(users);
        });

        // Update user role
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

 app.MapDelete("/admin/users/{username}", [Authorize(Roles = "Admin")] (string username) =>
{
    // Simulated user list - replace this with your database access (e.g. EF Core)
    var users = new List<User>
    {
        new User { Username = "admin", Email = "admin@gmail.com", Role = "Admin" },
        new User { Username = "john", Email = "john@example.com", Role = "Author" },
        // etc...
    };

    var user = users.FirstOrDefault(u => u.Username == username);
    if (user is null)
    {
        return Results.NotFound(new { error = "User not found" });
    }

    users.Remove(user); // simulate deletion
    return Results.Ok(new { message = $"{username} deleted successfully" });
});


    }
}
