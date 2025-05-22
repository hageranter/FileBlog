namespace FileBlogApi.Features.Posts;

public static class PostEndpoints
{
    public static void MapPostEndpoints(this WebApplication app, BlogService blogService)
    {
       app.MapPost("/posts", (CreatePostRequest request) =>
{
    blogService.SavePost(request);
    return Results.Ok(new { message = "Post saved!" });
});
    }
}
