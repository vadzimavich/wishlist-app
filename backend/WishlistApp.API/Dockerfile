# ─── Build stage ──────────────────────────────────────────────────────────────
FROM ubuntu:24.04 AS build
WORKDIR /src

# Install wget, libicu and .NET SDK 10.0 via official script (bypasses MCR rate limits)
RUN apt-get update && apt-get install -y wget libicu-dev && \
    wget -q https://dot.net/v1/dotnet-install.sh -O dotnet-install.sh && \
    chmod +x dotnet-install.sh && \
    ./dotnet-install.sh --channel 10.0 --install-dir /usr/share/dotnet && \
    ln -s /usr/share/dotnet/dotnet /usr/local/bin/dotnet && \
    rm -rf /var/lib/apt/lists/* dotnet-install.sh

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
FROM ubuntu:24.04 AS runtime
WORKDIR /app

# Install wget and ASP.NET Core Runtime 10.0 via official script
RUN apt-get update && apt-get install -y wget && \
    wget -q https://dot.net/v1/dotnet-install.sh -O dotnet-install.sh && \
    chmod +x dotnet-install.sh && \
    ./dotnet-install.sh --channel 10.0 --runtime aspnetcore --install-dir /usr/share/dotnet && \
    ln -s /usr/share/dotnet/dotnet /usr/local/bin/dotnet && \
    rm -rf /var/lib/apt/lists/* dotnet-install.sh

# Устанавливаем локали, certifi, libicu (как было в оригинале)
RUN apt-get update && apt-get install -y \
    locales \
    ca-certificates \
    libkrb5-3 \
    libicu74 \
    && rm -rf /var/lib/apt/lists/*

# Копируем опубликованные файлы
COPY --from=build /app/publish .

# Порт
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "WishlistApp.API.dll"]
