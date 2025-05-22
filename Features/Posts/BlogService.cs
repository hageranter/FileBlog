using System.Text.RegularExpressions;
using Markdig;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace FileBlogApi.Features.Posts;

public class BlogService
{
    private readonly string _root;

    public BlogService(string root)
    {
        _root = root;
    }

    // جلب كل التدوينات مع تحويل Markdown إلى HTML وقراءة بيانات الصور
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
                AssetFiles = assetFiles
            };
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
            AssetFiles = assetFiles
        };
    }

    // فلترة التدوينات حسب الوسم
    public IEnumerable<Post> GetPostsByTag(string tag) =>
        GetAllPosts().Where(p => p.Tags.Contains(tag, StringComparer.OrdinalIgnoreCase));

    // فلترة التدوينات حسب التصنيف
    public IEnumerable<Post> GetPostsByCategory(string category) =>
        GetAllPosts().Where(p => p.Categories.Contains(category, StringComparer.OrdinalIgnoreCase));

    // حفظ تدوينة جديدة في ملفات منفصلة
    public void SavePost(CreatePostRequest request)
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
            CustomSlug = slug
        };

        var serializer = new SerializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .Build();

        var yaml = serializer.Serialize(meta);
        File.WriteAllText(Path.Combine(postPath, "meta.yaml"), yaml);
        File.WriteAllText(Path.Combine(postPath, "content.md"), request.Body);
    }

    // رفع ملف (صورة أو غيرها) داخل مجلد assets الخاص بالبوست
    public bool UploadFile(string slug, IFormFile file)
    {
        var folder = Path.Combine(_root, "content", "posts");
        var dir = Directory.GetDirectories(folder)
            .FirstOrDefault(d => d.EndsWith(slug, StringComparison.OrdinalIgnoreCase));

        if (dir == null || file == null)
            return false;

        var assetsPath = Path.Combine(dir, "assets");
        Directory.CreateDirectory(assetsPath);

        var safeFileName = Path.GetFileName(file.FileName);
        var filePath = Path.Combine(assetsPath, safeFileName);

        using var stream = new FileStream(filePath, FileMode.Create);
        file.CopyTo(stream);

        return true;
    }

    // تحويل النص إلى kebab-case (لعمل slug URL)
    private string ToKebabCase(string text) =>
        Regex.Replace(text.ToLowerInvariant(), @"[^a-z0-9]+", "-").Trim('-');

    // قراءة بيانات الـ YAML front matter
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

    private class Meta
    {
        public string? Title { get; set; }
        public string? Description { get; set; }
        public DateTime? PublishedDate { get; set; }
        public DateTime? ModifiedDate { get; set; }
        public List<string>? Tags { get; set; }
        public List<string>? Categories { get; set; }
        public string? CustomSlug { get; set; }
    }
}
