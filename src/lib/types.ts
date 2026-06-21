export type Level = "beginner" | "intermediate" | "advanced";

export interface Lesson {
  id: string;
  title: string;
  type: "video" | "article" | "pdf" | "quiz";
  durationSec: number;
  isPreview: boolean;
  videoId?: string;
}

export interface Section {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  slug: string;
  thumb: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  level: Level;
  price: number; // VND, 0 = free
  comparePrice?: number;
  totalMinutes: number;
  lessonsCount: number;
  rating: number;
  ratingCount: number;
  students: number;
  likes: number;
  instructor: string;
  source?: string;
  sections: Section[];
  whatYouLearn: string[];
  seoTitle?: string;
  seoDescription?: string;
}

export interface Post {
  id: string;
  author: string;
  avatarColor: string;
  time: string;
  body: string;
  image?: string;
  likes: number;
  comments: number;
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  readMin: number;
  date: string;
  body: string;
}

export const LEVEL_LABEL: Record<Level, string> = {
  beginner: "Cơ bản",
  intermediate: "Trung cấp",
  advanced: "Nâng cao",
};
