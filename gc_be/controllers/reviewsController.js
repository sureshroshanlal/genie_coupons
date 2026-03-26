import sharp from "sharp";
import { supabase } from "../dbhelper/dbclient.js";
import { uploadImageBuffer } from "../utils/uploadImage.js";

const BUCKET = "review-images";
const FOLDER = "user-reviews";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * POST /public/v1/reviews/upload-screenshot
 * Converts image to WebP and uploads to Supabase
 * Requires auth
 */
export async function uploadScreenshot(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { mimetype, size, buffer, originalname } = req.file;

    if (!ALLOWED_TYPES.includes(mimetype)) {
      return res
        .status(400)
        .json({ error: "Only JPEG, PNG, WebP, or GIF images are allowed" });
    }

    if (size > MAX_FILE_SIZE) {
      return res.status(400).json({ error: "File size must be under 5MB" });
    }

    // Convert to WebP
    const webpBuffer = await sharp(buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const filename = `${originalname.replace(/\.[^/.]+$/, "")}.webp`;

    const { url, error } = await uploadImageBuffer(
      BUCKET,
      FOLDER,
      webpBuffer,
      filename,
      "image/webp",
    );

    if (error) return res.status(500).json({ error: "Upload failed" });

    return res.status(200).json({ url });
  } catch {
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

/**
 * GET /public/v1/reviews/:couponId
 * Returns approved reviews + aggregate rating for a coupon
 */
export async function getReviews(req, res) {
  try {
    const couponId = parseInt(req.params.couponId, 10);
    if (!couponId || isNaN(couponId)) {
      return res.status(400).json({ error: "Invalid coupon ID" });
    }

    const { data, error } = await supabase
      .from("coupon_reviews")
      .select("id, rating, comment, screenshot_url, created_at, user_id")
      .eq("coupon_id", couponId)
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error)
      return res.status(500).json({ error: "Failed to fetch reviews" });

    // Fetch profile info for each review
    const userIds = [...new Set(data.map((r) => r.user_id))];
    let profiles = [];
    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);
      profiles = profileData || [];
    }

    const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));

    const reviews = data.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      screenshot_url: r.screenshot_url,
      created_at: r.created_at,
      user: {
        full_name: profileMap[r.user_id]?.full_name || "Anonymous",
        avatar_url: profileMap[r.user_id]?.avatar_url || null,
      },
    }));

    const avg =
      reviews.length > 0
        ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
        : 0;

    return res.status(200).json({
      reviews,
      aggregate: {
        avg_rating: Math.round(avg * 10) / 10,
        total: reviews.length,
      },
    });
  } catch {
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

/**
 * POST /public/v1/reviews/:couponId
 * Submit a review — requires auth
 * Body: { rating, comment, screenshot_url? }
 */
export async function submitReview(req, res) {
  try {
    const couponId = parseInt(req.params.couponId, 10);
    if (!couponId || isNaN(couponId)) {
      return res.status(400).json({ error: "Invalid coupon ID" });
    }

    const { rating, comment, screenshot_url } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    if (comment && comment.trim().length > 1000) {
      return res
        .status(400)
        .json({ error: "Comment must be under 1000 characters" });
    }

    // Check if user already reviewed this coupon
    const { data: existing } = await supabase
      .from("coupon_reviews")
      .select("id")
      .eq("coupon_id", couponId)
      .eq("user_id", req.user.id)
      .maybeSingle();

    if (existing) {
      return res
        .status(409)
        .json({ error: "You have already reviewed this coupon" });
    }

    // Verify coupon exists and is published
    const { data: coupon } = await supabase
      .from("coupons")
      .select("id")
      .eq("id", couponId)
      .eq("is_publish", true)
      .maybeSingle();

    if (!coupon) {
      return res.status(404).json({ error: "Coupon not found" });
    }

    const { error } = await supabase.from("coupon_reviews").insert({
      coupon_id: couponId,
      user_id: req.user.id,
      rating: parseInt(rating, 10),
      comment: comment?.trim() || null,
      screenshot_url: screenshot_url || null,
      status: "pending",
    });

    if (error)
      return res.status(500).json({ error: "Failed to submit review" });

    return res.status(201).json({
      message: "Review submitted and pending approval. Thank you!",
    });
  } catch {
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
