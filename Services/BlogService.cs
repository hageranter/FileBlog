using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using Markdig;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

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

        foreach (var file in Directory.EnumerateFiles(folder, "*.md"))
        {
            var text = File.ReadAllText(file);
            var sections = Regex.Split(text, @"^\s*---\s*$", RegexOptions.Multiline);

            string yaml = sections.Length > 1 ? sections[1] : "";
            string markdown = sections.Length > 2 ? sections[2] : sections.Last();

            var meta = ParseYamlFrontMatter(yaml);
            var html = Markdown.ToHtml(markdown);

            yield return new Post
            {
                Slug = Path.GetFileNameWithoutExtension(file),
                Title = meta.Title ?? "Untitled",
                Description = meta.Description ?? "",
                PublishedDate = meta.PublishedDate ?? DateTime.MinValue,
                ModifiedDate = meta.ModifiedDate ?? DateTime.MinValue,
                Tags = meta.Tags ?? new List<string>(),
                Categories = meta.Categories ?? new List<string>(),
                Body = html
            };
        }
    }

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



public Post? GetPostBySlug(string slug)
{
    var path = Path.Combine(_root, "content", "posts", slug + ".md");
    if (!File.Exists(path))
        return null;

    var text = File.ReadAllText(path);
    var sections = Regex.Split(text, @"^\s*---\s*$", RegexOptions.Multiline);

    string yaml = sections.Length > 1 ? sections[1] : "";
    string markdown = sections.Length > 2 ? sections[2] : sections.Last();

    var meta = ParseYamlFrontMatter(yaml);
    var html = Markdown.ToHtml(markdown);

    return new Post
    {
        Slug = slug,
        Title = meta.Title ?? "Untitled",
        Description = meta.Description ?? "",
        PublishedDate = meta.PublishedDate ?? DateTime.MinValue,
        ModifiedDate = meta.ModifiedDate ?? DateTime.MinValue,
        Tags = meta.Tags ?? new List<string>(),
        Categories = meta.Categories ?? new List<string>(),
        Body = html
    };
}






    private class Meta
    {
        public string? Title { get; set; }
        public string? Description { get; set; }
        public DateTime? PublishedDate { get; set; }
        public DateTime? ModifiedDate { get; set; }
        public List<string>? Tags { get; set; }
        public List<string>? Categories { get; set; }
    }
}
