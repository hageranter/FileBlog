using FileBlogApi.Features.Users;

namespace FileBlogApi.Features.Auth;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        app.MapPost("/login", (LoginRequest dto, UserService userService) =>
        {
            var user = userService.GetUser(dto.Username);
            if (user is null || !userService.VerifyPassword(dto.Password, user.PasswordHash))
                return Results.Unauthorized();

            var token = userService.GenerateJwtToken(user);
            return Results.Ok(new { token });
        });

        app.MapPost("/signup", (SignupRequest dto, UserService userService) =>
        {
            if (userService.GetUser(dto.Username) is not null)
                return Results.BadRequest("Username already exists.");

            userService.CreateUser(dto.Username, dto.Email, dto.Password, dto.Role);
            return Results.Ok("User created successfully.");
        });
    }
}
