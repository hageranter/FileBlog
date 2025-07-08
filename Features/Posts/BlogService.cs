using System.Text.RegularExpressions;
using Markdig;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Formats.Png;

namespace FileBlogApi.Features.Posts;

public class BlogService
{
    private readonly string _root;

    public BlogService(string root)
    {
        _root = root;
    }

    public IEnumerable<Post> GetAllPosts()
    {
        var folder = Path.Combine(_root, "content", "posts");
        if (!Directory.Exists(folder))
            yield break;

        foreach (var dir in Directory.GetDirectories(folder))
        {
            var metaPath = Path.Combine(dir, "meta.yaml");
            var contentPath = Path.Combine(dir, "content.md");

            if (!File.Exists(metaPath) || !File.Exists(contentPath))
                continue;

            var yaml = File.ReadAllText(metaPath);
            var markdown = File.ReadAllText(contentPath);

            var meta = ParseYamlFrontMatter(yaml);
            var html = Markdown.ToHtml(markdown);

            var assetsPath = Path.Combine(dir, "assets");
            var assetFiles = new List<string>();
            if (Directory.Exists(assetsPath))
            {
                assetFiles = Directory.GetFiles(assetsPath)
                    .Select(f => Path.GetFileName(f))
                    .ToList();
            }

            yield return new Post
            {
                Slug = meta.CustomSlug ?? Path.GetFileName(dir),
                FolderName = Path.GetFileName(dir),
                Title = meta.Title ?? "Untitled",
                Description = meta.Description ?? "",
                PublishedDate = meta.PublishedDate ?? DateTime.MinValue,
                ModifiedDate = meta.ModifiedDate ?? DateTime.MinValue,
                Tags = meta.Tags ?? new List<string>(),
                Categories = meta.Categories ?? new List<string>(),
                Body = html,
                AssetFiles = assetFiles,
                Username = meta.Username ?? "",
                Status = meta.Status ?? "published",
                ScheduledDate = meta.ScheduledDate
            };
        }
    }

    public IEnumerable<Post> GetAllPostsAndUpdateStatusIfNeeded()
    {
        foreach (var post in GetAllPosts())
        {
            if (post.Status == "scheduled" && post.ScheduledDate.HasValue && post.ScheduledDate <= DateTime.UtcNow)
            {
                post.Status = "published";
                UpdatePostStatus(post);
            }
            yield return post;
        }
    }

    public IEnumerable<Post> GetPostsByTagAndUpdateStatusIfNeeded(string tag)
    {
        return GetAllPostsAndUpdateStatusIfNeeded()
            .Where(p => p.Tags.Contains(tag, StringComparer.OrdinalIgnoreCase));
    }

    public IEnumerable<Post> GetPostsByCategoryAndUpdateStatusIfNeeded(string category)
    {
        return GetAllPostsAndUpdateStatusIfNeeded()
            .Where(p => p.Categories.Contains(category, StringComparer.OrdinalIgnoreCase));
    }

    private void UpdatePostStatus(Post post)
    {
        var folder = Path.Combine(_root, "content", "posts", post.FolderName);
        var metaPath = Path.Combine(folder, "meta.yaml");

        if (File.Exists(metaPath))
        {
            var yaml = File.ReadAllText(metaPath);
            var meta = ParseYamlFrontMatter(yaml);
            meta.Status = post.Status;

            var serializer = new SerializerBuilder()
                .WithNamingConvention(CamelCaseNamingConvention.Instance)
                .Build();

            var updatedYaml = serializer.Serialize(meta);
            File.WriteAllText(metaPath, updatedYaml);
        }
    }

    public Post? GetPostBySlug(string slug)
    {
        var folder = Path.Combine(_root, "content", "posts");
        var dir = Directory.GetDirectories(folder)
            .FirstOrDefault(d => d.EndsWith(slug, StringComparison.OrdinalIgnoreCase));

        if (dir == null)
            return null;

        var metaPath = Path.Combine(dir, "meta.yaml");
        var contentPath = Path.Combine(dir, "content.md");

        if (!File.Exists(metaPath) || !File.Exists(contentPath))
            return null;

        var yaml = File.ReadAllText(metaPath);
        var markdown = File.ReadAllText(contentPath);

        var meta = ParseYamlFrontMatter(yaml);
        var html = Markdown.ToHtml(markdown);

        var assetsPath = Path.Combine(dir, "assets");
        var assetFiles = new List<string>();
        if (Directory.Exists(assetsPath))
        {
            assetFiles = Directory.GetFiles(assetsPath)
                .Select(f => Path.GetFileName(f))
                .ToList();
        }

        return new Post
        {
            Slug = slug,
            FolderName = Path.GetFileName(dir),
            Title = meta.Title ?? "Untitled",
            Description = meta.Description ?? "",
            PublishedDate = meta.PublishedDate ?? DateTime.MinValue,
            ModifiedDate = meta.ModifiedDate ?? DateTime.MinValue,
            Tags = meta.Tags ?? new List<string>(),
            Categories = meta.Categories ?? new List<string>(),
            Body = html,
            AssetFiles = assetFiles,
            Username = meta.Username ?? "",
            Status = meta.Status ?? "published",
            ScheduledDate = meta.ScheduledDate
        };
    }

