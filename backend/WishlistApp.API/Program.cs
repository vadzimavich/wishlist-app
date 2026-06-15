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

Console.WriteLine($"[DEBUG] ConnectionString = '{config.GetConnectionString("DefaultConnection")}'");

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
services.AddScoped<IActivityService, ActivityService>();
services.AddScoped<IParserService, ParserService>();
services.AddScoped<IActivityService, ActivityService>();
services.AddSingleton<IWishlistHubService, WishlistHubService>();
services.AddScoped<IChatService, ChatService>();

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
services.AddCors(opt =>
{
    if (builder.Environment.IsDevelopment())
    {
        opt.AddDefaultPolicy(policy => policy
            .SetIsOriginAllowed(_ => true)  // Разрешить любой origin в dev
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials()
        );
    }
    else
    {
        var allowedOrigins = config["AllowedOrigins"]?.Split(',', StringSplitOptions.RemoveEmptyEntries)
            ?? ["http://localhost:3000"];
        opt.AddDefaultPolicy(policy => policy
            .WithOrigins(allowedOrigins)
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials()
        );
    }
});

// ── SignalR ───────────────────────────────────────────────────────────────────
services.AddSignalR(opt =>
{
    opt.EnableDetailedErrors = builder.Environment.IsDevelopment();
});

// ── Controllers & Swagger ─────────────────────────────────────────────────────
services.AddControllers()
    .AddJsonOptions(opt =>
        opt.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));
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

app.UseCors();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(opt => opt.SwaggerEndpoint("/swagger/v1/swagger.json", "WishList API v1"));   
}
else
{
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseAuthorization();

// Глобальный обработчик ошибок
app.UseMiddleware<ErrorHandlingMiddleware>();

app.MapControllers();
app.MapHub<WishlistHub>("/hubs/wishlist");
app.MapHub<ChatHub>("/hubs/chat");

// Health check для Render keep-alive
app.MapGet("/health", () => Results.Ok(new { status = "ok", timestamp = DateTime.UtcNow }));

app.Run();
