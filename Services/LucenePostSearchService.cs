using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Lucene.Net.Analysis.Standard;
using Lucene.Net.Documents;
using Lucene.Net.Index;
using Lucene.Net.QueryParsers.Classic;
using Lucene.Net.Search;
using Lucene.Net.Util;
using Microsoft.Extensions.Hosting;
using System.IO;
using LuceneDirectory = Lucene.Net.Store;

namespace FileBlogApi.Services;

public class LucenePostSearchService : IPostSearchService
{
    private static readonly LuceneVersion L = LuceneVersion.LUCENE_48;
    private readonly LuceneDirectory.Directory _dir;
    private readonly StandardAnalyzer _analyzer;
    private IndexWriter _writer;

    public LucenePostSearchService(IHostEnvironment env)
    {
        var indexPath = Path.Combine(env.ContentRootPath, "App_Data", "lucene-posts");
        System.IO.Directory.CreateDirectory(indexPath);
        _dir = LuceneDirectory.FSDirectory.Open(indexPath);
        _analyzer = new StandardAnalyzer(L);
        _writer = new IndexWriter(_dir, new IndexWriterConfig(L, _analyzer) { OpenMode = OpenMode.CREATE_OR_APPEND });
    }

    public Task RebuildAsync(IEnumerable<PostDto> posts, CancellationToken ct = default)
    {
        _writer?.Dispose();
        _writer = new IndexWriter(_dir, new IndexWriterConfig(L, _analyzer) { OpenMode = OpenMode.CREATE });
        foreach (var p in posts)
        {
            if (!IsVisible(p)) continue;
            _writer.AddDocument(ToDoc(p));
        }
        _writer.Flush(triggerMerge: true, applyAllDeletes: true);
        return Task.CompletedTask;
    }

    public Task IndexOrUpdateAsync(PostDto post, CancellationToken ct = default)
    {
        if (!IsVisible(post))
        {
            _writer.DeleteDocuments(new Term("id", post.Id));
            _writer.Flush(false, true);
            return Task.CompletedTask;
        }
        _writer.UpdateDocument(new Term("id", post.Id), ToDoc(post));
        _writer.Flush(false, true);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(string id, CancellationToken ct = default)
    {
        _writer.DeleteDocuments(new Term("id", id));
        _writer.Flush(false, true);
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<PostDto>> SearchAsync(string query, int take = 20, CancellationToken ct = default)
    {
        using var reader = DirectoryReader.Open(_dir);
        var searcher = new IndexSearcher(reader);

        // Search all relevant fields (with boosts)
        var boosts = new Dictionary<string, float>
        {
            ["title"] = 3.0f,
            ["tags"] = 2.0f,
            ["categories"] = 1.5f,
            ["description"] = 1.2f,
            ["body"] = 0.8f
        };
        var parser = new MultiFieldQueryParser(L, boosts.Keys.ToArray(), _analyzer, boosts);
        Query q = string.IsNullOrWhiteSpace(query) ? new MatchAllDocsQuery() : parser.Parse(query);

        var top = searcher.Search(q, take);
        var results = new List<PostDto>(Math.Min(take, top.ScoreDocs.Length));
        foreach (var sd in top.ScoreDocs)
        {
            var d = searcher.Doc(sd.Doc);
            results.Add(FromDoc(d));
        }
        return Task.FromResult<IReadOnlyList<PostDto>>(results);
    }

    public Task<IReadOnlyList<(string text, string type)>> SuggestAsync(string prefix, int take = 8, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(prefix))
            return Task.FromResult<IReadOnlyList<(string, string)>>(Array.Empty<(string, string)>());

        using var reader = DirectoryReader.Open(_dir);
        var searcher = new IndexSearcher(reader);

        // Suggest based on exact-lowercased prefix of title/tags
        var bq = new BooleanQuery
        {
            { new PrefixQuery(new Term("title_exact", prefix.ToLowerInvariant())), Occur.SHOULD },
            { new PrefixQuery(new Term("tags_exact",  prefix.ToLowerInvariant())), Occur.SHOULD }
        };

        var top = searcher.Search(bq, take * 4);
        var seen = new HashSet<string>();
        var items = new List<(string text, string type)>();
        foreach (var sd in top.ScoreDocs)
        {
            var d = searcher.Doc(sd.Doc);
            var title = d.Get("title");
            var tags = d.GetValues("tags");

            void add(string text, string type)
            {
                if (string.IsNullOrWhiteSpace(text)) return;
                var key = $"{type}|{text}".ToLowerInvariant();
                if (seen.Add(key)) items.Add((text, type));
            }

            if (!string.IsNullOrEmpty(title) && title.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                add(title, "Title");
            foreach (var t in tags ?? Array.Empty<string>())
                if (t.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                    add(t, "Tag");

            if (items.Count >= take) break;
        }
        return Task.FromResult<IReadOnlyList<(string, string)>>(items.Take(take).ToList());
    }

    private static bool IsVisible(PostDto p)
    {
        var now = DateTime.UtcNow;
        return p.Status == "published" ||
               (p.Status == "scheduled" && p.ScheduledDate.HasValue && p.ScheduledDate.Value <= now);
        // If you prefer to index everything, replace with: return true;
    }

    private static Document ToDoc(PostDto p)
    {
        var doc = new Document
        {
            new StringField("id",   string.IsNullOrWhiteSpace(p.Id) ? (p.Slug ?? "") : p.Id, Field.Store.YES),
            new StringField("slug", string.IsNullOrWhiteSpace(p.Slug) ? (p.Id ?? "") : p.Slug, Field.Store.YES),

            // Stored for UI (not analyzed)
            new StoredField("folderName",    p.FolderName ?? ""),
            new StoredField("assetFilesCsv", string.Join("|", p.AssetFiles ?? new List<string>())),
            new StoredField("publishedDate", (p.PublishedDate ?? DateTime.UtcNow).ToString("o")),

            // Searchable fields
            new TextField("title",       p.Title ?? "",       Field.Store.YES),
            new TextField("description", p.Description ?? "", Field.Store.YES),
            new TextField("body",        p.Body ?? "",        Field.Store.NO) // searchable, no need to return
        };

        foreach (var tag in p.Tags ?? new List<string>())
            doc.Add(new TextField("tags", tag, Field.Store.YES));

        foreach (var cat in p.Categories ?? new List<string>())
            doc.Add(new TextField("categories", cat, Field.Store.YES));

        // Lowercased exact fields for prefix suggestions
        doc.Add(new StringField("title_exact", (p.Title ?? "").ToLowerInvariant(), Field.Store.NO));
        foreach (var tag in p.Tags ?? new List<string>())
            doc.Add(new StringField("tags_exact", tag.ToLowerInvariant(), Field.Store.NO));

        return doc;
    }

    private static PostDto FromDoc(Document d) => new PostDto
    {
        Id = d.Get("id"),
        Slug = d.Get("slug"),
        Title = d.Get("title"),
        Description = d.Get("description"),
        Tags = d.GetValues("tags")?.ToList() ?? new(),
        Categories = d.GetValues("categories")?.ToList() ?? new(),
        FolderName = d.Get("folderName"),
        AssetFiles = (d.Get("assetFilesCsv") ?? "")
                        .Split("|", StringSplitOptions.RemoveEmptyEntries)
                        .ToList(),
        PublishedDate = DateTime.TryParse(d.Get("publishedDate"), out var dt) ? dt : (DateTime?)null,
        Status = "published"
    };

    public void Dispose()
    {
        _writer?.Dispose();
        _analyzer?.Dispose();
        _dir?.Dispose();
    }
}
