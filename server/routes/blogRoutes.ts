import { Router, Request, Response } from 'express';
import { ArticleModel, inMemoryArticles } from '../models/Article';
import { requireAuth, requireRole } from '../middleware/auth';
import { isDbConnected } from '../db';

const router = Router();

const BLOG_STAFF_ROLES = ['super_admin', 'admin', 'catalog_manager'] as const;

function slugifyTitle(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `article-${Date.now()}`
  );
}

// Seed initial articles into MongoDB if connected and empty
let articlesSeeded = false;
async function ensureArticlesSeeded() {
  if (articlesSeeded || !isDbConnected()) return;
  try {
    const count = await ArticleModel.countDocuments();
    if (count === 0) {
      for (const a of inMemoryArticles) {
        await ArticleModel.create({
          title: a.title,
          slug: a.slug,
          excerpt: a.excerpt,
          content: a.content,
          coverImage: a.coverImage,
          category: a.category,
          author: a.author,
          readTimeMinutes: a.readTimeMinutes,
          publishedAt: new Date(a.publishedAt),
          featured: a.featured,
          tags: a.tags,
          viewsCount: a.viewsCount,
        });
      }
    }
    articlesSeeded = true;
  } catch (err: any) {
    console.warn('[Blog] Article seed warning:', err.message);
  }
}

/**
 * GET /api/blog
 * Fetch blog articles with category, tag, search, and featured filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    await ensureArticlesSeeded();

    const { category, tag, search, featured } = req.query;

    let articles: any[] = [...inMemoryArticles];

    if (isDbConnected()) {
      try {
        const query: any = {};
        if (category && category !== 'all') {
          query.category = { $regex: new RegExp(`^${category}$`, 'i') };
        }
        if (tag) {
          query.tags = tag;
        }
        if (featured === 'true') {
          query.featured = true;
        }
        if (search) {
          const s = String(search).trim();
          query.$or = [
            { title: { $regex: s, $options: 'i' } },
            { excerpt: { $regex: s, $options: 'i' } },
            { tags: { $regex: s, $options: 'i' } },
          ];
        }

        const dbArticles = await ArticleModel.find(query).sort({ publishedAt: -1 }).lean();
        if (dbArticles && dbArticles.length > 0) {
          articles = dbArticles.map((a: any) => ({
            ...a,
            id: a._id ? a._id.toString() : a.id,
          }));
        }
      } catch (err: any) {
        console.warn('[Blog] DB query error, using in-memory articles:', err.message);
      }
    }

    // In-memory filter fallback
    if (category && category !== 'all') {
      articles = articles.filter(
        (a) => a.category.toLowerCase() === String(category).toLowerCase()
      );
    }
    if (tag) {
      articles = articles.filter((a) =>
        a.tags?.some((t: string) => t.toLowerCase() === String(tag).toLowerCase())
      );
    }
    if (featured === 'true') {
      articles = articles.filter((a) => a.featured);
    }
    if (search) {
      const q = String(search).toLowerCase();
      articles = articles.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.excerpt.toLowerCase().includes(q) ||
          a.tags?.some((t: string) => t.toLowerCase().includes(q))
      );
    }

    res.json({
      success: true,
      data: articles,
      count: articles.length,
    });
  } catch (err: any) {
    console.error('[Blog List Error]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch articles' });
  }
});

/**
 * GET /api/blog/:slug
 * Fetch single article by slug and increment views
 */
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    await ensureArticlesSeeded();
    const { slug } = req.params;

    let article = inMemoryArticles.find((a) => a.slug === slug);

    if (isDbConnected()) {
      try {
        const dbArticle = await ArticleModel.findOneAndUpdate(
          { slug },
          { $inc: { viewsCount: 1 } },
          { new: true }
        ).lean();

        if (dbArticle) {
          article = {
            ...dbArticle,
            id: dbArticle._id ? dbArticle._id.toString() : (dbArticle as any).id,
          } as any;
        }
      } catch (err: any) {
        console.warn('[Blog] Single article DB fetch fallback:', err.message);
      }
    } else if (article) {
      article.viewsCount = (article.viewsCount || 0) + 1;
    }

    if (!article) {
      res.status(404).json({ success: false, error: 'Article not found' });
      return;
    }

    const related = inMemoryArticles
      .filter((a) => a.slug !== slug && a.category === article?.category)
      .slice(0, 3);

    res.json({
      success: true,
      data: article,
      related,
    });
  } catch (err: any) {
    console.error('[Blog Single Error]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch article details' });
  }
});

/**
 * POST /api/blog
 * Admin: Publish a new editorial blog article
 */
