namespace FileBlogApi.Features.Posts;

public class Post
{
    public string Slug { get; set; } = "";
    public string FolderName { get; set; } = ""; // Add this property
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public DateTime PublishedDate { get; set; }
    public DateTime ModifiedDate { get; set; }
    public List<string> Tags { get; set; } = new();
    public List<string> Categories { get; set; } = new();
    public string Body { get; set; } = "";
    public List<string> AssetFiles { get; set; } = new();
}