    public IEnumerable<Post> GetPostsByTag(string tag) =>
        GetAllPosts().Where(p => p.Tags.Contains(tag, StringComparer.OrdinalIgnoreCase));

    public IEnumerable<Post> GetPostsByCategory(string category) =>
        GetAllPosts().Where(p => p.Categories.Contains(category, StringComparer.OrdinalIgnoreCase));

    public string SavePost(CreatePostRequest request)
    {
        string slug = string.IsNullOrWhiteSpace(request.CustomSlug)
            ? ToKebabCase(request.Title)
            : ToKebabCase(request.CustomSlug);

        string folderName = $"{request.PublishedDate:yyyy-MM-dd}-{slug}";
        string postPath = Path.Combine(_root, "content", "posts", folderName);
        Directory.CreateDirectory(postPath);

        var meta = new Meta
        {
            Title = request.Title,
            Description = request.Description,
            Tags = request.Tags,
            Categories = request.Categories,
            PublishedDate = request.PublishedDate,
            ModifiedDate = request.ModifiedDate,
            CustomSlug = slug,
            Username = request.Username,
            Status = request.Status,
            ScheduledDate = request.ScheduledDate
        };

        var serializer = new SerializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .Build();

        var yaml = serializer.Serialize(meta);
        File.WriteAllText(Path.Combine(postPath, "meta.yaml"), yaml);
        File.WriteAllText(Path.Combine(postPath, "content.md"), request.Body);

        return folderName;
    }

    public bool UploadFile(string slug, IFormFile file)
    {
        var folder = Path.Combine(_root, "content", "posts");
        var dir = Directory.GetDirectories(folder)
            .FirstOrDefault(d => d.EndsWith(slug, StringComparison.OrdinalIgnoreCase));

        if (dir == null || file == null)
            return false;

        var assetsPath = Path.Combine(dir, "assets");
        var thumbsPath = Path.Combine(assetsPath, "thumbs");
        var largePath = Path.Combine(assetsPath, "large");

        Directory.CreateDirectory(assetsPath);
        Directory.CreateDirectory(thumbsPath);
        Directory.CreateDirectory(largePath);

        var fileName = Path.GetFileName(file.FileName);
        var originalFilePath = Path.Combine(assetsPath, fileName);

        using (var stream = new FileStream(originalFilePath, FileMode.Create))
        {
            file.CopyTo(stream);
        }

        using var inputStream = file.OpenReadStream();
        using var image = Image.Load(inputStream);

        image.Clone(x => x.Resize(new ResizeOptions
        {
            Mode = ResizeMode.Max,
            Size = new Size(300, 0)
        })).Save(Path.Combine(thumbsPath, fileName));

        image.Clone(x => x.Resize(new ResizeOptions
        {
            Mode = ResizeMode.Max,
            Size = new Size(1200, 0)
        })).Save(Path.Combine(largePath, fileName));

        return true;
    }

    private string ToKebabCase(string text) =>
        Regex.Replace(text.ToLowerInvariant(), @"[^a-z0-9]+", "-").Trim('-');

    private Meta ParseYamlFrontMatter(string yaml)
    {
        var deserializer = new DeserializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .Build();

        try
        {
            return deserializer.Deserialize<Meta>(yaml) ?? new Meta();
        }
        catch
        {
            return new Meta();
        }
    }

    public void UpdateScheduledToPublishedIfDue()
    {
        var posts = GetAllPosts()
            .Where(p => p.Status == "scheduled" && p.ScheduledDate.HasValue && p.ScheduledDate <= DateTime.UtcNow)
            .ToList();

        foreach (var post in posts)
        {
            var metaPath = Path.Combine(_root, "content", "posts", post.FolderName, "meta.yaml");

            var meta = new Meta
            {
                Title = post.Title,
                Description = post.Description,
                Tags = post.Tags,
                Categories = post.Categories,
                PublishedDate = post.PublishedDate,
                ModifiedDate = DateTime.UtcNow,
                CustomSlug = post.Slug,
                Username = post.Username,
                Status = "published", // Update status to published
                ScheduledDate = post.ScheduledDate
            };

            var serializer = new SerializerBuilder()
                .WithNamingConvention(CamelCaseNamingConvention.Instance)
                .Build();

            var yaml = serializer.Serialize(meta);
            File.WriteAllText(metaPath, yaml);
        }
    }

    private class Meta
    {
        public string? Title { get; set; }
        public string? Description { get; set; }
        public DateTime? PublishedDate { get; set; }
        public DateTime? ModifiedDate { get; set; }
        public List<string>? Tags { get; set; }
        public List<string>? Categories { get; set; }
        public string? CustomSlug { get; set; }
        public string? Username { get; set; }
        public string? Status { get; set; }
        public DateTime? ScheduledDate { get; set; }
    }
}
