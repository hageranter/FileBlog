namespace FileBlogApi.Features.Posts;
public class Post
{
    public string Slug { get; set; } = string.Empty;
    public string FolderName { get; set; } = string.Empty; // The folder name where the post is stored
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime PublishedDate { get; set; }
    public DateTime ModifiedDate { get; set; }
    public List<string> Tags { get; set; } = [];
    public List<string> Categories { get; set; } = [];
    public string Body { get; set; } = string.Empty;
    public List<string> AssetFiles { get; set; } = [];
    public string Username { get; set; } = string.Empty; // The username of the author who created the post
    public string Status { get; set; } = string.Empty;
    public DateTime? ScheduledDate { get; set; }

}