using FileBlogApi.Features.Posts;
using FileBlogApi.Features.Users;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// 1. Register services
builder.Services.AddSingleton<UserService>();

// 2. Add Authorization
builder.Services.AddAuthorization();

// 3. Configure JWT Authentication
var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret is missing from configuration");

var key = Encoding.UTF8.GetBytes(jwtSecret);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme    = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken            = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer           = true,
        ValidateAudience         = true,
        ValidIssuer              = "FileBlogApi",
        ValidAudience            = "FileBlogApi",
        ValidateIssuerSigningKey = true,
        IssuerSigningKey         = new SymmetricSecurityKey(key)
    };
});

var app = builder.Build();
var blogService = new BlogService(builder.Environment.ContentRootPath);

// 4. Middleware
app.UseAuthentication();
app.UseAuthorization();

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(Path.Combine(builder.Environment.ContentRootPath, "content")),
    RequestPath = "/content"
});

// 5. API Endpoints

// PUBLIC ROUTES
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

// PROTECTED ROUTES
app.MapPost("/posts/{slug}/upload", async (HttpRequest request, string slug) =>
{
    var form = await request.ReadFormAsync();
    var file = form.Files.GetFile("file");
    if (file is null) return Results.BadRequest("No file uploaded.");

    var success = blogService.UploadFile(slug, file);
    return success ? Results.Ok("Uploaded") : Results.NotFound("Post not found");
});

app.MapPost("/posts", (CreatePostRequest dto) =>
{
    blogService.SavePost(dto);
    return Results.Ok(new { message = "Post created successfully" });
});

// AUTH ROUTES
app.MapPost("/login", (LoginRequest dto, UserService userService) =>
{
    var user = userService.GetUser(dto.Username);
    if (user is null || !userService.VerifyPassword(dto.Password, user.PasswordHash))
        return Results.Unauthorized();

    var token = userService.GenerateJwtToken(user);
    return Results.Ok(new { token });
});

app.MapPost("/signup", (SignupRequest dto, UserService userService) =>
{
    if (userService.GetUser(dto.Username) is not null)
        return Results.BadRequest("Username already exists.");

    userService.CreateUser(dto.Username, dto.Email, dto.Password, dto.Role);
    return Results.Ok("User created successfully.");
});

// Upload user avatar
app.MapPost("/users/{username}/avatar", async (HttpRequest request, string username) =>
{
    var form = await request.ReadFormAsync();
    var file = form.Files.GetFile("file");

    if (file is null) return Results.BadRequest("No file uploaded.");

    var avatarPath = Path.Combine("Content", "Users", username, "avatar.png");
    Directory.CreateDirectory(Path.GetDirectoryName(avatarPath)!);

    using var stream = new FileStream(avatarPath, FileMode.Create);
    await file.CopyToAsync(stream);

    return Results.Ok("Avatar uploaded");
});

// Get user profile info
app.MapGet("/users/{username}", (string username) =>
{
    var filePath = Path.Combine("Content", "Users", username, "profile.json");

    if (!File.Exists(filePath))
        return Results.NotFound();

    var json = File.ReadAllText(filePath);
    return Results.Content(json, "application/json");
});

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(builder.Environment.ContentRootPath, "Content", "Users")),
    RequestPath = "/userfiles"
});

// STATIC HTML PAGES
app.MapGet("/login.html",  ctx => ctx.Response.SendFileAsync("wwwroot/login.html"));
app.MapGet("/signup.html", ctx => ctx.Response.SendFileAsync("wwwroot/signup.html"));

// START THE APP
app.Run();

// DTOs
public record LoginRequest(string Username, string Password);
public record SignupRequest(string Username, string Email, string Password, string Role = "Author");
