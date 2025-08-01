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
    public string Status { get; set; } = string.Empty;
    public string Id { get; set; }

    public DateTime? ScheduledDate { get; set; }
    public List<string> SavedBy { get; set; } = new();
    public int Likes { get; set; } = 0;
}


public class Comment
{
    public string Username { get; set; } = "";
    public string CommentText { get; set; } = "";
    public DateTime Date { get; set; }
    public string AvatarUrl { get; set; } = "/images/avatar.png";

    public string Type { get; set; } = "public"; // "public" or "review"
    public bool VisibleToAuthorOnly { get; set; } = false;

}

public class CommentRequest
{
    public string Comment { get; set; } = "";
        public string Type { get; set; } = "public"; // default

}