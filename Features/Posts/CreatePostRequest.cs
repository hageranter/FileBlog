namespace FileBlogApi.Features.Posts;

public class CreatePostRequest
{ public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string Body { get; set; } = "";
    public string CustomSlug { get; set; } = "";
    public DateTime PublishedDate { get; set; }
    public DateTime ModifiedDate { get; set; }

    public List<string> Tags { get; set; } = new List<string>();
    public List<string> Categories { get; set; } = new List<string>();
    public List<string> AssetFiles { get; set; } = new List<string>();
    
}