router.post(
  '/',
  requireAuth,
  requireRole([...BLOG_STAFF_ROLES]),
  async (req: Request, res: Response) => {
    try {
      const {
        title,
        slug: customSlug,
        excerpt,
        content,
        coverImage,
        category = 'Technology',
        readTimeMinutes = 5,
        featured = false,
        tags = [],
        authorName,
      } = req.body || {};

      if (!title || !excerpt || !content) {
        res.status(400).json({
          success: false,
          error: 'Title, excerpt, and article content are required.',
        });
        return;
      }

      const baseSlug = slugifyTitle(customSlug || title);
      const uniqueSlug = inMemoryArticles.some((a) => a.slug === baseSlug)
        ? `${baseSlug}-${Date.now().toString(36)}`
        : baseSlug;

      const parsedTags = Array.isArray(tags)
        ? tags.map((t) => String(t).trim()).filter(Boolean)
        : String(tags || '')
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);

      const newArticle: any = {
        id: `art-${Date.now().toString(36)}`,
        title: String(title).trim(),
        slug: uniqueSlug,
        excerpt: String(excerpt).trim(),
        content: String(content).trim(),
        coverImage:
          coverImage ||
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1000&q=80',
        category: String(category).trim(),
        author: {
          name: authorName || (req as any).user?.name || 'Novara Editorial',
          role: 'Editorial Desk',
          avatar:
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        },
        readTimeMinutes: Math.max(1, Number(readTimeMinutes) || 5),
        publishedAt: new Date().toISOString(),
        featured: Boolean(featured),
        tags: parsedTags.length > 0 ? parsedTags : ['Storefront'],
        viewsCount: 0,
      };

      if (isDbConnected()) {
        try {
          const created = await ArticleModel.create({
            ...newArticle,
            publishedAt: new Date(newArticle.publishedAt),
          });
          newArticle.id = created._id.toString();
        } catch (err: any) {
          console.warn('[Blog Create DB Warning]:', err.message);
        }
      }

      inMemoryArticles.unshift(newArticle);

      res.status(201).json({
        success: true,
        message: 'Article published to storefront blog.',
        data: newArticle,
      });
    } catch (err: any) {
      console.error('[Blog Create Error]', err);
      res.status(500).json({ success: false, error: 'Failed to create article' });
    }
  }
);

/**
 * PUT /api/blog/:id
 * Admin: Update an existing blog article
 */
router.put(
  '/:id',
  requireAuth,
  requireRole([...BLOG_STAFF_ROLES]),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body || {};

      const idx = inMemoryArticles.findIndex((a) => a.id === id || a.slug === id);
      if (idx === -1 && !isDbConnected()) {
        res.status(404).json({ success: false, error: 'Article not found' });
        return;
      }

      const parsedTags =
        updates.tags !== undefined
          ? Array.isArray(updates.tags)
            ? updates.tags.map((t: any) => String(t).trim()).filter(Boolean)
            : String(updates.tags)
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
          : undefined;

      if (idx >= 0) {
        const existing = inMemoryArticles[idx];
        inMemoryArticles[idx] = {
          ...existing,
          title: updates.title ? String(updates.title).trim() : existing.title,
          excerpt: updates.excerpt ? String(updates.excerpt).trim() : existing.excerpt,
          content: updates.content ? String(updates.content).trim() : existing.content,
          coverImage: updates.coverImage || existing.coverImage,
          category: updates.category || existing.category,
          readTimeMinutes:
            updates.readTimeMinutes !== undefined
              ? Math.max(1, Number(updates.readTimeMinutes) || 5)
              : existing.readTimeMinutes,
          featured:
            updates.featured !== undefined ? Boolean(updates.featured) : existing.featured,
          tags: parsedTags !== undefined ? parsedTags : existing.tags,
        };
      }

      if (isDbConnected()) {
        try {
          await ArticleModel.findOneAndUpdate(
            { $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : undefined }, { slug: id }].filter((c) => Object.values(c)[0] !== undefined) },
            {
              $set: {
                ...(updates.title ? { title: String(updates.title).trim() } : {}),
                ...(updates.excerpt ? { excerpt: String(updates.excerpt).trim() } : {}),
                ...(updates.content ? { content: String(updates.content).trim() } : {}),
                ...(updates.coverImage ? { coverImage: updates.coverImage } : {}),
                ...(updates.category ? { category: updates.category } : {}),
                ...(updates.readTimeMinutes !== undefined
                  ? { readTimeMinutes: Math.max(1, Number(updates.readTimeMinutes) || 5) }
                  : {}),
                ...(updates.featured !== undefined ? { featured: Boolean(updates.featured) } : {}),
                ...(parsedTags !== undefined ? { tags: parsedTags } : {}),
              },
            }
          );
        } catch (err: any) {
          console.warn('[Blog Update DB Warning]:', err.message);
        }
      }

      res.json({
        success: true,
        message: 'Article updated successfully.',
        data: idx >= 0 ? inMemoryArticles[idx] : updates,
      });
    } catch (err: any) {
      console.error('[Blog Update Error]', err);
      res.status(500).json({ success: false, error: 'Failed to update article' });
    }
  }
);

/**
 * DELETE /api/blog/:id
 * Admin: Delete a blog article
 */
router.delete(
  '/:id',
  requireAuth,
  requireRole([...BLOG_STAFF_ROLES]),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const idx = inMemoryArticles.findIndex((a) => a.id === id || a.slug === id);
      if (idx >= 0) {
        inMemoryArticles.splice(idx, 1);
      }

      if (isDbConnected()) {
        try {
          if (id.match(/^[0-9a-fA-F]{24}$/)) {
            await ArticleModel.findByIdAndDelete(id);
          } else {
            await ArticleModel.findOneAndDelete({ slug: id });
          }
        } catch (err: any) {
          console.warn('[Blog Delete DB Warning]:', err.message);
        }
      }

      res.json({
        success: true,
        message: 'Article removed from storefront blog.',
      });
    } catch (err: any) {
      console.error('[Blog Delete Error]', err);
      res.status(500).json({ success: false, error: 'Failed to delete article' });
    }
  }
);

export default router;
