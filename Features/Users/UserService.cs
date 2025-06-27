using System.Text.Json;
using System.Security.Cryptography;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using System.Security.Claims;

namespace FileBlogApi.Features.Users;

public class UserService
{
    private readonly string _usersRoot;
    private readonly IConfiguration _config;

    public UserService(IConfiguration config)
    {
        _config = config;
        _usersRoot = Path.Combine(Directory.GetCurrentDirectory(), "Content", "Users");
    }



    public User? GetUser(string username)
    {
        var filePath = Path.Combine(_usersRoot, username, "profile.json");
        Console.WriteLine("Looking in path: " + filePath);

        if (!File.Exists(filePath))
        {
            Console.WriteLine("File not found.");
            return null;
        }

        var json = File.ReadAllText(filePath);
        Console.WriteLine("JSON content: " + json);

        var user = JsonSerializer.Deserialize<User>(json);
        Console.WriteLine("Deserialized hash: " + user?.PasswordHash);

        return user;
    }




    public bool VerifyPassword(string enteredPassword, string storedHash)
    {
        using var md5 = MD5.Create();
        var inputBytes = Encoding.UTF8.GetBytes(enteredPassword);
        var hashBytes = md5.ComputeHash(inputBytes);
        var hash = BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
        Console.WriteLine($"Entered: {enteredPassword}");
        Console.WriteLine($"Stored: {storedHash}");
        Console.WriteLine($"Match: {hash == storedHash.ToLowerInvariant()}");


        return hash == storedHash.ToLowerInvariant();
    }


    public string GenerateJwtToken(User user)
    {
        var secret = _config["Jwt:Secret"] ?? throw new Exception("JWT secret not set");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));

        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Username),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim("username", user.Username),
            new Claim("email", user.Email),
            new Claim("role", user.Role),      
                                 

        };

        var token = new JwtSecurityToken(
            issuer: "FileBlogApi",
            audience: "FileBlogApi",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(2),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public void CreateUser(string username, string email, string password, string role)
    {
        var userDir = Path.Combine(_usersRoot, username);
        Directory.CreateDirectory(userDir);

        var hashBytes = MD5.Create().ComputeHash(Encoding.UTF8.GetBytes(password));
        var hash = BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();

        var user = new User
        {
            Username = username,
            Email = email,
            PasswordHash = hash,
            Role = role
        };

        var json = JsonSerializer.Serialize(user, new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(Path.Combine(userDir, "profile.json"), json);
    }




}
