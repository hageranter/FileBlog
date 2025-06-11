using FileBlogApi.Features.Posts;
using FileBlogApi.Features.Users;
using Microsoft.Extensions.FileProviders;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Authorization;
using System.Text;
using System.IO;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddAuthorization();

// Register services
builder.Services.AddSingleton<UserService>();

// JWT Authentication Configuration
var jwtSecret = builder.Configuration["Jwt:Secret"];
var key = Encoding.UTF8.GetBytes(jwtSecret!);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidIssuer = "FileBlogApi",
        ValidAudience = "FileBlogApi",
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
    };
});

var app = builder.Build();
var blogService = new BlogService(builder.Environment.ContentRootPath);

// Middleware
app.UseAuthentication();
app.UseAuthorization();
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(builder.Environment.ContentRootPath, "content")),
    RequestPath = "/content"
});

// Routes

// Protected routes
app.MapGet("/posts", [Authorize(Roles = "Admin")] () => blogService.GetAllPosts());

app.MapPost("/posts/{slug}/upload", [Authorize] async (HttpRequest request, string slug) =>
{
    var form = await request.ReadFormAsync();
    var file = form.Files.GetFile("file");

    if (file == null)
        return Results.BadRequest("No file uploaded");

    var success = blogService.UploadFile(slug, file);
    return success ? Results.Ok("File uploaded") : Results.NotFound("Post not found");
});

// Public routes
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

// Login endpoint
app.MapPost("/login", (LoginRequest loginRequest, UserService userService) =>
{
    var user = userService.GetUser(loginRequest.Username);

    if (user == null || !userService.VerifyPassword(loginRequest.Password, user.PasswordHash))
    {
        return Results.Unauthorized();
    }

    var token = userService.GenerateJwtToken(user);
    return Results.Ok(new { token });
});

// Test endpoint (for debugging)
app.MapGet("/test-login", (UserService userService) =>
{
    var user = userService.GetUser("ahmed");

    if (user == null)
        return Results.NotFound("User not found");

    var ok = userService.VerifyPassword("123456", user.PasswordHash);
    return Results.Ok(ok ? "Password match" : "Wrong password");
});

app.MapGet("/login.html", async context =>
{
    context.Response.ContentType = "text/html";
    await context.Response.SendFileAsync("wwwroot/login.html");
});


app.MapPost("/signup", (SignupRequest request, UserService userService) =>
{
    var existingUser = userService.GetUser(request.Username);
    if (existingUser is not null)
        return Results.BadRequest("Username already exists.");

    userService.CreateUser(request.Username, request.Email, request.Password, request.Role);
    return Results.Ok("User created successfully.");
});


app.Run();
