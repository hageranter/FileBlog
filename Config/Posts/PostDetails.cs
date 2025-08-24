using System.Security.Claims;
using FileBlogApi.Features.Posts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

public static class PostDetails
{
    public static void MapPostDetails(this WebApplication app, BlogService blogService)
    {
        // ---------- Helpers ----------
        static bool IsOwnerOrStaff(HttpContext ctx, string? ownerUsername)
        {
            var user = ctx.User;
            if (user?.Identity?.IsAuthenticated != true) return false;

            // owner
            var name = user.Identity!.Name;
            if (!string.IsNullOrWhiteSpace(name) && !string.IsNullOrWhiteSpace(ownerUsername) &&
                string.Equals(name, ownerUsername, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            // roles (jwt contains "role")
            var role = user.FindFirstValue(ClaimTypes.Role) ?? user.FindFirst("role")?.Value;
            if (role is null) return false;

            return role.Equals("admin", StringComparison.OrdinalIgnoreCase)
                || role.Equals("editor", StringComparison.OrdinalIgnoreCase);
        }

        // ---------- COMMENTS ----------
        // ✅ COMMENT: Save comment to file
        app.MapPost("/api/posts/{slug}/comments",
            [Authorize] ([FromRoute] string slug, [FromBody] CommentRequest request, HttpContext ctx) =>
            {
                if (string.IsNullOrWhiteSpace(slug))
                    return Results.BadRequest("Invalid slug");

                if (string.IsNullOrWhiteSpace(request.Comment))
                    return Results.BadRequest("Comment is required");

                var username = ctx.User?.Identity?.Name ?? "anonymous";

                var comment = new Comment
                {
                    Username = username,
                    CommentText = request.Comment,
                    Date = DateTime.UtcNow,
                    Type = request.Type ?? "public",
                    VisibleToAuthorOnly = request.Type?.ToLower() == "review"
                };

                blogService.AddComment(slug, comment);

                return Results.Ok(comment);
            });

        // ✅ COMMENT: Read from file
        app.MapGet("/api/posts/{slug}/comments",
            [Authorize] ([FromRoute] string slug, HttpContext ctx) =>
            {
                if (string.IsNullOrWhiteSpace(slug))
                    return Results.BadRequest("Invalid slug");

                var currentUser = ctx.User?.Identity?.Name;
                var post = blogService.GetPostBySlug(slug);

                if (post is null)
                    return Results.NotFound("Post not found");

                var comments = blogService.GetComments(slug, currentUser ?? "");

                return Results.Ok(comments);
            });

        // ---------- REACTIONS ----------
        // ✅ LIKE: Toggle like
        app.MapPost("/api/posts/{slug}/like",
            [Authorize] (string slug, HttpContext ctx) =>
            {
                if (string.IsNullOrWhiteSpace(slug))
                    return Results.BadRequest("Invalid slug");

                var username = ctx.User?.Identity?.Name;
                if (string.IsNullOrWhiteSpace(username))
                    return Results.Unauthorized();

                var success = blogService.ToggleLikePost(slug, username);
                if (!success)
                    return Results.NotFound("Post not found");

                var post = blogService.GetPostBySlug(slug);
                return Results.Ok(new
                {
                    likes = post?.Likes ?? 0,
                    likedBy = post?.LikedBy ?? new List<string>()
                });
            });

        // ✅ SAVE: Toggle save
        app.MapPost("/api/posts/{slug}/save",
            [Authorize] (string slug, HttpContext ctx) =>
            {
                if (string.IsNullOrWhiteSpace(slug))
                    return Results.BadRequest("Invalid slug");

                var username = ctx.User?.Identity?.Name;
                if (string.IsNullOrWhiteSpace(username))
                    return Results.Unauthorized();

                var saved = blogService.ToggleSavePost(slug, username);
                var post = blogService.GetPostBySlug(slug);

                return Results.Ok(new
                {
                    savedBy = post?.SavedBy ?? new List<string>()
                });
            });

        // ---------- PUBLISH / UPDATE ----------
        // ✅ PATCH post (title/body/status, etc.)
        app.MapMethods("/api/posts/{slug}", new[] { "PATCH", "PUT" },
            [Authorize] async ([FromRoute] string slug, [FromBody] UpdatePostRequest req, HttpContext ctx) =>
            {
                if (string.IsNullOrWhiteSpace(slug))
                    return Results.BadRequest("Invalid slug");

                var post = blogService.GetPostBySlug(slug);
                if (post is null)
                    return Results.NotFound("Post not found");

                if (!IsOwnerOrStaff(ctx, post.Username))
                    return Results.Forbid();

                // Let the service handle partial updates + meta.yaml persistence.
                var updated = await blogService.UpdatePostAsync(slug, req);
                return Results.Ok(updated);
            });

        // ✅ PATCH status only (e.g., { "status": "published" })
        app.MapPatch("/api/posts/{slug}/status",
            [Authorize] async ([FromRoute] string slug, [FromBody] UpdatePostRequest req, HttpContext ctx) =>
            {
                if (string.IsNullOrWhiteSpace(slug))
                    return Results.BadRequest("Invalid slug");

                if (string.IsNullOrWhiteSpace(req.Status))
                    return Results.BadRequest("Status is required.");

                var post = blogService.GetPostBySlug(slug);
                if (post is null)
                    return Results.NotFound("Post not found");

                if (!IsOwnerOrStaff(ctx, post.Username))
                    return Results.Forbid();

                var updated = await blogService.UpdatePostStatusAsync(slug, req.Status!, req.PublishedDate);
                return Results.Ok(updated);
            });

        // ✅ Dedicated publish action (sets status=published + publishedDate)
        app.MapPost("/api/posts/{slug}/publish",
            [Authorize] async ([FromRoute] string slug, HttpContext ctx) =>
            {
                if (string.IsNullOrWhiteSpace(slug))
                    return Results.BadRequest("Invalid slug");

                var post = blogService.GetPostBySlug(slug);
                if (post is null)
                    return Results.NotFound("Post not found");

                if (!IsOwnerOrStaff(ctx, post.Username))
                    return Results.Forbid();

                var updated = await blogService.PublishPostAsync(slug); // sets status + publishedDate + modifiedDate
                return Results.Ok(updated);
            });
    }
}
