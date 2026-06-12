using HtmlAgilityPack;
using WishlistApp.API.DTOs;

namespace WishlistApp.API.Services;

public interface IParserService
{
    Task<ParsedProductDto> FetchProductMetaAsync(string url);
}

/// <summary>
/// Парсер мета-данных товаров по URL.
/// Фаза 1: Open Graph теги (работает для большинства сайтов).
/// Фаза 2: Специфичные парсеры для Wildberries / Ozon / AliExpress.
/// </summary>
public class ParserService(IHttpClientFactory httpClientFactory, ILogger<ParserService> logger)
    : IParserService
{
    public async Task<ParsedProductDto> FetchProductMetaAsync(string url)
    {
        try
        {
            using var client = httpClientFactory.CreateClient("Parser");
            var html = await client.GetStringAsync(url);

            var doc = new HtmlDocument();
            doc.LoadHtml(html);

            // ── Open Graph (работает на ~80% сайтов) ──────────────────────
            string? GetOg(string property) => doc.DocumentNode
                .SelectSingleNode($"//meta[@property='og:{property}']")
                ?.GetAttributeValue("content", null);

            string? GetMeta(string name) => doc.DocumentNode
                .SelectSingleNode($"//meta[@name='{name}']")
                ?.GetAttributeValue("content", null);

            var name  = GetOg("title")       ?? GetMeta("title")       ?? doc.DocumentNode.SelectSingleNode("//title")?.InnerText?.Trim();
            var image = GetOg("image")       ?? GetMeta("image");
            var desc  = GetOg("description") ?? GetMeta("description");

            // ── Цена — специфично для каждого маркетплейса ────────────────
            decimal? price = ParsePrice(url, doc);

            // Нормализуем относительный URL изображения
            if (image is not null && !image.StartsWith("http"))
            {
                var baseUri = new Uri(url);
                image = new Uri(baseUri, image).ToString();
            }

            return new ParsedProductDto(
                Name:        System.Net.WebUtility.HtmlDecode(name)?.Trim(),
                Price:       price,
                ImageUrl:    image,
                Description: System.Net.WebUtility.HtmlDecode(desc)?.Trim(),
                SourceUrl:   url
            );
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Parser failed for URL: {Url}", url);
            return new ParsedProductDto(null, null, null, null, url);
        }
    }

    private static decimal? ParsePrice(string url, HtmlDocument doc)
    {
        // ── Wildberries ───────────────────────────────────────────────────
        if (url.Contains("wildberries.ru"))
        {
            var priceNode = doc.DocumentNode.SelectSingleNode("//*[contains(@class,'price-block__final-price')]");
            if (priceNode is not null)
            {
                var raw = new string(priceNode.InnerText.Where(char.IsDigit).ToArray());
                if (decimal.TryParse(raw, out var p)) return p;
            }
        }

        // ── Ozon ──────────────────────────────────────────────────────────
        if (url.Contains("ozon.ru"))
        {
            var meta = doc.DocumentNode.SelectSingleNode("//meta[@name='twitter:data2']");
            if (meta is not null)
            {
                var raw = new string(meta.GetAttributeValue("content", "").Where(c => char.IsDigit(c) || c == '.').ToArray());
                if (decimal.TryParse(raw, System.Globalization.NumberStyles.Any,
                    System.Globalization.CultureInfo.InvariantCulture, out var p)) return p;
            }
        }

        // ── Schema.org price (общий fallback) ────────────────────────────
        var schemaPriceNode = doc.DocumentNode
            .SelectSingleNode("//*[@itemprop='price']");
        if (schemaPriceNode is not null)
        {
            var content = schemaPriceNode.GetAttributeValue("content", null)
                ?? schemaPriceNode.InnerText;
            var raw = new string(content.Where(c => char.IsDigit(c) || c == '.').ToArray());
            if (decimal.TryParse(raw, System.Globalization.NumberStyles.Any,
                System.Globalization.CultureInfo.InvariantCulture, out var p)) return p;
        }

        return null;
    }
}
