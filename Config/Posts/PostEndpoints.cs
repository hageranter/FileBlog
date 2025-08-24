using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
       using System.Security.Claims;

namespace FileBlogApi.Features.Posts;

public static class PostEndpoints
{
    public static void MapPostEndpoints(this WebApplication app, BlogService blogService)
    {
        // List posts (exclude drafts)
        app.MapGet("/api/posts", () =>
        {
            var posts = blogService.GetAllPostsAndUpdateStatusIfNeeded()
                .Where(p => p.Status != "draft");
            return Results.Ok(posts);
        });

        // Get one post by slug
        app.MapGet("/api/posts/{slug}", (string slug) =>
        {
            if (string.IsNullOrWhiteSpace(slug)) return Results.BadRequest("Invalid slug.");
            var post = blogService.GetPostBySlug(slug);
            return post is null ? Results.NotFound("Post not found") : Results.Ok(post);
        });

        // By category
        app.MapGet("/api/posts/categories/{category}", (string category) =>
        {
            if (string.IsNullOrWhiteSpace(category)) return Results.BadRequest("Invalid category.");
            var posts = blogService.GetPostsByCategoryAndUpdateStatusIfNeeded(category);
            return posts.Any() ? Results.Ok(posts) : Results.NotFound("No posts found for this category");
        });

        // By tag
        app.MapGet("/api/posts/tags/{tag}", (string tag) =>
        {
            if (string.IsNullOrWhiteSpace(tag)) return Results.BadRequest("Invalid tag.");
            var posts = blogService.GetPostsByTagAndUpdateStatusIfNeeded(tag);
            return posts.Any() ? Results.Ok(posts) : Results.NotFound("No posts found for this tag");
        });

        // Create via JSON
        app.MapPost("/api/posts", [Authorize] (HttpContext ctx, CreatePostRequest dto) =>
        {
            var tokenUser = ctx.User?.FindFirst("username")?.Value;
            if (string.IsNullOrWhiteSpace(tokenUser)) return Results.Unauthorized();

            dto.Username = tokenUser;
            dto.PublishedDate = dto.PublishedDate == default ? DateTime.UtcNow : dto.PublishedDate;
            dto.ModifiedDate = DateTime.UtcNow;

            var folderName = blogService.SavePost(dto);
            return Results.Ok(new { message = "Post created successfully", slug = folderName, api = $"/api/posts/{folderName}" });
        }).RequireAuthorization();

        // Upload file
        app.MapPost("/api/posts/{slug}/upload", [Authorize] async (HttpRequest request, string slug) =>
        {
            if (string.IsNullOrWhiteSpace(slug)) return Results.BadRequest("Invalid slug.");
            var form = await request.ReadFormAsync();
            var file = form.Files.GetFile("file");
            if (file is null) return Results.BadRequest("No file uploaded.");

            var ok = blogService.UploadFile(slug, file);
            return ok ? Results.Ok("Uploaded successfully") : Results.NotFound("Post not found");
        }).RequireAuthorization();

        // Create from form
        app.MapPost("/api/posts/create/{username}", [Authorize] async (HttpContext context, string username) =>
        {
            var tokenUser = context.User?.FindFirst("username")?.Value;
            if (string.IsNullOrWhiteSpace(tokenUser)) return Results.Unauthorized();
            if (!string.Equals(username, tokenUser, StringComparison.OrdinalIgnoreCase)) return Results.Forbid();

            var form = await context.Request.ReadFormAsync();
            var files = form.Files;

            var title = form["title"].ToString();
            var description = form["description"].ToString();
            var body = form["body"].ToString();
            var tags = form["tags"];
            var categories = form["categories"];
            var status = form["status"].ToString();
            var scheduledDateStr = form["scheduledDate"].ToString();

            if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(body))
                return Results.BadRequest("Title and content are required.");

            DateTime? scheduledDate = null;
            if (DateTime.TryParse(scheduledDateStr, out var parsed)) scheduledDate = parsed;

            var dto = new CreatePostRequest
            {
                Title = title,
                Description = description,
                Body = body,
                Tags = tags.ToString()
                    .Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(t => t.Trim())
                    .ToList(),
                Categories = categories.ToString()
                    .Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(c => c.Trim())
                    .ToList(),
                PublishedDate = DateTime.UtcNow,
                ModifiedDate = DateTime.UtcNow,
                Username = tokenUser,
                Status = status,
                ScheduledDate = scheduledDate
            };

            var folderName = blogService.SavePost(dto);
            foreach (var file in files) blogService.UploadFile(folderName, file);

            return Results.Ok(new { message = "Post created", slug = folderName, api = $"/api/posts/{folderName}" });
        }).RequireAuthorization();

