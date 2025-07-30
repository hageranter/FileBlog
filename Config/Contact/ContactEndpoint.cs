using FileBlogApi.Features.Contact;
using Microsoft.AspNetCore.Http;

namespace FileBlogApi.Features.Contact;

public static class ContactEndpoints
{
    public static void MapContactEndpoints(this WebApplication app)
    {
        app.MapPost("/contact", async (HttpContext context, ContactForm form) =>
        {
            var dir = Path.Combine(Directory.GetCurrentDirectory(), "contact-requests");
            Directory.CreateDirectory(dir);

            var fileName = $"{DateTime.UtcNow:yyyyMMddHHmmss}_{form.Name}.txt";
            var filePath = Path.Combine(dir, fileName);

            var content = $"Name: {form.Name}\nEmail: {form.Email}\nMessage:\n{form.Message}";
            await File.WriteAllTextAsync(filePath, content);

            var emailService = new EmailService();
            await emailService.SendConfirmationEmail(form.Email, form.Name);

            return Results.Ok(new { message = "Contact message received." });
        });
    }
}
