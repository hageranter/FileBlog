using System.Text.Json;
using FileBlogApi.Features.Posts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

public static class PostDetails
{
    public static void MapPostDetails(this WebApplication app, BlogService blogService)
    {
        // ✅ COMMENT: Save comment to file
        app.MapPost("/posts/{slug}/comments", ([FromRoute] string slug, [FromBody] CommentRequest request, HttpContext ctx) =>
        {
            if (string.IsNullOrWhiteSpace(request.Comment))
                return Results.BadRequest("Comment is required");

            var username = ctx.User?.Identity?.Name ?? "anonymous";

            var comment = new Comment
            {
                Username = username,
                CommentText = request.Comment,
                Date = DateTime.UtcNow,
                AvatarUrl = "/images/avatar.png"
            };

            blogService.AddComment(slug, comment);
            return Results.Ok(comment);
        });

        // ✅ COMMENT: Read from file
        app.MapGet("/posts/{slug}/comments", ([FromRoute] string slug) =>
        {
            var comments = blogService.GetComments(slug);
            return Results.Ok(comments);
        });

        // ✅ LIKE: Toggle like (one per user)
        app.MapPost("/posts/{slug}/like", (string slug, HttpContext ctx) =>
        {
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
        app.MapPost("/posts/{slug}/save", (string slug, HttpContext ctx) =>
        {
            var username = ctx.User?.Identity?.Name;
            if (string.IsNullOrWhiteSpace(username))
                return Results.Unauthorized();

            var saved = blogService.ToggleSavePost(slug, username);
            var post = blogService.GetPostBySlug(slug);

            if (post != null)
            {
                blogService.SavePostMeta(slug, new BlogService.Meta
                {
                    Title = post.Title,
                    Description = post.Description,
                    Tags = post.Tags,
                    Categories = post.Categories,
                    PublishedDate = post.PublishedDate,
                    ModifiedDate = DateTime.UtcNow,
                    CustomSlug = post.Slug,
                    Username = post.Username,
                    Status = post.Status,
                    ScheduledDate = post.ScheduledDate,
                    Likes = post.Likes,
                    SavedBy = post.SavedBy,
                    LikedBy = post.LikedBy
                });
            }

            return Results.Ok(new
            {
                savedBy = post?.SavedBy ?? new List<string>()
            });
        });
    }
}
