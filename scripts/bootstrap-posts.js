const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const sourcePath = path.join(root, 'roadmapclosedbeta.html');
const outputPath = path.join(root, 'posts.json');

const html = fs.readFileSync(sourcePath, 'utf-8');

function extract(regex) {
  const match = html.match(regex);
  return match ? match[1].trim() : '';
}

const title = extract(/<h1 class="blog-title">([\s\S]*?)<\/h1>/);
const displayDate = extract(/<span class="blog-date">([\s\S]*?)<\/span>/);
const category = extract(/<span class="blog-tag">([\s\S]*?)<\/span>/);
const headerImageUrl = extract(/<div class="blogheadimage[^"]*">\s*<img\s+src="([^"]+)"/);
const contentMatch = html.match(/<div class="blog-body">([\s\S]*?)<\/div>\s*<\/article>/);
const content = contentMatch ? contentMatch[1].trim() : '';

const posts = [
  {
    slug: 'roadmapclosedbeta',
    title,
    category,
    displayDate,
    publishedAt: displayDate ? new Date(displayDate).toISOString() : new Date().toISOString(),
    thumbnailUrl: 'https://i.imgur.com/W9Xs4Yl.png',
    headerImageUrl,
    summary: 'Closed beta roadmap details, character plans, and Pirate Arena design philosophy.',
    content
  }
];

fs.writeFileSync(outputPath, JSON.stringify(posts, null, 2));
console.log(`Created ${outputPath} with ${posts.length} posts`);

