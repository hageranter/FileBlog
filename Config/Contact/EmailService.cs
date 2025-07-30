using MailKit.Net.Smtp;
using MimeKit;

public class EmailService
{
    public async Task SendConfirmationEmail(string toEmail, string name)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress("MyBlog", "blogsystem542@gmail.com"));
        message.To.Add(new MailboxAddress("", toEmail));
        message.Subject = "We received your message!";
        message.Body = new TextPart("plain")
        {
            Text = $@"
        Hi {name},

       Thank you for reaching out to MyBlog!

       We’ve received your message and our team will review it shortly. We appreciate your interest and will get back to you as soon as possible.

       If your message is urgent, feel free to reply directly to this email.

       Best regards,  
       The MyBlog Support Team  
       https://myblog.example.com
         "
        };
        using var client = new SmtpClient();
        await client.ConnectAsync("smtp.gmail.com", 587, MailKit.Security.SecureSocketOptions.StartTls);
        await client.AuthenticateAsync("blogsystem542@gmail.com", "vkjc wtmn nbtn lxky");

        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }
}
