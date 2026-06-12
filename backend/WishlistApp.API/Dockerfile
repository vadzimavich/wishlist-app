# ─── Build stage ──────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Копируем только csproj для кеширования слоя restore
COPY WishlistApp.API/WishlistApp.API.csproj WishlistApp.API/
RUN dotnet restore WishlistApp.API/WishlistApp.API.csproj

# Копируем исходники и публикуем
COPY . .
RUN dotnet publish WishlistApp.API/WishlistApp.API.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

# ─── Runtime stage ────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Устанавливаем русскую локаль и certifi
RUN apt-get update && apt-get install -y \
    locales \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Копируем опубликованные файлы
COPY --from=build /app/publish .

# Порт
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "WishlistApp.API.dll"]
