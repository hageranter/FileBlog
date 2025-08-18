using FileBlogApi.Features.Posts;
using FileBlogApi.Features.Users;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using FileBlogApi.Features.Auth;
using FileBlogApi.Features.Admin;
using FileBlogApi.Features.Contact;

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

builder.Services.AddSingleton(new BlogService(builder.Environment.ContentRootPath));

var origins = new[] {
  "https://file-blog-alpha.vercel.app",
  "https://file-blog-*.vercel.app"
};
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
  p.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));
var app = builder.Build();
app.UseCors();




var blogService = new BlogService(builder.Environment.ContentRootPath);

// Middleware
app.UseAuthentication();
app.UseAuthorization();
app.UseDefaultFiles();

// Redirect *.html -> clean URL
app.Use(async (ctx, next) =>
{
    var path = ctx.Request.Path.Value ?? "";
    if (path.EndsWith(".html", StringComparison.OrdinalIgnoreCase))
    {
        var target = path[..^5];
        ctx.Response.Redirect(target + ctx.Request.QueryString, permanent: true);
        return;
    }
    await next();
});

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

// API / feature endpoints
app.MapAuthEndpoints();
app.MapUserEndpoints();
app.MapPostEndpoints(blogService);   // <-- contains the ONLY /posts GET
app.MapAdminEndpoints();
app.MapPostDetails(blogService);
app.MapContactEndpoints();

// Clean URLs for specific pages
app.MapGet("/login", ctx => ctx.Response.SendFileAsync("wwwroot/login.html"));
app.MapGet("/signup", ctx => ctx.Response.SendFileAsync("wwwroot/signup.html"));
// Single post page
app.MapGet("/post/{slug}", ctx =>
    ctx.Response.SendFileAsync(Path.Combine(app.Environment.ContentRootPath, "wwwroot", "postDetail.html")));

// Safe fallback (no crash if 404.html missing)
app.MapFallback(async ctx =>
{
    var path = (ctx.Request.Path.Value ?? "").Trim('/');
    if (string.IsNullOrEmpty(path)) path = "index";

    var requested = Path.Combine(app.Environment.ContentRootPath, "wwwroot", $"{path}.html");
    if (File.Exists(requested))
    {
        await ctx.Response.SendFileAsync(requested);
        return;
    }

    var notFound = Path.Combine(app.Environment.ContentRootPath, "wwwroot", "404.html");
    if (File.Exists(notFound))
    {
        await ctx.Response.SendFileAsync(notFound);
        return;
    }

    ctx.Response.StatusCode = StatusCodes.Status404NotFound;
    await ctx.Response.WriteAsync("404 Not Found");
});

app.Run();

// DTOs
public record LoginRequest(string Username, string Password);
public record SignupRequest(string Username, string Email, string Password, string Role = "Author");
public record CreatePostRequest(string Title, string Description, string Body, string[] Tags, string[] Categories);
