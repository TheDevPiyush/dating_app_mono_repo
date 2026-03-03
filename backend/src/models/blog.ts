

import mongoose from "mongoose";

const blogSchema = new mongoose.Schema({
    title:{
        type:String,
        required:true
    },
    excerpt:{
        type:String,
        required:true
    },
    slug:{
        type:String,
        required:true,
        unique:true
    },
    content:{
        type:String,
        required:true
    },
    imageURLS:[
        {
            type:String,
            required:true
        }
    ],
    keywords:[
        {
            type:String,
        }
    ],
    publishedAt:{
        type:Date,
    },
    isDeleted:{
        type:Boolean,
        default:false
    }
},{timestamps:true})

 blogSchema.index({slug:1});

const Blog = mongoose.model("Blog",blogSchema);
export type BlogType = mongoose.InferSchemaType<typeof blogSchema>;

export default Blog;

