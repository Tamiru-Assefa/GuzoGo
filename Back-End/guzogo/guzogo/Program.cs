using guzogo.Data;
using guzogo.Helpers;
using guzogo.Hubs;
using guzogo.Services.Implementation;
using guzogo.Services.Implementations;
using guzogo.Services.Interface;
using guzogo.Services.Interfaces;
using guzogo.Services.Matching;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")
    ));

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<JwtTokenGenerator>();
//builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
//    .AddJwtBearer(options =>
//    {
//        options.TokenValidationParameters = new TokenValidationParameters
//        {
//            ValidateIssuer = true,
//            ValidateAudience = true,
//            ValidateLifetime = true,
//            ValidateIssuerSigningKey = true,

//            ValidIssuer = builder.Configuration["Jwt:Issuer"],
//            ValidAudience = builder.Configuration["Jwt:Audience"],

//            IssuerSigningKey = new SymmetricSecurityKey(
//                Encoding.UTF8.GetBytes(
//                    builder.Configuration["Jwt:Key"]!
//                ))
//        };

//        // Allow SignalR to receive JWT from the query string
//        options.Events = new JwtBearerEvents
//        {
//            OnMessageReceived = context =>
//            {
//                var accessToken = context.Request.Query["access_token"];

//                var path = context.HttpContext.Request.Path;

//                if (!string.IsNullOrEmpty(accessToken)
//                    && path.StartsWithSegments("/guzohub"))
//                {
//                    context.Token = accessToken;
//                }

//                return Task.CompletedTask;
//            }
//        };
//    });

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,

        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],

        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(
                builder.Configuration["Jwt:Key"]!
            ))
    };


    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            // 1. First, check if the token is passed in the Query String (SignalR / WebSockets)
            var accessToken = context.Request.Query["access_token"];

            // 2. Read the request path
            var path = context.HttpContext.Request.Path;

            // 3. If an access token exists and the request is going to your SignalR Hub path
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/guzohub"))
            {
                // Assign the token so ASP.NET Core JWT Middleware authenticates the WebSocket connection
                context.Token = accessToken;
            }

            return Task.CompletedTask;
        },

        OnAuthenticationFailed = context =>
        {
            Console.WriteLine("========== JWT ERROR ==========");
            Console.WriteLine(context.Exception.Message);
            Console.WriteLine("===============================");

            return Task.CompletedTask;
        }
    };
});
builder.Services.AddScoped<ISkillService, SkillService>();
builder.Services.AddScoped<IExperienceService, ExperienceService>();
builder.Services.AddScoped<IUserPresenceService, UserPresenceService>();
builder.Services.AddScoped<IMatchPreferenceService, MatchPreferenceService>();
builder.Services.AddScoped<IMatchingService, MatchingService>();
builder.Services.AddScoped<MatchScoreCalculator>();
builder.Services.AddScoped<IMatchSessionService, MatchSessionService>();
builder.Services.AddScoped<ISpacesService, SpacesService>();
builder.Services.AddHostedService<RoomCleanupService>();
builder.Services.AddScoped<IEmailService, EmailService>();


// Allow cross-origin requests during development so Swagger UI can call the API
//builder.Services.AddCors(options =>
//{
//    options.AddPolicy("AllowAll", policy =>
//    {
//        policy.AllowAnyOrigin()
//              .AllowAnyMethod()
//              .AllowAnyHeader();
//    });
//});
// Allow cross-origin requests during development for Angular + SignalR credentials
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.WithOrigins("http://localhost:4200",
            "http://192.168.1.4:4200",  // Local network Angular address
                "http://192.168.1.4:5011",
                "http://localhost:5011",
                "http://192.168.9.146:4200",
                "http://192.168.9.146:5011"
        )
        // Explicitly define Angular dev origin
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials(); // REQUIRED for SignalR authentication
    });
});

builder.Services.AddHttpClient("AIMatcher", client =>
{
    client.BaseAddress = new Uri("http://localhost:8000");
    client.Timeout = TimeSpan.FromSeconds(30);
});


builder.Services.AddControllers();
builder.Services.AddSignalR();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "GuzoGo API",
        Version = "v1"
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter JWT token"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});



var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// Apply the CORS policy early in the pipeline
app.UseCors("AllowAll");

app.UseAuthentication();

app.UseAuthorization();

app.MapControllers();
app.MapHub<GuzoHub>("/guzohub");
app.MapHub<SpacesHub>("/hubs/spaces");

app.Run();
