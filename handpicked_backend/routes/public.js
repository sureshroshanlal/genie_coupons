import { Router } from "express";
import * as publicCategories from "../controllers/publicCategories.js";
import * as publicStores from "../controllers/publicStores.js";
import * as publicCoupons from "../controllers/publicCoupons.js";
import * as publicBlogs from "../controllers/publicBlogs.js";
import * as publicSearch from "../controllers/publicSearch.js";
import * as publicHealth from "../controllers/publicHealth.js";
import { stores as sitemapStores, blogs as sitemapBlogs } from "../controllers/publicSitemaps.js";
import { click } from "../controllers/offers.js";
import { subscribe } from "../controllers/subscribe.js";

const publicRouter = Router();

// Categories
publicRouter.get("/categories", publicCategories.list);

// Stores
publicRouter.get("/stores", publicStores.list);
publicRouter.get("/stores/:slug", publicStores.detail);

// Coupons
publicRouter.get("/coupons", publicCoupons.list);

// Blogs
publicRouter.get("/blogs", publicBlogs.list);
publicRouter.get("/blogs/:slug", publicBlogs.detail);

// Search
// publicRouter.get("/search", publicSearch.search);

// GET /public/v1/search/stores?q=term&limit=6
publicRouter.get("/search/stores", publicSearch.searchStores);

// Health
publicRouter.get("/health", publicHealth.health);

//Sitemaps
publicRouter.get("/sitemaps/stores.xml", sitemapStores);
publicRouter.get("/sitemaps/blogs.xml", sitemapBlogs);

// Offer clicks
publicRouter.post("/offers/:offerId/click", click);

// Subscribe
publicRouter.post("/subscribe", subscribe);

export default publicRouter;
