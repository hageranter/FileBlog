using System.Threading;
using System.Threading.Tasks;
using System;
using System.Collections.Generic;

namespace FileBlogApi.Services;

public interface IPostSearchService : IDisposable
{
    Task RebuildAsync(IEnumerable<PostDto> posts, CancellationToken ct = default);
    Task IndexOrUpdateAsync(PostDto post, CancellationToken ct = default);
    Task DeleteAsync(string id, CancellationToken ct = default);
    Task<IReadOnlyList<PostDto>> SearchAsync(string query, int take = 20, CancellationToken ct = default);
    Task<IReadOnlyList<(string text, string type)>> SuggestAsync(string prefix, int take = 8, CancellationToken ct = default);
}
