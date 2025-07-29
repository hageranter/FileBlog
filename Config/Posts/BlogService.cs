using System.Text.RegularExpressions;
using Markdig;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using FileBlogApi.Features.Users;
using System.Text.Json;

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
            var assetFiles = Directory.Exists(assetsPath)
                ? Directory.GetFiles(assetsPath).Select(Path.GetFileName).ToList()
                : new List<string>();

            yield return new Post
            {
                Slug = meta.CustomSlug ?? Path.GetFileName(dir),
                FolderName = Path.GetFileName(dir),
                Title = meta.Title ?? "Untitled",
                Description = meta.Description ?? "",
                PublishedDate = meta.PublishedDate ?? DateTime.MinValue,
                ModifiedDate = meta.ModifiedDate ?? DateTime.MinValue,
                Tags = meta.Tags ?? new(),
                Categories = meta.Categories ?? new(),
                Body = html,
                AssetFiles = assetFiles,
                Username = meta.Username ?? "",
                Status = meta.Status ?? "published",
                ScheduledDate = meta.ScheduledDate,
                Id = Path.GetFileName(dir),
                Likes = meta.Likes,
                SavedBy = meta.SavedBy ?? new()
            };
        }
    }

    public IEnumerable<Post> GetAllPostsAndUpdateStatusIfNeeded()
    {
        foreach (var post in GetAllPosts())
        {
            if (post.Status == "scheduled" && post.ScheduledDate <= DateTime.UtcNow)
            {
                post.Status = "published";
                UpdateMeta(post.FolderName, meta => meta.Status = "published");
            }
            yield return post;
        }
    }

    public IEnumerable<Post> GetPostsByTagAndUpdateStatusIfNeeded(string tag) =>
        GetAllPostsAndUpdateStatusIfNeeded()
            .Where(p => p.Tags.Contains(tag, StringComparer.OrdinalIgnoreCase));

    public IEnumerable<Post> GetPostsByCategoryAndUpdateStatusIfNeeded(string category) =>
        GetAllPostsAndUpdateStatusIfNeeded()
            .Where(p => p.Categories.Contains(category, StringComparer.OrdinalIgnoreCase));

    public Post? GetPostBySlug(string slug)
    {
        var folder = Path.Combine(_root, "content", "posts");
        var dir = Directory.GetDirectories(folder)
    .FirstOrDefault(d =>
        Path.GetFileName(d).EndsWith(slug, StringComparison.OrdinalIgnoreCase) ||
        Path.GetFileName(d).Equals(slug, StringComparison.OrdinalIgnoreCase));

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
        var assetFiles = Directory.Exists(assetsPath)
            ? Directory.GetFiles(assetsPath).Select(Path.GetFileName).ToList()
            : new List<string>();

        return new Post
        {
            Slug = slug,
            FolderName = Path.GetFileName(dir),
            Title = meta.Title ?? "Untitled",
            Description = meta.Description ?? "",
            PublishedDate = meta.PublishedDate ?? DateTime.MinValue,
            ModifiedDate = meta.ModifiedDate ?? DateTime.MinValue,
            Tags = meta.Tags ?? new(),
            Categories = meta.Categories ?? new(),
            Body = html,
            AssetFiles = assetFiles,
            Username = meta.Username ?? "",
            AvatarUrl = $"/userfiles/{meta.Username}/avatar.jpg",// or use latest file logic

            Status = meta.Status ?? "published",
            ScheduledDate = meta.ScheduledDate,
            Likes = meta.Likes,
            LikedBy = meta.LikedBy ?? new(),
            SavedBy = meta.SavedBy ?? new()
        };
    }

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
            ScheduledDate = request.ScheduledDate,
            Likes = request.Likes,
            SavedBy = request.SavedBy

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

        var originalFileName = Path.GetFileName(file.FileName);
        var fileExtension = Path.GetExtension(originalFileName);
        var fileNameWithoutExt = Path.GetFileNameWithoutExtension(originalFileName);

        var originalFilePath = Path.Combine(assetsPath, originalFileName);
        var thumbFileName = $"{fileNameWithoutExt}_thumb{fileExtension}";
        var largeFileName = $"{fileNameWithoutExt}_large{fileExtension}";

        using (var stream = new FileStream(originalFilePath, FileMode.Create))
            file.CopyTo(stream);

        using var inputStream = file.OpenReadStream();
        using var image = Image.Load(inputStream);

        image.Clone(x => x.Resize(new ResizeOptions { Mode = ResizeMode.Max, Size = new Size(300, 0) }))
            .Save(Path.Combine(thumbsPath, thumbFileName));

        image.Clone(x => x.Resize(new ResizeOptions { Mode = ResizeMode.Max, Size = new Size(1200, 0) }))
            .Save(Path.Combine(largePath, largeFileName));

        return true;
    }

    public bool UpdatePostContent(string slug, string newTitle, string newBody)
    {
        var folder = Path.Combine(_root, "content", "posts");
        var dir = Directory.GetDirectories(folder)
            .FirstOrDefault(d => d.EndsWith(slug, StringComparison.OrdinalIgnoreCase));

        if (dir == null)
            return false;

        var metaPath = Path.Combine(dir, "meta.yaml");
        var contentPath = Path.Combine(dir, "content.md");

        if (!File.Exists(metaPath) || !File.Exists(contentPath))
            return false;

        File.WriteAllText(contentPath, newBody);

        var yaml = File.ReadAllText(metaPath);
        var meta = ParseYamlFrontMatter(yaml);
        meta.Title = newTitle;
        meta.ModifiedDate = DateTime.UtcNow;

        var serializer = new SerializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .Build();

        var updatedYaml = serializer.Serialize(meta);
        File.WriteAllText(metaPath, updatedYaml);

        return true;
    }

    public bool DeletePostBySlug(string slug)
    {
        var folder = Path.Combine(_root, "content", "posts");
        var dir = Directory.GetDirectories(folder)
            .FirstOrDefault(d => d.EndsWith(slug, StringComparison.OrdinalIgnoreCase));

        if (dir == null || !Directory.Exists(dir))
            return false;

        try
        {
            Directory.Delete(dir, recursive: true);
            return true;
        }
        catch
        {
            return false;
        }
    }

    public void UpdateScheduledToPublishedIfDue()
    {
        var posts = GetAllPosts()
            .Where(p => p.Status == "scheduled" && p.ScheduledDate <= DateTime.UtcNow)
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
                Status = "published",
                ScheduledDate = post.ScheduledDate,
                Likes = post.Likes,
                SavedBy = post.SavedBy,
                LikedBy = post.LikedBy

            };

            var serializer = new SerializerBuilder()
                .WithNamingConvention(CamelCaseNamingConvention.Instance)
                .Build();

            var yaml = serializer.Serialize(meta);
            File.WriteAllText(metaPath, yaml);
        }
    }

    public void UpdateMeta(string slug, Action<Meta> updateAction)
    {
        var folder = Path.Combine(_root, "content", "posts");
        var dir = Directory.GetDirectories(folder)
            .FirstOrDefault(d => d.EndsWith(slug, StringComparison.OrdinalIgnoreCase));

        if (dir == null) return;

        var metaPath = Path.Combine(dir, "meta.yaml");
        if (!File.Exists(metaPath)) return;

        var yaml = File.ReadAllText(metaPath);
        var meta = ParseYamlFrontMatter(yaml);

        updateAction(meta);

        var serializer = new SerializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .Build();

        File.WriteAllText(metaPath, serializer.Serialize(meta));
    }

    private Meta ParseYamlFrontMatter(string yaml)
    {
        var deserializer = new DeserializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .Build();

        try { return deserializer.Deserialize<Meta>(yaml) ?? new Meta(); }
        catch { return new Meta(); }
    }

    private string ToKebabCase(string text) =>
        Regex.Replace(text.ToLowerInvariant(), @"[^a-z0-9]+", "-").Trim('-');


    public void SavePostMeta(string slug, Meta updatedMeta)
    {
        var folder = Path.Combine(_root, "content", "posts");
        var dir = Directory.GetDirectories(folder)
            .FirstOrDefault(d => d.EndsWith(slug, StringComparison.OrdinalIgnoreCase));

        if (dir == null) return;

        var metaPath = Path.Combine(dir, "meta.yaml");

        var serializer = new SerializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .Build();

        File.WriteAllText(metaPath, serializer.Serialize(updatedMeta));
    }

    public bool ToggleLikePost(string slug, string username)
    {
        var post = GetPostBySlug(slug);
        if (post == null) return false;

        post.LikedBy ??= new List<string>();

        if (post.LikedBy.Contains(username))
        {
            // User wants to dislike
            post.LikedBy.Remove(username);
        }
        else
        {
            // User wants to like
            post.LikedBy.Add(username);
        }

        // ✅ Always derive count from the list
        post.Likes = post.LikedBy.Count;

        UpdateMeta(slug, meta =>
        {
            meta.LikedBy = new List<string>(post.LikedBy);
            meta.Likes = post.Likes;
            meta.ModifiedDate = DateTime.UtcNow;
        });

        return true;
    }

    public bool ToggleSavePost(string slug, string username)
    {
        var post = GetPostBySlug(slug);
        if (post == null) return false;

        var wasSaved = post.SavedBy.Contains(username);

        UpdateMeta(slug, meta =>
        {
            if (wasSaved)
                meta.SavedBy.Remove(username);
            else if (!meta.SavedBy.Contains(username))
                meta.SavedBy.Add(username);
        });

        return !wasSaved;
    }



    public List<Comment> GetComments(string slug)
    {
        var post = GetPostBySlug(slug);
        if (post == null) return new List<Comment>();

        var commentsPath = Path.Combine(_root, "content", "posts", post.FolderName, "comments.json");
        if (!File.Exists(commentsPath)) return new List<Comment>();

        var json = File.ReadAllText(commentsPath);
        return JsonSerializer.Deserialize<List<Comment>>(json) ?? new List<Comment>();
    }

    public void AddComment(string slug, Comment comment)
    {
        var post = GetPostBySlug(slug);
        if (post == null) return;

        // ✅ Set avatar path if available
        var avatarFolder = Path.Combine("wwwroot", "userfiles", comment.Username);
        if (Directory.Exists(avatarFolder))
        {
            var latestAvatar = Directory.GetFiles(avatarFolder, "avatar_*.*")
                .Where(f => f.EndsWith(".png") || f.EndsWith(".jpg") || f.EndsWith(".jpeg") || f.EndsWith(".webp"))
                .OrderByDescending(f => f)
                .FirstOrDefault();

            if (latestAvatar != null)
            {
                comment.AvatarUrl = $"/userfiles/{comment.Username}/{Path.GetFileName(latestAvatar)}";
            }
        }

        // ✅ Comments file path
        var commentsPath = Path.Combine(_root, "content", "posts", post.FolderName, "comments.json");

        // ✅ Load existing or initialize
        var comments = File.Exists(commentsPath)
            ? JsonSerializer.Deserialize<List<Comment>>(File.ReadAllText(commentsPath)) ?? new List<Comment>()
            : new List<Comment>();

        comments.Add(comment);

        // ✅ Save updated list
        var json = JsonSerializer.Serialize(comments, new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(commentsPath, json);
    }
    public class Meta
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
        public int Likes { get; set; } = 0;
        public List<string> SavedBy { get; set; } = new();
        public List<string> LikedBy { get; set; } = new();

    }
}
