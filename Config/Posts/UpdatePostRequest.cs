using System;

public sealed class UpdatePostRequest
{
    // Send only what you want to update; nulls mean "leave as is"
    public string? Title { get; set; }
    public string? Body  { get; set; }

    public string? Status { get; set; }

    public DateTimeOffset? PublishedDate { get; set; }
}
