using Microsoft.AspNetCore.Mvc;
using FileBlogApi.Services;

namespace FileBlogApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SearchController : ControllerBase
{
    private readonly IPostSearchService _svc;
    public SearchController(IPostSearchService svc) => _svc = svc;

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string q = "", [FromQuery] int take = 20)
    {
        var results = await _svc.SearchAsync(q ?? string.Empty, Math.Clamp(take, 1, 100));
        return Ok(results);
    }

    [HttpGet("suggest")]
    public async Task<IActionResult> Suggest([FromQuery] string q = "", [FromQuery] int limit = 8)
    {
        var items = await _svc.SuggestAsync(q ?? string.Empty, Math.Clamp(limit, 1, 20));
        return Ok(items.Select(t => new { text = t.text, type = t.type }));
    }
}
