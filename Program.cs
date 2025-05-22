using FileBlogApi.Features.Posts;
using Microsoft.Extensions.FileProviders;
using System.IO;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

var blogService = new BlogService(builder.Environment.ContentRootPath);

app.UseDefaultFiles();
app.UseStaticFiles();


app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(builder.Environment.ContentRootPath, "content")),
    RequestPath = "/content"
});


app.MapGet("/posts", () => blogService.GetAllPosts());

app.MapGet("/posts/{slug}", (string slug) =>
{
    var post = blogService.GetPostBySlug(slug);
    return post is not null ? Results.Json(post) : Results.NotFound();
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

app.MapPost("/posts", (CreatePostRequest request) =>
{
    blogService.SavePost(request);
    return Results.Ok(new { message = "Post created successfully." });
});

app.MapPost("/posts/{slug}/upload", async (HttpRequest request, string slug) =>
{
    var form = await request.ReadFormAsync();
    var file = form.Files.GetFile("file");

    if (file == null)
        return Results.BadRequest("No file uploaded");

    var success = blogService.UploadFile(slug, file);
    return success ? Results.Ok("File uploaded") : Results.NotFound("Post not found");
});

app.Run();
