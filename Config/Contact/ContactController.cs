using Microsoft.AspNetCore.Mvc;
using FileBlogApi.Features.Contact;

namespace FileBlogApi.Features.Contact
{
    [ApiController]
    [Route("api/[controller]")]
    public class ContactController : ControllerBase
    {
        private readonly EmailService _emailService;

        public ContactController()
        {
            _emailService = new EmailService(); // could be injected too
        }

        [HttpPost]
        public async Task<IActionResult> Post(ContactForm form)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var directory = Path.Combine(Directory.GetCurrentDirectory(), "contact-requests");
            Directory.CreateDirectory(directory);
            var filePath = Path.Combine(directory, $"{DateTime.Now:yyyyMMddHHmmssfff}_{form.Name}.txt");

            await System.IO.File.WriteAllTextAsync(filePath, 
                $"Name: {form.Name}\nEmail: {form.Email}\nMessage: {form.Message}");

            await _emailService.SendConfirmationEmail(form.Email, form.Name);

            return Ok(new { message = "Contact form received." });
        }
    }
}
