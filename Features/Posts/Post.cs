namespace FileBlogApi.Features.Posts;

public class Post
{
   public string Slug =string.Empty;
    public string FolderName =string.Empty; // The folder name where the post is stored
    public string Title =string.Empty;
    public string Description =string.Empty;
    public DateTime PublishedDate { get; set; }
    public DateTime ModifiedDate { get; set; }
    public List<string> Tags { get; set; } = [];
    public List<string> Categories { get; set; } = [];
    public string Body =string.Empty;
    public List<string> AssetFiles { get; set; } = [];
}
