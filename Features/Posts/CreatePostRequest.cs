namespace FileBlogApi.Features.Posts;

public class CreatePostRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string CustomSlug { get; set; } = string.Empty;
    public DateTime PublishedDate { get; set; }
    public DateTime ModifiedDate { get; set; }

    public List<string> Tags { get; set; } = [];
    public List<string> Categories { get; set; } = [];
    public List<string> AssetFiles { get; set; } = [];
    public string Username { get; set; } = string.Empty;


}
