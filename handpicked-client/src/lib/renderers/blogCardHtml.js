// src/lib/renderers/blogCardHtml.js

import { escapeHtml } from "./couponCardHtml.js";

/**
 * renderBlogCardHtml(post)
 * post: { id, slug, title, hero_image_url, category, created_at }
 */
export function renderBlogCardHtml(post = {}) {
  const title = escapeHtml(post.title ?? post.headline ?? "");
  const slug = escapeHtml(post.slug ?? "");
  const thumb = post.hero_image_url ? escapeHtml(post.hero_image_url) : "";
  const category = post.category ? escapeHtml(post.category) : "";
  const created = post.created_at
    ? escapeHtml(new Date(post.created_at).toLocaleDateString())
    : "";

  return `
    <a
      href="/blogs/${slug}"
      class="card-base block overflow-hidden h-full hover:shadow-lg hover:-translate-y-0.5 transition-transform duration-150"
      aria-label="Read blog: ${title}"
    >
      <!-- Thumbnail -->
      <div class="aspect-[16/9] bg-gray-100">
        ${
          thumb
            ? `<img src="${thumb}" alt="${title}" width="640" height="360" class="w-full h-full object-cover" loading="lazy" decoding="async" />`
            : `<div class="w-full h-full flex items-center justify-center text-xs text-gray-400">No image</div>`
        }
      </div>

      <!-- Content -->
      <div class="p-4 flex flex-col h-full">
        <h3 class="font-semibold text-brand-primary text-sm md:text-base line-clamp-2">${title}</h3>

        <div class="mt-2 text-xs text-gray-500 flex flex-wrap items-center gap-2">
          ${category ? `<span class="pill pill-green">${category}</span>` : ""}
          ${created ? `<span>${created}</span>` : ""}
        </div>
      </div>
    </a>
  `;
}
