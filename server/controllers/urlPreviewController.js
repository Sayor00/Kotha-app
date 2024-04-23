const axios = require("axios");
const cheerio = require("cheerio");
const { URL } = require("url");
const puppeteer = require("puppeteer");

exports.fetchUrlPreview = async (req, res) => {
  let { url } = req.query;

  console.log("URL received from client:", url);

  try {
    // Try fetching using Cheerio
    const cheerioMetadata = await fetchUrlPreviewCheerio(url);

    if (cheerioMetadata) {
      console.log("Successfully fetched metadata using Cheerio");
      res.json(cheerioMetadata);
    } else {
      console.log(
        "Failed to fetch metadata using Cheerio. Falling back to Puppeteer."
      );
      // If Cheerio fails, try with Puppeteer
      const puppeteerMetadata = await fetchUrlPreviewPuppeteer(url);
      res.json(puppeteerMetadata);
    }
  } catch (error) {
    console.error("Error while fetching URL preview:", error);
    res.status(500).json({ error: "Failed to fetch URL preview" });
  }
};

// Fetch URL preview using Cheerio
async function fetchUrlPreviewCheerio(url) {
  try {
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      console.log(
        "URL does not start with http:// or https://. Trying HTTPS first..."
      );
      try {
        const httpsUrl = `https://${url}`;
        console.log("Attempting to reach website using HTTPS:", httpsUrl);
        await axios.head(httpsUrl);
        console.log("Successfully reached website using HTTPS.");
        url = httpsUrl;
      } catch (httpsError) {
        console.error(
          "Failed to reach website using HTTPS, falling back to HTTP:",
          httpsError
        );
        url = `http://${url}`;
        console.log("Attempting to reach website using HTTP:", url);
      }
    }

    const response = await axios.get(url);
    const htmlContent = response.data;
    const responseUrl = response.request.res.responseUrl;

    const $ = cheerio.load(htmlContent);
    const metadata = extractMetadata($, responseUrl);

    console.log("Extracted Metadata using Cheerio:", metadata);
    return metadata;
  } catch (error) {
    console.error("Failed to fetch URL preview using Cheerio:", error);
    return null;
  }
}

// Fetch URL preview using Puppeteer
async function fetchUrlPreviewPuppeteer(url) {
  try {
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      console.log(
        "URL does not start with http:// or https://. Trying HTTPS first..."
      );
      try {
        const httpsUrl = `https://${url}`;
        console.log("Attempting to reach website using HTTPS:", httpsUrl);
        url = httpsUrl;
      } catch (httpsError) {
        console.error(
          "Failed to reach website using HTTPS, falling back to HTTP:",
          httpsError
        );
        url = `http://${url}`;
        console.log("Attempting to reach website using HTTP:", url);
      }
    }

    const browser = await puppeteer.launch({
      executablePath:
        process.env.NODE_ENV === "production"
          ? process.env.PUPPETEER_EXECUTABLE_PATH
          : puppeteer.executablePath(),
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--single-process",
        "--no-zygote"
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36"
    );
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    const metadata = await extractMetadataPuppeteer(page, url);

    console.log("Extracted Metadata using Puppeteer:", metadata);
    await browser.close();
    return metadata;
  } catch (error) {
    console.error("Failed to fetch URL preview using Puppeteer:", error);
    return null;
  }
}

// Extract metadata using Cheerio
function extractMetadata($, url) {
  const baseUrl = new URL(url).hostname;

  return {
    title: $('meta[property="og:title"]').attr("content") || $("title").text(),
    description:
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="description"]').attr("content"),
    image: $('meta[property="og:image"]').attr("content"),
    video:
      $('meta[property="og:video"]').attr("content") ||
      $('meta[property="og:video:url"]').attr("content") ||
      $('meta[name="twitter:player"]').attr("content"),
    titleLogo: findFavicon($, url),
    domain: baseUrl,
  };
}

// Extract metadata from the page using Puppeteer
async function extractMetadataPuppeteer(page, url) {
  try {
    const titleElement = await page.$("title");
    const title = titleElement ? await page.title() : "Untitled";

    const description = await page
      .$eval(
        'meta[property="og:description"]',
        (element) => element?.content || ""
      )
      .catch(() => "");
    const image = await page
      .$eval('meta[property="og:image"]', (element) => element?.content || "")
      .catch(() => "");
    const video = await page
      .$eval('meta[property="og:video"]', (element) => element?.content || "")
      .catch(() => "");
    const domain = new URL(url).hostname;

    const titleLogo = await findFaviconPuppeteer(page, url); // Corrected function call

    return {
      title,
      description,
      image,
      video,
      titleLogo,
      domain,
    };
  } catch (error) {
    console.error("Error while extracting metadata using Puppeteer:", error);
    return {};
  }
}
// Find website favicon URL
function findFavicon($orPage, url) {
  const baseUrl = new URL(url).origin; // Extract the website's base URL

  // Check if $orPage is a Cheerio object
  if (typeof $orPage === "function") {
    // For Cheerio, use $
    const $ = $orPage;

    // Search for favicon links in HTML head section
    const faviconLinks = $("head").find(
      'link[rel="icon"], link[rel="shortcut icon"]'
    );

    // Check if any favicon link is found
    if (faviconLinks.length > 0) {
      // Extract the href attribute of the first favicon link found
      const faviconUrl = faviconLinks.eq(0).attr("href");
      // Return the complete URL of the favicon (relative to base URL)
      return new URL(faviconUrl, baseUrl).href;
    }

    // If no favicon link is found in head section, try the root directory
    const rootFaviconUrl = new URL("/favicon.ico", baseUrl).href;
    return rootFaviconUrl;
  } else {
    // For Puppeteer, use page.evaluate
    const page = $orPage;

    return page.evaluate((baseUrl) => {
      const faviconLinks = document.querySelectorAll(
        'link[rel="icon"], link[rel="shortcut icon"]'
      );
      if (faviconLinks.length > 0) {
        return faviconLinks[0].href;
      } else {
        return `${baseUrl}/favicon.ico`;
      }
    }, baseUrl);
  }
}

// Find website favicon URL using Puppeteer
async function findFaviconPuppeteer(page, url) {
  try {
    const baseUrl = new URL(url).origin;

    const faviconUrl = await page.evaluate((baseUrl) => {
      const faviconLinks = document.querySelectorAll(
        'link[rel="icon"], link[rel="shortcut icon"]'
      );
      if (faviconLinks.length > 0) {
        return faviconLinks[0].href;
      } else {
        return `${baseUrl}/favicon.ico`;
      }
    }, baseUrl);

    return faviconUrl;
  } catch (error) {
    console.error("Error while finding favicon URL using Puppeteer:", error);
    return "";
  }
}
