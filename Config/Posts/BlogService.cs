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
                Tags = (meta.Tags ?? new())
                    .Where(t => !string.IsNullOrWhiteSpace(t))
                    .Select(t => t.Trim())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList(),
                Categories = (meta.Categories ?? new())
                    .Where(c => !string.IsNullOrWhiteSpace(c))
                    .Select(c => c.Trim())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList(),
                Body = html,
                AssetFiles = assetFiles,
                Username = (meta.Username ?? "").Trim(),
                Status = string.IsNullOrWhiteSpace(meta.Status) ? "published" : meta.Status.Trim(),
                ScheduledDate = meta.ScheduledDate,
                Id = Path.GetFileName(dir),
                Likes = meta.Likes,
                // Normalize SavedBy/LikedBy once so queries never miss because of case/whitespace
                SavedBy = (meta.SavedBy ?? new())
                    .Where(u => !string.IsNullOrWhiteSpace(u))
                    .Select(u => u.Trim())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList(),
                LikedBy = (meta.LikedBy ?? new())
                    .Where(u => !string.IsNullOrWhiteSpace(u))
                    .Select(u => u.Trim())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList()
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

    // ---------- NEW: resolve incoming slug (customSlug OR folderName) ----------
    private string? ResolveDirBySlug(string slug)
    {
        var folder = Path.Combine(_root, "content", "posts");
        if (!Directory.Exists(folder)) return null;

        // 1) direct folder match
        var direct = Path.Combine(folder, slug);
        if (Directory.Exists(direct)) return direct;

        // 2) find by meta.CustomSlug
        foreach (var d in Directory.GetDirectories(folder))
        {
            var metaPath = Path.Combine(d, "meta.yaml");
            if (!File.Exists(metaPath)) continue;

            try
            {
                var yaml = File.ReadAllText(metaPath);
                var meta = ParseYamlFrontMatter(yaml);
                if (!string.IsNullOrWhiteSpace(meta.CustomSlug) &&
                    string.Equals(meta.CustomSlug, slug, StringComparison.OrdinalIgnoreCase))
                {
                    return d;
                }
            }
            catch { /* ignore malformed meta */ }
        }

        return null;
    }

    public Post? GetPostBySlug(string slug)
    {
        var dir = ResolveDirBySlug(slug);
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

        var folderName = Path.GetFileName(dir);
        var effectiveSlug = meta.CustomSlug ?? folderName;

        return new Post
        {
            Slug = effectiveSlug,
            FolderName = folderName,
            Title = meta.Title ?? "Untitled",
            Description = meta.Description ?? "",
            PublishedDate = meta.PublishedDate ?? DateTime.MinValue,
            ModifiedDate = meta.ModifiedDate ?? DateTime.MinValue,
            Tags = meta.Tags ?? new(),
            Categories = meta.Categories ?? new(),
            Body = html,
            AssetFiles = assetFiles,
            Username = meta.Username ?? "",
            AvatarUrl = $"/userfiles/{meta.Username}/avatar.jpg",
            Status = meta.Status ?? "published",
            ScheduledDate = meta.ScheduledDate,
            Likes = meta.Likes,
            LikedBy = meta.LikedBy ?? new(),
            SavedBy = meta.SavedBy ?? new()
        };
    }

    public string SavePost(CreatePostRequest request)
    {
        string originalSlug = string.IsNullOrWhiteSpace(request.CustomSlug)
            ? ToKebabCase(request.Title)
            : ToKebabCase(request.CustomSlug);

        string slug = originalSlug;
        int counter = 1;
        string folderName = $"{request.PublishedDate:yyyy-MM-dd}-{slug}";

        while (Directory.Exists(Path.Combine(_root, "content", "posts", folderName)))
        {
            slug = $"{originalSlug}-{counter++}";
            folderName = $"{request.PublishedDate:yyyy-MM-dd}-{slug}";
        }

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
            SavedBy = request.SavedBy,
            LikedBy = new()
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
        var dir = ResolveDirBySlug(slug);
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
        var dir = ResolveDirBySlug(slug);
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
        var dir = ResolveDirBySlug(slug);
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
                LikedBy = post.LikedBy ?? new()
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
        var dir = ResolveDirBySlug(slug);
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
        Regex.Replace(text.ToLowerInvariant(), @"[^a-z0-9]+", "-", RegexOptions.None, TimeSpan.FromMilliseconds(250)).Trim('-');

    public void SavePostMeta(string slug, Meta updatedMeta)
    {
        var dir = ResolveDirBySlug(slug);
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
            post.LikedBy.Remove(username);
        }
        else
        {
            post.LikedBy.Add(username);
        }

        post.Likes = post.LikedBy.Count;

        // Write by folder to avoid ambiguous slug
        UpdateMeta(post.FolderName, meta =>
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

        // Case-insensitive membership
        bool wasSaved = post.SavedBy.Any(u => string.Equals(u, username, StringComparison.OrdinalIgnoreCase));

        UpdateMeta(post.FolderName, meta =>
        {
            meta.SavedBy ??= new List<string>();
            int idx = meta.SavedBy.FindIndex(u => string.Equals(u, username, StringComparison.OrdinalIgnoreCase));

            if (wasSaved)
            {
                if (idx >= 0) meta.SavedBy.RemoveAt(idx);
            }
            else
            {
                if (idx < 0) meta.SavedBy.Add(username);
            }

            meta.ModifiedDate = DateTime.UtcNow;
        });

        return !wasSaved;
    }

    public List<Comment> GetComments(string slug, string currentUsername)
    {
        var post = GetPostBySlug(slug);
        if (post == null) return new List<Comment>();

        var commentsPath = Path.Combine(_root, "content", "posts", post.FolderName, "comments.json");
        if (!File.Exists(commentsPath)) return new List<Comment>();

        var json = File.ReadAllText(commentsPath);
        var allComments = JsonSerializer.Deserialize<List<Comment>>(json) ?? new List<Comment>();

        return allComments.Where(c =>
            !c.VisibleToAuthorOnly ||
            currentUsername == post.Username ||
            currentUsername == c.Username
        ).ToList();
    }

    public void AddComment(string slug, Comment comment)
    {
        var post = GetPostBySlug(slug);
        if (post == null) return;

        comment.Type = comment.Type?.ToLower() ?? "public";
        comment.VisibleToAuthorOnly = comment.Type == "review";

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

        var commentsPath = Path.Combine(_root, "content", "posts", post.FolderName, "comments.json");
        var comments = File.Exists(commentsPath)
            ? JsonSerializer.Deserialize<List<Comment>>(File.ReadAllText(commentsPath)) ?? new List<Comment>()
            : new List<Comment>();

        comments.Add(comment);

        var json = JsonSerializer.Serialize(comments, new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(commentsPath, json);
    }

    // -------------------- NEW: Update/Publish APIs --------------------

    /// <summary>
    /// Partially update post: title, body, status, publishedDate (if provided).
    /// </summary>
    public Task<Meta> UpdatePostAsync(string slug, UpdatePostRequest req)
    {
        var dir = ResolveDirBySlug(slug) ?? throw new InvalidOperationException("Post not found");
        var metaPath = Path.Combine(dir, "meta.yaml");
        var contentPath = Path.Combine(dir, "content.md");
        if (!File.Exists(metaPath)) throw new InvalidOperationException("Post meta not found");

        var meta = ParseYamlFrontMatter(File.ReadAllText(metaPath));

        if (req.Title != null) meta.Title = req.Title;
        if (req.Body != null) File.WriteAllText(contentPath, req.Body);

        if (!string.IsNullOrWhiteSpace(req.Status))
        {
            meta.Status = req.Status!.Trim().ToLowerInvariant();
            if (meta.Status == "published" && meta.PublishedDate is null)
            {
                meta.PublishedDate = DateTime.UtcNow;
            }
        }

        if (req.PublishedDate.HasValue)
        {
            // keep your DateTime? type: convert from DateTimeOffset
            meta.PublishedDate = req.PublishedDate.Value.UtcDateTime;
        }

        meta.ModifiedDate = DateTime.UtcNow;

        SavePostMetaByPath(metaPath, meta);
        return Task.FromResult(meta);
    }

    /// <summary>
    /// Update only status (and optional publishedDate).
    /// </summary>
    public Task<Meta> UpdatePostStatusAsync(string slug, string status, DateTimeOffset? publishedDate)
    {
        var dir = ResolveDirBySlug(slug) ?? throw new InvalidOperationException("Post not found");
        var metaPath = Path.Combine(dir, "meta.yaml");
        if (!File.Exists(metaPath)) throw new InvalidOperationException("Post meta not found");

        var meta = ParseYamlFrontMatter(File.ReadAllText(metaPath));

        meta.Status = (status ?? "").Trim().ToLowerInvariant();
        if (meta.Status == "published")
        {
            meta.PublishedDate = (publishedDate?.UtcDateTime) ?? meta.PublishedDate ?? DateTime.UtcNow;
        }

        meta.ModifiedDate = DateTime.UtcNow;

        SavePostMetaByPath(metaPath, meta);
        return Task.FromResult(meta);
    }

    /// <summary>
    /// Convenience publish: set status=published and stamp PublishedDate if missing.
    /// </summary>
    public Task<Meta> PublishPostAsync(string slug)
    {
        var dir = ResolveDirBySlug(slug) ?? throw new InvalidOperationException("Post not found");
        var metaPath = Path.Combine(dir, "meta.yaml");
        if (!File.Exists(metaPath)) throw new InvalidOperationException("Post meta not found");

        var meta = ParseYamlFrontMatter(File.ReadAllText(metaPath));

        meta.Status = "published";
        if (meta.PublishedDate is null) meta.PublishedDate = DateTime.UtcNow;
        meta.ModifiedDate = DateTime.UtcNow;

        SavePostMetaByPath(metaPath, meta);
        return Task.FromResult(meta);
    }

    private void SavePostMetaByPath(string metaPath, Meta meta)
    {
        var serializer = new SerializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .Build();
        File.WriteAllText(metaPath, serializer.Serialize(meta));
    }

    // -------------------- Meta DTO --------------------
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
