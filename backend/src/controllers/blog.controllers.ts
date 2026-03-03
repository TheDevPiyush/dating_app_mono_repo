//create a new blog post
import {  type Request,type Response } from "express";
import Blog from "../models/blog";

const authorizeUser = (token:string) => {
    const privateKey = process.env.BLOG_TOKEN_KEY 
    if (token === privateKey) {
        return true;
    }
    return false;
}

export const createBlog = async (req: Request, res: Response) => {
    const { title, excerpt, slug, content, imageURLS, keywords, token } = req.body;
    if (!title || !excerpt || !slug || !content || !imageURLS) {
        return res.status(400).json({ message: "All fields are required" });
    }
    if (!authorizeUser(token)) {
        return res.status(401).json({ message: "Unauthorized access" });
    }
    try {
        const existingBlog = await Blog.findOne({ slug });
        if (existingBlog) {
            return res.status(400).json({ message: "Blog with this slug already exists" });
        }
        const newBlog = new Blog({
            title,
            excerpt,
            slug,
            content,
            imageURLS,
            keywords
        });
        
        await newBlog.save();
        res.status(201).json({ message: "Blog created successfully", blog: newBlog });
    } catch (error) {
        console.error("Error creating blog:", error);
        res.status(500).json({ message: "Internal server error" });
    }   
}

//update a blog post
export const updateBlog = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, excerpt, slug, content, imageURLS, keywords, token  } = req.body;
    if (!authorizeUser(token)) {
        return res.status(401).json({ message: "Unauthorized access" });
    }
    try {
        const blog = await Blog.findById(id);
        if (!blog) {
            return res.status(404).json({ message: "Blog not found" });
        }
        if (title) blog.title = title;
        if (excerpt) blog.excerpt = excerpt;
        if (slug) blog.slug = slug;
        if (content) blog.content = content;
        if (imageURLS) blog.imageURLS = imageURLS;
        if (keywords) blog.keywords = keywords;
        await blog.save();
        res.status(200).json({ message: "Blog updated successfully", blog });
    } catch (error) {
        console.error("Error updating blog:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

//delete a blog post
export const deleteBlog = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { token } = req.body;
    if (!authorizeUser(token)) {
        return res.status(401).json({ message: "Unauthorized access" });
    }
    try {
        const blog = await Blog.findById(id);
        if (!blog) {
            return res.status(404).json({ message: "Blog not found" });
        }
        blog.isDeleted = true;
        await blog.save();
        res.status(200).json({ message: "Blog deleted successfully" });
    } catch (error) {
        console.error("Error deleting blog:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}  

//get all blog posts
export const getBlogs = async (req: Request, res: Response) => {
    try {
        const blogs = await Blog.find({ isDeleted: false }).sort({ publishedAt: -1 })
        .lean()
        res.status(200).json({ blogs });
    } catch (error) {
        console.error("Error fetching blogs:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

//get a single blog post by slug
export const getBlogBySlug = async (req: Request, res: Response) => {
    const { slug } = req.params;
    try {
    const blog = await Blog.findOne({ slug, isDeleted: false })
    .select('-__v -isDeleted -createdAt -updatedAt -_id')
    .lean();
        if (!blog) {
            return res.status(404).json({ message: "Blog not found" });
        }
        res.status(200).json({ blog });
    } catch (error) {
        console.error("Error fetching blog:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}  