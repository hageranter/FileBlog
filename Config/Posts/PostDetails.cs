using System.Text.Json;
using FileBlogApi.Features.Posts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

public static class PostDetails
{
    public static void MapPostDetails(this WebApplication app, BlogService blogService)
    {
        // ✅ COMMENT: Save comment to file
        app.MapPost("/posts/{slug}/comments", [Authorize] ([FromRoute] string slug, [FromBody] CommentRequest request, HttpContext ctx) =>
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
        app.MapGet("/posts/{slug}/comments", [Authorize] ([FromRoute] string slug, HttpContext ctx) =>
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

        // ✅ LIKE: Toggle like
        app.MapPost("/posts/{slug}/like", [Authorize] (string slug, HttpContext ctx) =>
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
        app.MapPost("/posts/{slug}/save", [Authorize] (string slug, HttpContext ctx) =>
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
    }
}
