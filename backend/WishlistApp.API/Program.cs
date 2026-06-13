using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using WishlistApp.API.Data;
using WishlistApp.API.Hubs;
using WishlistApp.API.Middleware;
using WishlistApp.API.Services;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;
var services = builder.Services;

// ── Database ──────────────────────────────────────────────────────────────────
services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(
        config.GetConnectionString("DefaultConnection"),
        npgsql => npgsql.EnableRetryOnFailure(3)
    )
);

// ── Services ──────────────────────────────────────────────────────────────────
services.AddHttpContextAccessor();
services.AddScoped<IAuthService, AuthService>();
services.AddScoped<IWishlistService, WishlistService>();
services.AddScoped<IEventService, EventService>();
services.AddScoped<IGuestService, GuestService>();
services.AddScoped<IGiftService, GiftService>();
services.AddScoped<IParserService, ParserService>();
services.AddSingleton<IWishlistHubService, WishlistHubService>();

// HttpClient для парсера с нормальным User-Agent
services.AddHttpClient("Parser", client =>
{
    client.DefaultRequestHeaders.Add("User-Agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    client.Timeout = TimeSpan.FromSeconds(15);
});

// ── JWT Authentication ────────────────────────────────────────────────────────
var jwtSection = config.GetSection("Jwt");
var jwtKey = jwtSection["Key"] ?? throw new InvalidOperationException("JWT Key не настроен!");

services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSection["Issuer"],
            ValidAudience = jwtSection["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.Zero
        };

        // SignalR передаёт токен через query string
        opt.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                var accessToken = ctx.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(accessToken) &&
                    ctx.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                {
                    ctx.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

services.AddAuthorization();

// ── CORS ──────────────────────────────────────────────────────────────────────
var allowedOrigins = config["AllowedOrigins"]?.Split(',', StringSplitOptions.RemoveEmptyEntries)
    ?? ["http://localhost:3000"];

services.AddCors(opt =>
    opt.AddDefaultPolicy(policy => policy
        .WithOrigins(allowedOrigins)
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials()   // Нужно для SignalR и cookies
    )
);

// ── SignalR ───────────────────────────────────────────────────────────────────
services.AddSignalR(opt =>
{
    opt.EnableDetailedErrors = builder.Environment.IsDevelopment();
});

// ── Controllers & Swagger ─────────────────────────────────────────────────────
services.AddControllers();
services.AddEndpointsApiExplorer();
services.AddSwaggerGen(opt =>
{
    opt.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "WishList API",
        Version = "v1",
        Description = "Персональный вишлист с умными приглашениями"
    });

    opt.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "Введи JWT токен (без 'Bearer ')"
    });

    opt.AddSecurityRequirement(doc => new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecuritySchemeReference("Bearer", doc),
            []
        }
    });
});

// ── App ───────────────────────────────────────────────────────────────────────
var app = builder.Build();

// Автоматическое применение миграций при старте
if (config.GetValue<bool>("MigrateOnStartup", true))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(opt => opt.SwaggerEndpoint("/swagger/v1/swagger.json", "WishList API v1"));
}

app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// Глобальный обработчик ошибок
app.UseMiddleware<ErrorHandlingMiddleware>();

app.MapControllers();
app.MapHub<WishlistHub>("/hubs/wishlist");

// Health check для Render keep-alive
app.MapGet("/health", () => Results.Ok(new { status = "ok", timestamp = DateTime.UtcNow }));

app.Run();
