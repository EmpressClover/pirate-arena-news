require('dotenv').config();
const express = require('express');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const DATA_FILE = path.join(__dirname, 'posts.json');

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

function slugify(value = '') {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function writePosts(posts) {
  await fs.writeFile(DATA_FILE, JSON.stringify(posts, null, 2));
}

async function readPosts() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return Array.isArray(parsed)
      ? parsed.map((post) => {
          if (!post || typeof post !== 'object') {
            return post;
          }
          const headerImageUrl = post.headerImageUrl || post.heroImageUrl || '';
          const cleaned = { ...post };
          cleaned.headerImageUrl = headerImageUrl;
          delete cleaned.heroImageUrl;
          return cleaned;
        })
      : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      await writePosts([]);
      return [];
    }
    throw error;
  }
}

app.get('/api/posts', async (req, res) => {
  try {
    const posts = await readPosts();
    const sortedPosts = [...posts].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    const limitParam = Number.parseInt(req.query.limit, 10);
    const responsePayload = Number.isNaN(limitParam) || limitParam <= 0
      ? sortedPosts
      : sortedPosts.slice(0, limitParam);

    res.json(responsePayload);
  } catch (error) {
    console.error('Failed to load posts', error);
    res.status(500).json({ error: 'Failed to load posts' });
  }
});

app.get('/api/posts/:slug', async (req, res) => {
  try {
    const posts = await readPosts();
    const post = posts.find((item) => item.slug === req.params.slug);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json(post);
  } catch (error) {
    console.error('Failed to load post', error);
    res.status(500).json({ error: 'Failed to load post' });
  }
});

app.post('/api/posts', async (req, res) => {
  try {
    if (!ADMIN_PASSWORD) {
      return res.status(500).json({ error: 'Server password not configured' });
    }

    const {
      password,
      title,
      category,
      displayDate,
      thumbnailUrl,
      headerImageUrl,
      summary,
      content,
      slug: providedSlug,
      publishedAt
    } = req.body;

    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const slug = providedSlug ? slugify(providedSlug) : slugify(title);

    if (!slug) {
      return res.status(400).json({ error: 'Unable to derive slug from title. Provide a slug manually.' });
    }

    const posts = await readPosts();

    if (posts.some((post) => post.slug === slug)) {
      return res.status(409).json({ error: 'A post with that slug already exists' });
    }

    const isoDate = publishedAt
      ? new Date(publishedAt).toISOString()
      : new Date().toISOString();

    const resolvedHeaderImageUrl = headerImageUrl || thumbnailUrl || '';

    const newPost = {
      slug,
      title,
      category: category || '',
      displayDate: displayDate || new Date(isoDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      publishedAt: isoDate,
      thumbnailUrl: thumbnailUrl || resolvedHeaderImageUrl,
      headerImageUrl: resolvedHeaderImageUrl,
      summary: summary || '',
      content
    };

    const updatedPosts = [newPost, ...posts].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    await writePosts(updatedPosts);

    res.status(201).json(newPost);
  } catch (error) {
    console.error('Failed to create post', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

app.use(express.static(path.join(__dirname)));

const htmlRouteMap = {
  '/': 'index.html',
  '/index': 'index.html',
  '/newsarchive': 'newsarchive.html',
  '/create-post': 'create-post.html',
  '/post': 'post.html'
};

Object.entries(htmlRouteMap).forEach(([route, file]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, file));
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'post.html'));
});

app.listen(PORT, () => {
  console.log(`Pirate Arena News server running on port ${PORT}`);
});
