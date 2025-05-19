using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

var blogService = new BlogService(builder.Environment.ContentRootPath);

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/posts", () => blogService.GetAllPosts());
app.MapGet("/posts/{slug}", (string slug) =>
{
    var post = blogService.GetPostBySlug(slug);
    return post is not null ? Results.Json(post) : Results.NotFound();
});
app.Run();
