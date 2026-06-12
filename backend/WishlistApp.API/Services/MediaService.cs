using CloudinaryDotNet;
using CloudinaryDotNet.Actions;

namespace WishlistApp.API.Services;

public interface IMediaService
{
    Task<string> UploadImageAsync(string base64Image, string? folder = null);
    Task DeleteImageAsync(string publicId);
}

public class MediaService(IConfiguration config) : IMediaService
{
    private readonly Cloudinary _cloudinary = new(new Account(
        config["Cloudinary:CloudName"],
        config["Cloudinary:ApiKey"],
        config["Cloudinary:ApiSecret"]
    ));

    public async Task<string> UploadImageAsync(string base64Image, string? folder = null)
    {
        // Убираем префикс data:image/...;base64, если есть
        var data = base64Image.Contains(',')
            ? base64Image.Split(',')[1]
            : base64Image;

        var bytes = Convert.FromBase64String(data);
        using var stream = new MemoryStream(bytes);

        var uploadParams = new ImageUploadParams
        {
            File = new FileDescription("upload", stream),
            Folder = folder ?? "wishlist",
            Transformation = new Transformation()
                .Width(1200).Height(1200)
                .Crop("limit")               // Не увеличиваем маленькие изображения
                .Quality("auto:good")        // Авто-качество
                .FetchFormat("auto"),        // WebP/AVIF где поддерживается
        };

        var result = await _cloudinary.UploadAsync(uploadParams);

        if (result.Error is not null)
            throw new InvalidOperationException($"Cloudinary error: {result.Error.Message}");

        return result.SecureUrl.ToString();
    }

    public async Task DeleteImageAsync(string publicId)
    {
        var deleteParams = new DeletionParams(publicId);
        await _cloudinary.DestroyAsync(deleteParams);
    }
}
