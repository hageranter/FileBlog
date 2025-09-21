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

    // ==== PBKDF2 config & helpers ====
    private const int Pbkdf2Iter = 100_000;
    private const int SaltSize = 16;  // 128-bit
    private const int KeySize = 32;   // 256-bit

    // Format: pbkdf2:<iter>:<saltBase64>:<hashBase64>
    private static string HashPassword(string password)
    {
        using var rng = RandomNumberGenerator.Create();
        var salt = new byte[SaltSize];
        rng.GetBytes(salt);
        var key = new Rfc2898DeriveBytes(password, salt, Pbkdf2Iter, HashAlgorithmName.SHA256).GetBytes(KeySize);
        return $"pbkdf2:{Pbkdf2Iter}:{Convert.ToBase64String(salt)}:{Convert.ToBase64String(key)}";
    }

    private static bool VerifyPbkdf2(string password, string stored)
    {
        try
        {
            var parts = stored.Split(':');
            if (parts.Length != 4 || parts[0] != "pbkdf2") return false;
            var iter = int.Parse(parts[1]);
            var salt = Convert.FromBase64String(parts[2]);
            var key = Convert.FromBase64String(parts[3]);
            var test = new Rfc2898DeriveBytes(password, salt, iter, HashAlgorithmName.SHA256).GetBytes(key.Length);
            return CryptographicOperations.FixedTimeEquals(test, key);
        }
        catch { return false; }
    }

    private static string NormalizeRole(string role)
        => (role ?? "Author").Trim().ToLowerInvariant() switch
        {
            "admin"  => "Admin",
            "editor" => "Editor",
            "user"   => "Author", // map frontend "user" to backend "Author"
            _        => "Author"
        };

    public User? GetUser(string username)
    {
        var filePath = Path.Combine(_usersRoot, username, "profile.json");
        if (!File.Exists(filePath)) return null;

        var json = File.ReadAllText(filePath);
        return JsonSerializer.Deserialize<User>(json);
    }

    // Supports PBKDF2 and legacy MD5 (for existing users)
    public bool VerifyPassword(string enteredPassword, string storedHash)
    {
        if (string.IsNullOrWhiteSpace(storedHash)) return false;
        if (storedHash.StartsWith("pbkdf2:", StringComparison.OrdinalIgnoreCase))
            return VerifyPbkdf2(enteredPassword, storedHash);

        // Legacy MD5 fallback (temporary)
        using var md5 = MD5.Create();
        var hex = BitConverter.ToString(md5.ComputeHash(Encoding.UTF8.GetBytes(enteredPassword)))
            .Replace("-", "").ToLowerInvariant();
        return hex == storedHash.ToLowerInvariant();
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
            new Claim("role", user.Role)
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

        var hash = HashPassword(password); // PBKDF2

        var user = new User
        {
            Username = username,
            Email = email,
            PasswordHash = hash,
            Role = NormalizeRole(role)
        };

        var json = JsonSerializer.Serialize(user, new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(Path.Combine(userDir, "profile.json"), json);
    }

    public User? GetUserByUsername(string username) => GetUser(username);

    public void UpdateUser(User user)
    {
        var userDir = Path.Combine(_usersRoot, user.Username);
        var filePath = Path.Combine(userDir, "profile.json");
        if (!File.Exists(filePath)) return;

        var json = JsonSerializer.Serialize(user, new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(filePath, json);
    }

    public List<User> GetAllUsers()
    {
        if (!Directory.Exists(_usersRoot)) return new List<User>();

        var users = new List<User>();
        foreach (var dir in Directory.GetDirectories(_usersRoot))
        {
            var filePath = Path.Combine(dir, "profile.json");
            if (File.Exists(filePath))
            {
                var json = File.ReadAllText(filePath);
                var user = JsonSerializer.Deserialize<User>(json);
                if (user != null) users.Add(user);
            }
        }
        return users;
    }

    public bool DeleteUser(string username)
    {
        var userDir = Path.Combine(_usersRoot, username);
        if (!Directory.Exists(userDir)) return false;

        Directory.Delete(userDir, true);
        return true;
    }
}
