import Router from 'express';

const router = Router();
import { createBlog, updateBlog, deleteBlog, getBlogBySlug, getBlogs } from '../controllers/blog.controllers';

router.post('/blogs', createBlog);
router.put('/blogs/:id', updateBlog);
router.delete('/blogs/:id', deleteBlog);
router.get('/blogs', getBlogs);
router.get('/blogs/:slug', getBlogBySlug);

export default router;