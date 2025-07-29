using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FileBlogApi.Features.Posts;

public static class PostEndpoints
{
    public static void MapPostEndpoints(this WebApplication app, BlogService blogService)
    {
        //  Get all published and scheduled posts (excluding drafts)
        app.MapGet("/posts", () =>
        {
            var posts = blogService.GetAllPostsAndUpdateStatusIfNeeded()
                .Where(p => p.Status != "draft");

            return Results.Json(posts);
        });

        //  Get a post by slug
        app.MapGet("/posts/{slug}", (string slug) =>
        {
            var post = blogService.GetPostBySlug(slug);
            return post is null ? Results.NotFound("Post not found") : Results.Json(post);
        });

        //  Get posts by category
        app.MapGet("/posts/categories/{category}", (string category) =>
        {
            var posts = blogService.GetPostsByCategoryAndUpdateStatusIfNeeded(category);
            return posts.Any() ? Results.Json(posts) : Results.NotFound("No posts found for this category");
        });

        //  Get posts by tag
        app.MapGet("/posts/tags/{tag}", (string tag) =>
        {
            var posts = blogService.GetPostsByTagAndUpdateStatusIfNeeded(tag);
            return posts.Any() ? Results.Json(posts) : Results.NotFound("No posts found for this tag");
        });

        // Create a post via JSON
        app.MapPost("/posts", (CreatePostRequest dto) =>
        {
            var folderName = blogService.SavePost(dto);
            return Results.Ok(new { message = "Post created successfully", slug = folderName });
        });

        //  Upload file for an existing post
        app.MapPost("/posts/{slug}/upload", async (HttpRequest request, string slug) =>
        {
            var form = await request.ReadFormAsync();
            var file = form.Files.GetFile("file");

            if (file is null)
                return Results.BadRequest("No file uploaded.");

            var success = blogService.UploadFile(slug, file);
            return success ? Results.Ok("Uploaded successfully") : Results.NotFound("Post not found");
        });

        //  Create post
        app.MapPost("/posts/create/{username}", async (HttpContext context, string username) =>
        {
            var form = await context.Request.ReadFormAsync();
            var files = form.Files;

            var title = form["title"];
            var description = form["description"];
            var body = form["body"];
            var tags = form["tags"];
            var categories = form["categories"];
            var status = form["status"];
            var scheduledDateStr = form["scheduledDate"];

            if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(body))
                return Results.BadRequest("Title and content are required.");

            DateTime? scheduledDate = null;
            if (DateTime.TryParse(scheduledDateStr, out var parsedDate))
                scheduledDate = parsedDate;

            var dto = new CreatePostRequest
            {
                Title = title!,
                Description = description!,
                Body = body!,
                Tags = tags.ToString().Split(',', StringSplitOptions.RemoveEmptyEntries).Select(t => t.Trim()).ToList(),
                Categories = categories.ToString().Split(',', StringSplitOptions.RemoveEmptyEntries).Select(c => c.Trim()).ToList(),
                PublishedDate = DateTime.UtcNow,
                ModifiedDate = DateTime.UtcNow,
                Username = username,
                Status = status,
                ScheduledDate = scheduledDate
            };

            var folderName = blogService.SavePost(dto);

            foreach (var file in files)
            {
                blogService.UploadFile(folderName, file);
            }

            return Results.Ok(new { message = "Post created", slug = folderName });
        });

        //  Get all posts by a user
        app.MapGet("/posts/user/{username}", (string username) =>
        {
            var posts = blogService.GetAllPostsAndUpdateStatusIfNeeded()
                .Where(p => p.Username.Equals(username, StringComparison.OrdinalIgnoreCase));

            return posts.Any() ? Results.Json(posts) : Results.NotFound("No posts found for this user");
        });

        // Get all drafts 
        app.MapGet("/posts/drafts", () =>
        {
            var drafts = blogService.GetAllPostsAndUpdateStatusIfNeeded()
                .Where(p => p.Status == "draft");

            return Results.Json(drafts);
        });

        // Get all scheduled posts
        app.MapGet("/posts/scheduled", () =>
        {
            var scheduled = blogService.GetAllPostsAndUpdateStatusIfNeeded()
                .Where(p => p.Status == "scheduled" && p.ScheduledDate > DateTime.UtcNow);

            return Results.Json(scheduled);
        });

        // save post content after edits
        app.MapPut("/posts/{slug}", (string slug, UpdatePostRequest request, BlogService blogService) =>
        {
            var success = blogService.UpdatePostContent(slug, request.Title, request.Body);
            return success ? Results.Ok("Post updated successfully") : Results.NotFound("Post not found");
        });

        app.MapDelete("/posts/{slug}", (string slug, BlogService blogService) =>
        {
            var success = blogService.DeletePostBySlug(slug);
            return success ? Results.Ok("Post deleted") : Results.NotFound("Post not found");
        });


        // In-memory for quick demo
        Dictionary<string, List<Comment>> Comments = new();
        Dictionary<string, int> PostLikes = new();
        Dictionary<string, HashSet<string>> SavedBy = new();

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

            if (!Comments.ContainsKey(slug))
                Comments[slug] = new List<Comment>();

            Comments[slug].Add(comment);

            return Results.Ok(comment);
        });

        app.MapGet("/posts/{slug}/comments", ([FromRoute] string slug) =>
        {
            return Results.Ok(Comments.ContainsKey(slug) ? Comments[slug] : new List<Comment>());
        });

        app.MapPost("/posts/{slug}/like", (string slug, BlogService blogService) =>
        {
            var post = blogService.GetPostBySlug(slug);
            if (post is null)
                return Results.NotFound("Post not found");

            post.Likes++;
            // Optionally persist to file here if needed
            return Results.Ok(new { likes = post.Likes });
        });


        app.MapPost("/posts/{slug}/save", (string slug, HttpContext ctx, BlogService blogService) =>
        {
            var username = ctx.User?.Identity?.Name ?? "anonymous";
            var post = blogService.GetPostBySlug(slug);
            if (post is null)
                return Results.NotFound();

            if (post.SavedBy.Contains(username))
                post.SavedBy.Remove(username);
            else
                post.SavedBy.Add(username);

            // Respond correctly
            return Results.Ok(new { savedBy = post.SavedBy });
        });



    }
}
