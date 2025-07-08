using FileBlogApi.Features.Posts;
using FileBlogApi.Features.Users;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json;
using FileBlogApi.Features.Auth;
using FileBlogApi.Features.Admin;




var builder = WebApplication.CreateBuilder(args);

// Services
builder.Services.AddSingleton<UserService>();
builder.Services.AddAuthorization();

var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret is missing from config");

var key = Encoding.UTF8.GetBytes(jwtSecret);

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
        IssuerSigningKey = new SymmetricSecurityKey(key)
    };
});
builder.Services.AddSingleton<BlogService>(new BlogService(builder.Environment.ContentRootPath));

var app = builder.Build();
var blogService = new BlogService(builder.Environment.ContentRootPath);

// Middleware
app.UseAuthentication();
app.UseAuthorization();
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(Path.Combine(builder.Environment.ContentRootPath, "content")),
    RequestPath = "/content"
});
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(Path.Combine(builder.Environment.ContentRootPath, "Content", "Users")),
    RequestPath = "/userfiles"
});


// API Routing
app.MapAuthEndpoints();
app.MapUserEndpoints();
app.MapPostEndpoints(blogService);
app.MapAdminEndpoints();



// HTML Pages
app.MapGet("/login.html", ctx => ctx.Response.SendFileAsync("wwwroot/login.html"));
app.MapGet("/signup.html", ctx => ctx.Response.SendFileAsync("wwwroot/signup.html"));

app.Run();

// DTOs
public record LoginRequest(string Username, string Password);
public record SignupRequest(string Username, string Email, string Password, string Role = "Author");
public record CreatePostRequest(string Title, string Description, string Body, string[] Tags, string[] Categories);
