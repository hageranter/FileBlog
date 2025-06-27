using System.Text.Json;

namespace FileBlogApi.Features.Posts;

public static class PostEndpoints
{
    public static void MapPostEndpoints(this WebApplication app, BlogService blogService)
    {
        app.MapGet("/posts", () => Results.Json(blogService.GetAllPosts()));

        app.MapGet("/posts/{slug}", (string slug) =>
        {
            var post = blogService.GetPostBySlug(slug);
            return post is null ? Results.NotFound() : Results.Json(post);
        });

        app.MapGet("/posts/categories/{category}", (string category) =>
        {
            var posts = blogService.GetPostsByCategory(category);
            return posts.Any() ? Results.Json(posts) : Results.NotFound();
        });

        app.MapGet("/posts/tags/{tag}", (string tag) =>
        {
            var posts = blogService.GetPostsByTag(tag);
            return posts.Any() ? Results.Json(posts) : Results.NotFound();
        });

        app.MapPost("/posts", (CreatePostRequest dto) =>
        {
            blogService.SavePost(dto);
            return Results.Ok(new { message = "Post created successfully" });
        });

        app.MapPost("/posts/{slug}/upload", async (HttpRequest request, string slug) =>
        {
            var form = await request.ReadFormAsync();
            var file = form.Files.GetFile("file");
            if (file is null) return Results.BadRequest("No file uploaded.");

            var success = blogService.UploadFile(slug, file);
            return success ? Results.Ok("Uploaded") : Results.NotFound("Post not found");
        });

        app.MapPost("/posts/create/{username}", async (HttpContext context, string username) =>
        {
            var blogService = context.RequestServices.GetRequiredService<BlogService>();
            var form = await context.Request.ReadFormAsync();

            var files = form.Files;

            var title = form["title"];
            var description = form["description"];
            var body = form["body"];
            var tags = form["tags"];
            var categories = form["categories"];

            if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(body))
                return Results.BadRequest("Title and content are required.");

            var dto = new CreatePostRequest
            {
                Title = title!,
                Description = description!,
                Body = body!,
                Tags = tags.ToString().Split(',', StringSplitOptions.RemoveEmptyEntries).Select(t => t.Trim()).ToList(),
                Categories = categories.ToString().Split(',', StringSplitOptions.RemoveEmptyEntries).Select(c => c.Trim()).ToList(),
                PublishedDate = DateTime.UtcNow,
                ModifiedDate = DateTime.UtcNow,
                Username = username

            };

            var folderName = blogService.SavePost(dto);

            foreach (var file in files)
            {
                blogService.UploadFile(folderName, file);
            }

            return Results.Ok(new { message = "Post created", slug = folderName });
        });

    app.MapGet("/posts/user/{username}", (string username) =>
   {    
    var posts = blogService.GetAllPosts()
                           .Where(p => p.Username.Equals(username, StringComparison.OrdinalIgnoreCase));
    return posts.Any() ? Results.Json(posts) : Results.NotFound();
 });


    }
}