        // User posts
        app.MapGet("/api/posts/user/{username}", (string username) =>
        {
            if (string.IsNullOrWhiteSpace(username)) return Results.BadRequest("Invalid username.");
            var posts = blogService.GetAllPostsAndUpdateStatusIfNeeded()
                .Where(p => p.Username.Equals(username, StringComparison.OrdinalIgnoreCase));
            return posts.Any() ? Results.Ok(posts) : Results.NotFound("No posts found for this user");
        });

        // Drafts (current user)
        app.MapGet("/api/posts/drafts", [Authorize] (HttpContext ctx) =>
        {
            var username = ctx.User?.FindFirst("username")?.Value;
            if (string.IsNullOrWhiteSpace(username)) return Results.Unauthorized();

            var drafts = blogService.GetAllPostsAndUpdateStatusIfNeeded()
                .Where(p => p.Status == "draft" && p.Username.Equals(username, StringComparison.OrdinalIgnoreCase));
            return Results.Ok(drafts);
        }).RequireAuthorization();

        // Scheduled (admin)
        app.MapGet("/api/posts/scheduled", [Authorize] (HttpContext ctx) =>
        {
            var role = ctx.User?.FindFirst("role")?.Value ?? "";
            var isAdmin = role.Equals("admin", StringComparison.OrdinalIgnoreCase);
            if (!isAdmin) return Results.Forbid();

            var scheduled = blogService.GetAllPostsAndUpdateStatusIfNeeded()
                .Where(p => p.Status == "scheduled" && p.ScheduledDate > DateTime.UtcNow);
            return Results.Ok(scheduled);
        }).RequireAuthorization();

        // Update
        app.MapPut("/api/posts/{slug}", [Authorize] (string slug, UpdatePostRequest request) =>
        {
            if (string.IsNullOrWhiteSpace(slug)) return Results.BadRequest("Invalid slug.");
            var ok = blogService.UpdatePostContent(slug, request.Title, request.Body);
            return ok ? Results.Ok("Post updated successfully") : Results.NotFound("Post not found");
        }).RequireAuthorization();

        // Delete
        app.MapDelete("/api/posts/{slug}", [Authorize] (string slug) =>
        {
            if (string.IsNullOrWhiteSpace(slug)) return Results.BadRequest("Invalid slug.");
            var ok = blogService.DeletePostBySlug(slug);
            return ok ? Results.Ok("Post deleted") : Results.NotFound("Post not found");
        }).RequireAuthorization();

        // Saved by current user
// ...

// Saved by current user
app.MapGet("/api/posts/saved", [Authorize] (HttpContext ctx) =>
{
    // accept username from multiple places to be safe
    var username =
        ctx.User?.FindFirst("username")?.Value
        ?? ctx.User?.FindFirst(ClaimTypes.Name)?.Value
        ?? ctx.User?.Identity?.Name;

    if (string.IsNullOrWhiteSpace(username)) return Results.Unauthorized();

    username = username.Trim();

    var posts = blogService.GetAllPostsAndUpdateStatusIfNeeded()
        .Where(p => (p.SavedBy ?? new List<string>())
            .Any(u => string.Equals(u, username, StringComparison.OrdinalIgnoreCase)));

    // Always 200 with an array (possibly empty) — easier for clients
    return Results.Ok(posts);
}).RequireAuthorization();

    }
}
