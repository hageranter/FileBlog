using System;
using System.Collections.Generic;
using System.Linq;
using FileBlogApi.Features.Posts;

namespace FileBlogApi.Services;

public class PostDto
{
    public string Id { get; set; } = "";
    public string Slug { get; set; } = "";
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public List<string> Tags { get; set; } = new();
    public List<string> Categories { get; set; } = new();
    public string? FolderName { get; set; }
    public List<string>? AssetFiles { get; set; }
    public DateTime? PublishedDate { get; set; }
    public string Status { get; set; } = "published";
    public DateTime? ScheduledDate { get; set; }
    public string Body { get; set; } = "";

    // Map from your existing Post model
    public static PostDto From(Post p) => new PostDto
    {
        Id = string.IsNullOrWhiteSpace(p.Id) ? p.Slug : p.Id,
        Slug = p.Slug,
        Title = p.Title ?? "",
        Description = p.Description ?? "",
        Tags = p.Tags?.ToList() ?? new(),
        Categories = p.Categories?.ToList() ?? new(),
        FolderName = p.FolderName,
        AssetFiles = p.AssetFiles?.ToList(),
        PublishedDate = p.PublishedDate,
        Status = string.IsNullOrWhiteSpace(p.Status) ? "published" : p.Status,
        ScheduledDate = p.ScheduledDate,
        Body = p.Body ?? ""
    };
}
