// scripts/downloadCategoryIcons.mjs
import fs from "fs";
import path from "path";
import https from "https";

const icons = [
    "spiral-notepad",
//   "laptop",
//   "floppy-disk",
//   "shopping-bags",
//   "green-heart",
//   "house",
//   "lipstick",
//   "person-running",
//   "fork-and-knife-with-plate",
//   "handshake",
//   "bank",
//   "graduation-cap",
//   "video-game",
//   "artist-palette",
//   "automobile",
//   "paw-prints",
//   "cherries",
//   "cigarette",
//   "airplane",
//   "puzzle-piece",
//   "printer",
//   "headphone",
//   "camera",
//   "computer-mouse",
//   "desktop-computer",
//   "small-airplane",
//   "joystick",
//   "mobile-phone",
//   "satellite-antenna",
//   "camera-with-flash",
//   "battery",
//   "house-with-garden",
//   "watch",
//   "television",
//   "electric-plug",
//   "robot",
//   "briefcase",
//   "card-index",
//   "locked-with-key",
//   "shopping-cart",
//   "envelope",
//   "bar-chart",
//   "framed-picture",
//   "memo",
//   "clipboard",
//   "magnifying-glass-tilted-left",
//   "speech-balloon",
//   "clapper-board",
//   "shield",
//   "cloud",
//   "hammer-and-wrench",
//   "running-shoe",
//   "baby-chick",
//   "luggage",
//   "hiking-boot",
//   "t-shirt",
//   "crown",
//   "necktie",
//   "handbag",
//   "top-hat",
//   "ring",
//   "bikini",
//   "gem-stone",
//   "hoodie",
//   "seedling",
//   "dress",
//   "leaf-fluttering-in-wind",
//   "pill",
//   "droplet",
//   "flexed-biceps",
//   "stethoscope",
//   "herb",
//   "tooth",
//   "scales",
//   "sparkles",
//   "bed",
//   "soap",
//   "cooking",
//   "recycling-symbol",
//   "couch-and-lamp",
//   "potted-plant",
//   "teapot",
//   "light-bulb",
//   "lounge-chair",
//   "hammer",
//   "bouquet",
//   "barber-pole",
//   "woman-blonde-hair",
//   "nail-polish",
//   "lotion-bottle",
//   "tent",
//   "bicycle",
//   "fishing-pole",
//   "weight-lifter",
//   "flag-in-hole",
//   "bow-and-arrow",
//   "sports-medal",
//   "military-helmet",
//   "person-in-lotus-position",
//   "hot-beverage",
//   "green-salad",
//   "fork-and-knife",
//   "cheese-wedge",
//   "wine-glass",
//   "chart-increasing",
//   "megaphone",
//   "pencil",
//   "gear",
//   "balance-scale",
//   "globe-with-meridians",
//   "classical-building",
//   "coin",
//   "credit-card",
//   "money-with-wings",
//   "books",
//   "open-book",
//   "game-die",
//   "key",
//   "teddy-bear",
//   "crayon",
//   "scissors",
//   "musical-notes",
//   "paintbrush",
//   "wrench",
//   "motorcycle",
//   "racing-car",
//   "cat-face",
//   "dog-face",
//   "bone",
//   "bathtub",
//   "fire",
//   "heart",
//   "sparkling-heart",
//   "cannabis",
//   "hotel",
//   "coat",
//   "paperclip",
//   "shopping-bags",
];

const unique = [...new Set(icons)];
const outDir = "./public/icons/categories";
fs.mkdirSync(outDir, { recursive: true });

let done = 0;
for (const icon of unique) {
  const url = `https://api.iconify.design/fluent-emoji/${icon}.svg`;
  const dest = path.join(outDir, `${icon}.svg`);
  if (fs.existsSync(dest)) {
    done++;
    continue;
  }
  await new Promise((resolve) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          console.log(`✓ ${icon}`);
          resolve();
        });
      })
      .on("error", (e) => {
        console.error(`✗ ${icon}:`, e.message);
        resolve();
      });
  });
  done++;
}
console.log(`Done: ${done}/${unique.length}`);
