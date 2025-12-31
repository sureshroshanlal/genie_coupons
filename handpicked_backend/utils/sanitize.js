// utils/sanitize.js
import createDOMPurify from "isomorphic-dompurify";
import { JSDOM } from "jsdom";

// Single JSDOM window shared
const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

// Expanded but still conservative set of allowed tags for editor output
const ALLOWED_TAGS = [
  "h1","h2","h3","h4","h5","h6",
  "p",
  "br",
  "strong","b",
  "em","i",
  "u","s",
  "ul","ol","li",
  "a",
  "blockquote",
  "code","pre",
  "img","figure","figcaption",
  "span"
];

// Minimal safe attributes (keeps links and images usable)
// Note: 'class' is included because Quill may output useful classes (keep if you rely on them)
const ALLOWED_ATTR = [
  "href",
  "title",
  "target",
  "rel",
  "src",
  "alt",
  "width",
  "height",
  "class",
  "aria-label"
];

export function sanitize(html) {
  if (!html) return "";
  return DOMPurify.sanitize(String(html), {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ADD_ATTR: ["loading"], // allow loading="lazy" etc. on images
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed"],
    FORBID_ATTR: ["onerror", "onclick", "onload", "onmouseover", "onfocus", "onblur"]
  });
}

export default sanitize;
