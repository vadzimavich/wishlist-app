using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WishlistApp.API.DTOs;
using WishlistApp.API.Services;

namespace WishlistApp.API.Controllers;

[Authorize]
[Route("api/media")]
public class MediaController(IMediaService mediaService) : ApiControllerBase
{
    /// <summary>
    /// Загрузка изображения через бэкенд (альтернатива прямой загрузке в Cloudinary).
    /// Используй, если нужен контроль над загрузками (валидация, watermark и т.д.).
    /// Для простых кейсов предпочтительнее прямая загрузка с фронтенда.
    /// </summary>
    [HttpPost("upload")]
    [RequestSizeLimit(10 * 1024 * 1024)] // 10 MB
    public async Task<IActionResult> Upload([FromBody] MediaUploadRequest request)
    {
        var url = await mediaService.UploadImageAsync(request.Base64Image, request.Folder);
        return ApiOk(new MediaUploadResponse(url, string.Empty));
    }
}
