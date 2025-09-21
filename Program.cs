using FileBlogApi.Features.Posts;
using System.Linq; 
using System.Reflection;
using FileBlogApi.Features.Posts;

using FileBlogApi.Features.Users;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using FileBlogApi.Features.Auth;
using FileBlogApi.Features.Admin;
using FileBlogApi.Features.Contact;
using Microsoft.AspNetCore.StaticFiles;
using FileBlogApi.Services;
using System.Reflection;

var builder = WebApplication.CreateBuilder(args);

// Services
builder.Services.AddSingleton<UserService>();
builder.Services.AddAuthorization();

// JWT
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
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

// BlogService (single instance via DI)
builder.Services.AddSingleton<BlogService>(sp =>
    new BlogService(builder.Environment.ContentRootPath));

// CORS
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.SetIsOriginAllowed(origin =>
    {
        try
        {
            var host = new Uri(origin).Host;
            return host.Equals("file-blog-alpha.vercel.app", StringComparison.OrdinalIgnoreCase)
                   || (host.StartsWith("file-blog-", StringComparison.OrdinalIgnoreCase)
                       && host.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase));
        }
        catch { return false; }
    })
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()
));

// Lucene search service
builder.Services.AddSingleton<IPostSearchService, LucenePostSearchService>();

var app = builder.Build();

app.UseCors();
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

// Static files
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

// Pretty routes map
var pretty = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
{
    ["saved-posts"] = "savedPosts.html",
    ["draft-posts"] = "draftPosts.html",
    ["explore-posts"] = "posts.html",
    ["contact-us"] = "contactUs.html",
    ["sign-up"] = "signup.html",
    ["create-posts"] = "createPosts.html",
};

foreach (var kv in pretty)
{
    var requestPath = "/" + kv.Key.Trim('/');
    var filePath = kv.Value.TrimStart('/');

    app.MapGet(requestPath, async (HttpContext ctx, IWebHostEnvironment env) =>
    {
        var full = Path.Combine(env.WebRootPath, filePath);
        if (!System.IO.File.Exists(full))
        {
            ctx.Response.StatusCode = 404;
            await ctx.Response.WriteAsync("Not Found");
            return;
        }
        await ctx.Response.SendFileAsync(full);
    });
}

// Redirect camelCase paths (without .html) → kebab
foreach (var kv in pretty)
{
    var kebab = "/" + kv.Key.Trim('/');
    var camelNoExt = "/" + Path.GetFileNameWithoutExtension(kv.Value);
    app.MapGet(camelNoExt, () => Results.Redirect(kebab, permanent: true));
}

// Fix tag 404s
app.MapGet("/posts/tag/{tag}", (string tag) =>
    Results.Redirect($"/posts?tag={Uri.EscapeDataString(tag)}"));

// Generic kebab route: /pages/{slug} -> {slugCamel}.html
static string KebabToCamel(string slug)
{
    var parts = slug.Split('-', StringSplitOptions.RemoveEmptyEntries);
    if (parts.Length == 0) return slug;
    var first = parts[0];
    var rest = string.Concat(parts.Skip(1).Select(p => char.ToUpperInvariant(p[0]) + p.Substring(1)));
    return first + rest;
}
app.MapGet("/pages/{slug}", async (string slug, HttpContext ctx, IWebHostEnvironment env) =>
{
    var camel = KebabToCamel(slug) + ".html";
    var full = Path.Combine(env.WebRootPath, camel);
    if (!System.IO.File.Exists(full))
    {
        ctx.Response.StatusCode = 404;
        await ctx.Response.WriteAsync("Not Found");
        return;
    }
    await ctx.Response.SendFileAsync(full);
});

// Resolve services
var blogService = app.Services.GetRequiredService<BlogService>();
var searchService = app.Services.GetRequiredService<IPostSearchService>();

// --- Search Endpoints (Lucene) ---
app.MapGet("/api/search", async (HttpContext ctx, string? q, int? take) =>
{
    var query = q ?? string.Empty;
    var limit = Math.Clamp(take ?? 20, 1, 100);
    var results = await searchService.SearchAsync(query, limit);
    return Results.Ok(results);
});

app.MapGet("/api/search/suggest", async (string? q, int? limit) =>
{
    var prefix = q ?? string.Empty;
    var top = Math.Clamp(limit ?? 8, 1, 20);
    var items = await searchService.SuggestAsync(prefix, top);
    return Results.Ok(items.Select(t => new { text = t.text, type = t.type }));
});

// Existing endpoints
app.MapAuthEndpoints();
app.MapUserEndpoints();
app.MapPostEndpoints(blogService);
app.MapAdminEndpoints();
app.MapPostDetails(blogService);
app.MapContactEndpoints();

// Single post page
app.MapGet("/post/{slug}", ctx =>
    ctx.Response.SendFileAsync(Path.Combine(app.Environment.ContentRootPath, "wwwroot", "postDetail.html")));

// Fallback
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






// --- Build Lucene index at startup ---
app.Lifetime.ApplicationStarted.Register(() =>
{
    var all = blogService.GetAllPosts();  // your real method
    var dtos = all.Select(PostDto.From).ToList();
    searchService.RebuildAsync(dtos);     // fire-and-forget is fine here
    Console.WriteLine($"Lucene index built: {dtos.Count} posts.");
});

app.Run();


static async Task<IEnumerable<Post>> TryGetAllPosts(BlogService blogService)
{
    // Try async names first
    foreach (var name in new[] { "GetAllPostsAsync", "GetPostsAsync", "ListPostsAsync" })
    {
        var m = blogService.GetType().GetMethod(name, BindingFlags.Instance | BindingFlags.Public);
        if (m != null)
        {
            var task = (Task)m.Invoke(blogService, null)!;
            await task.ConfigureAwait(false);
            var resultProp = task.GetType().GetProperty("Result");
            var result = resultProp?.GetValue(task) as IEnumerable<Post>;
            if (result != null) return result;
        }
    }

    // Then sync names
    foreach (var name in new[] { "GetAllPosts", "GetPosts", "ListPosts" })
    {
        var m = blogService.GetType().GetMethod(name, BindingFlags.Instance | BindingFlags.Public);
        if (m != null)
        {
            var result = m.Invoke(blogService, null) as IEnumerable<Post>;
            if (result != null) return result;
        }
    }

    // Fallback: empty (so endpoint still succeeds)
    return Array.Empty<Post>();
}
