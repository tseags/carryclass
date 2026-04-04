import { NextResponse } from "next/server";
import { GEAR_PRODUCTS } from "@/data/gear-page";

const BATCH_SIZE = 10;
const CACHE_MAX_AGE = 3600; // 1 hour

/**
 * Fetches live Amazon prices for gear products via Product Advertising API 5.0.
 * Requires env: AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, AMAZON_PARTNER_TAG.
 * Returns { [productId]: formattedPrice } for products with amazonAsin.
 */
export async function GET() {
  const asinsByProductId: Record<string, string> = {};
  for (const p of GEAR_PRODUCTS) {
    if (p.amazonAsin) asinsByProductId[p.id] = p.amazonAsin;
  }
  const asins = Object.values(asinsByProductId);
  const productIdsByAsin: Record<string, string> = {};
  for (const [id, asin] of Object.entries(asinsByProductId)) {
    productIdsByAsin[asin] = id;
  }

  if (asins.length === 0) {
    return NextResponse.json({ prices: {} }, { headers: { "Cache-Control": `public, s-maxage=${CACHE_MAX_AGE}` } });
  }

  const accessKey = process.env.AMAZON_ACCESS_KEY;
  const secretKey = process.env.AMAZON_SECRET_KEY;
  const partnerTag = process.env.AMAZON_PARTNER_TAG;

  if (!accessKey || !secretKey || !partnerTag) {
    return NextResponse.json(
      { prices: {}, message: "Amazon PA-API credentials not configured (AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, AMAZON_PARTNER_TAG)" },
      { headers: { "Cache-Control": `public, s-maxage=${CACHE_MAX_AGE}` } }
    );
  }

  try {
    const ProductAdvertisingAPIv1 = require("paapi5-nodejs-sdk");
    const defaultClient = ProductAdvertisingAPIv1.ApiClient.instance;
    defaultClient.accessKey = accessKey;
    defaultClient.secretKey = secretKey;
    defaultClient.host = "webservices.amazon.com";
    defaultClient.region = "us-east-1";
    const api = new ProductAdvertisingAPIv1.DefaultApi();

    const prices: Record<string, string> = {};

    for (let i = 0; i < asins.length; i += BATCH_SIZE) {
      const batch = asins.slice(i, i + BATCH_SIZE);
      const getItemsRequest = new ProductAdvertisingAPIv1.GetItemsRequest();
      getItemsRequest["PartnerTag"] = partnerTag;
      getItemsRequest["PartnerType"] = "Associates";
      getItemsRequest["ItemIds"] = batch;
      getItemsRequest["Condition"] = "New";
      getItemsRequest["Resources"] = ["Offers.Listings.Price"];

      const data = await new Promise<unknown>((resolve, reject) => {
        api.getItems(getItemsRequest, (err: Error | null, data: unknown) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      const getItemsResponse = ProductAdvertisingAPIv1.GetItemsResponse.constructFromObject(data);
      const items = getItemsResponse?.ItemsResult?.Items ?? [];
      for (const item of items) {
        const asin = item.ASIN;
        const productId = productIdsByAsin[asin];
        if (!productId) continue;
        const listing = item.Offers?.Listings?.[0];
        const displayAmount = listing?.Price?.DisplayAmount;
        if (displayAmount) prices[productId] = displayAmount;
      }
    }

    return NextResponse.json(
      { prices },
      { headers: { "Cache-Control": `public, s-maxage=${CACHE_MAX_AGE}` } }
    );
  } catch (err) {
    console.error("Gear prices API error:", err);
    return NextResponse.json(
      { prices: {}, error: "Failed to fetch Amazon prices" },
      { status: 200 }
    );
  }
}
