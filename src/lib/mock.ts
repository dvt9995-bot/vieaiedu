import type { Course, Post, BlogPost } from "./types";

function lessons(prefix: string, items: [string, number, boolean?][]) {
  return items.map(([title, durationSec, isPreview], i) => ({
    id: `${prefix}-${i}`,
    title,
    type: "video" as const,
    durationSec,
    isPreview: !!isPreview,
    videoId: `${prefix}-${i}`,
  }));
}

export const COURSES: Course[] = [
  {
    id: "c1",
    slug: "nhap-mon-tri-tue-nhan-tao",
    thumb: "/courses/nhap-mon-tri-tue-nhan-tao.jpg",
    title: "Nhập môn Trí tuệ Nhân tạo",
    subtitle: "Hiểu AI từ con số 0, không cần nền tảng kỹ thuật",
    description:
      "Khóa học đưa bạn đi từ khái niệm cơ bản nhất của AI tới cách ứng dụng vào công việc hằng ngày. Học qua ví dụ thực tế, không nặng toán.",
    category: "Cơ bản",
    level: "beginner",
    price: 499000,
    comparePrice: 899000,
    totalMinutes: 270,
    lessonsCount: 32,
    rating: 4.8,
    ratingCount: 412,
    students: 1240,
    likes: 1240,
    instructor: "Long Nam",
    whatYouLearn: [
      "Hiểu AI, Machine Learning, LLM là gì và khác nhau ra sao",
      "Dùng ChatGPT/Claude hiệu quả cho công việc",
      "Nhận biết khi nào nên và không nên dùng AI",
      "Xây thói quen làm việc cùng AI",
    ],
    sections: [
      {
        id: "c1-s1",
        title: "Bắt đầu với AI",
        lessons: lessons("c1-s1", [
          ["AI thực sự là gì?", 540, true],
          ["Lịch sử ngắn gọn của AI", 420, true],
          ["Machine Learning vs Deep Learning", 600],
        ]),
      },
      {
        id: "c1-s2",
        title: "AI trong thực tế",
        lessons: lessons("c1-s2", [
          ["LLM hoạt động thế nào", 720],
          ["Ứng dụng AI trong công việc", 660],
          ["Giới hạn & rủi ro của AI", 480],
        ]),
      },
    ],
  },
  {
    id: "c2",
    slug: "prompt-engineering-thuc-chien",
    thumb: "/courses/prompt-engineering-thuc-chien.jpg",
    title: "Prompt Engineering thực chiến",
    subtitle: "Viết prompt cho kết quả chính xác, lặp lại được",
    description:
      "Làm chủ nghệ thuật ra lệnh cho AI: few-shot, chain-of-thought, system prompt, và quy trình tối ưu prompt cho công việc thật.",
    category: "Phổ biến",
    level: "intermediate",
    price: 699000,
    comparePrice: 1299000,
    totalMinutes: 360,
    lessonsCount: 41,
    rating: 4.9,
    ratingCount: 833,
    students: 2380,
    likes: 2380,
    instructor: "Long Nam",
    whatYouLearn: [
      "Cấu trúc một prompt tốt",
      "Kỹ thuật few-shot & chain-of-thought",
      "Xây thư viện prompt cho nhóm",
      "Tự động hóa quy trình bằng prompt",
    ],
    sections: [
      {
        id: "c2-s1",
        title: "Nền tảng prompt",
        lessons: lessons("c2-s1", [
          ["Tư duy khi viết prompt", 480, true],
          ["Cấu trúc prompt 5 phần", 600, true],
          ["Vai trò của system prompt", 540],
        ]),
      },
      {
        id: "c2-s2",
        title: "Kỹ thuật nâng cao",
        lessons: lessons("c2-s2", [
          ["Few-shot prompting", 720],
          ["Chain-of-thought", 660],
          ["Tối ưu & đánh giá prompt", 600],
        ]),
      },
    ],
  },
  {
    id: "c3",
    slug: "xay-chatbot-ai-cho-doanh-nghiep",
    thumb: "/courses/xay-chatbot-ai-cho-doanh-nghiep.jpg",
    title: "Xây Chatbot AI cho doanh nghiệp",
    subtitle: "RAG, tích hợp dữ liệu nội bộ, triển khai thực tế",
    description:
      "Xây chatbot trả lời dựa trên tài liệu nội bộ doanh nghiệp với kiến trúc RAG, từ thiết kế tới triển khai.",
    category: "Nâng cao",
    level: "advanced",
    price: 1199000,
    totalMinutes: 480,
    lessonsCount: 56,
    rating: 4.7,
    ratingCount: 211,
    students: 870,
    likes: 870,
    instructor: "Long Nam",
    whatYouLearn: [
      "Kiến trúc RAG đầu-cuối",
      "Embedding & vector database",
      "Tích hợp dữ liệu nội bộ an toàn",
      "Triển khai & giám sát chatbot",
    ],
    sections: [
      {
        id: "c3-s1",
        title: "Nền tảng RAG",
        lessons: lessons("c3-s1", [
          ["RAG là gì và vì sao cần", 540, true],
          ["Embedding & vector search", 720],
          ["Chia nhỏ tài liệu (chunking)", 600],
        ]),
      },
    ],
  },
  {
    id: "c4",
    slug: "ai-tao-anh-va-video",
    thumb: "/courses/ai-tao-anh-va-video.jpg",
    title: "AI tạo ảnh & video sáng tạo",
    subtitle: "Từ ý tưởng tới hình ảnh, video chuyên nghiệp",
    description:
      "Thành thạo các công cụ AI tạo ảnh và video: prompt hình ảnh, kiểm soát phong cách, hậu kỳ cơ bản.",
    category: "Sáng tạo",
    level: "beginner",
    price: 599000,
    comparePrice: 999000,
    totalMinutes: 300,
    lessonsCount: 38,
    rating: 4.8,
    ratingCount: 540,
    students: 1690,
    likes: 1690,
    instructor: "Long Nam",
    whatYouLearn: [
      "Prompt cho hình ảnh chất lượng cao",
      "Kiểm soát phong cách & bố cục",
      "Tạo video ngắn bằng AI",
      "Quy trình sáng tạo nội dung",
    ],
    sections: [
      {
        id: "c4-s1",
        title: "Tạo ảnh bằng AI",
        lessons: lessons("c4-s1", [
          ["Tổng quan công cụ", 420, true],
          ["Prompt hình ảnh hiệu quả", 600],
        ]),
      },
    ],
  },
  {
    id: "c5",
    slug: "phan-tich-du-lieu-voi-ai",
    thumb: "/courses/phan-tich-du-lieu-voi-ai.png",
    title: "Phân tích dữ liệu với AI",
    subtitle: "Tự động hóa báo cáo và insight",
    description:
      "Dùng AI để làm sạch, phân tích và trực quan hóa dữ liệu, tạo báo cáo tự động mà không cần code nhiều.",
    category: "Dữ liệu",
    level: "intermediate",
    price: 899000,
    totalMinutes: 420,
    lessonsCount: 47,
    rating: 4.6,
    ratingCount: 168,
    students: 540,
    likes: 540,
    instructor: "Long Nam",
    whatYouLearn: [
      "Làm sạch dữ liệu bằng AI",
      "Phân tích & tìm insight",
      "Trực quan hóa dữ liệu",
      "Tự động hóa báo cáo định kỳ",
    ],
    sections: [
      {
        id: "c5-s1",
        title: "Bắt đầu",
        lessons: lessons("c5-s1", [["Quy trình phân tích với AI", 540, true]]),
      },
    ],
  },
  {
    id: "c6",
    slug: "nhap-mon-ai-mien-phi",
    thumb: "/courses/nhap-mon-ai-mien-phi.jpg",
    title: "AI cho người mới — Khóa miễn phí",
    subtitle: "Khởi động hành trình AI của bạn, hoàn toàn miễn phí",
    description:
      "Khóa nhập môn miễn phí giúp bạn làm quen với AI và quyết định hướng học tiếp theo.",
    category: "Miễn phí",
    level: "beginner",
    price: 0,
    totalMinutes: 90,
    lessonsCount: 10,
    rating: 4.9,
    ratingCount: 1024,
    students: 8200,
    likes: 4100,
    instructor: "Long Nam",
    whatYouLearn: [
      "Khái niệm AI cốt lõi",
      "Trải nghiệm công cụ AI đầu tiên",
      "Định hướng lộ trình học",
    ],
    sections: [
      {
        id: "c6-s1",
        title: "Nhập môn",
        lessons: lessons("c6-s1", [
          ["Chào mừng tới VIE AI EDU", 240, true],
          ["AI quanh ta", 360, true],
          ["Bắt đầu học gì tiếp theo", 300, true],
        ]),
      },
    ],
  },
];

export function getCourse(slug: string) {
  return COURSES.find((c) => c.slug === slug);
}

export const POSTS: Post[] = [
  {
    id: "p1",
    author: "Minh Anh",
    avatarColor: "#e11d2a",
    time: "2 giờ trước",
    body: "Vừa xong khóa Prompt Engineering, áp dụng vào workflow tiết kiệm hẳn 3 tiếng mỗi ngày. Bài về few-shot prompting đáng giá nhất!",
    likes: 128,
    comments: 24,
  },
  {
    id: "p2",
    author: "Quốc Bảo",
    avatarColor: "#0b0c0e",
    time: "Hôm qua",
    body: "Mọi người nên học Chatbot trước hay Phân tích dữ liệu trước? Mình làm bên vận hành, muốn tự động hóa báo cáo.",
    likes: 56,
    comments: 41,
  },
  {
    id: "p3",
    author: "Thu Hà",
    avatarColor: "#e6a700",
    time: "2 ngày trước",
    body: "Chia sẻ pipeline RAG mình build sau khóa Xây AI Agent — truy vấn tài liệu nội bộ chính xác hơn hẳn.",
    image: "Sơ đồ kiến trúc RAG",
    likes: 342,
    comments: 67,
  },
];

export const BLOG: BlogPost[] = [
  {
    slug: "5-prompt-tang-nang-suat",
    title: "5 prompt giúp bạn tăng năng suất ngay hôm nay",
    excerpt: "Những mẫu prompt đơn giản nhưng hiệu quả cho công việc văn phòng.",
    readMin: 6,
    date: "12/06/2026",
    body: "Nội dung bài viết mẫu về 5 prompt tăng năng suất...",
  },
  {
    slug: "rag-la-gi",
    title: "RAG là gì? Giải thích dễ hiểu cho người không chuyên",
    excerpt: "Hiểu kiến trúc giúp chatbot trả lời chính xác dựa trên tài liệu của bạn.",
    readMin: 8,
    date: "05/06/2026",
    body: "Nội dung bài viết mẫu về RAG...",
  },
  {
    slug: "lo-trinh-hoc-ai-2026",
    title: "Lộ trình học AI cho người mới năm 2026",
    excerpt: "Từ nhập môn tới xây sản phẩm — nên học gì, theo thứ tự nào.",
    readMin: 10,
    date: "28/05/2026",
    body: "Nội dung bài viết mẫu về lộ trình học AI...",
  },
];

export function getBlog(slug: string) {
  return BLOG.find((b) => b.slug === slug);
}

// Mock quiz cho trang học
export const SAMPLE_QUIZ = {
  title: "Kiểm tra nhanh: Nền tảng AI",
  passScore: 70,
  questions: [
    {
      question: "LLM là viết tắt của?",
      options: ["Large Language Model", "Long Learning Machine", "Linear Logic Model", "Local Language Map"],
      correct: 0,
    },
    {
      question: "Kỹ thuật cho AI vài ví dụ mẫu trong prompt gọi là?",
      options: ["Zero-shot", "Few-shot", "Fine-tune", "Embedding"],
      correct: 1,
    },
    {
      question: "RAG giúp chatbot làm gì?",
      options: [
        "Tạo ảnh đẹp hơn",
        "Trả lời dựa trên tài liệu riêng",
        "Chạy nhanh hơn",
        "Dịch ngôn ngữ",
      ],
      correct: 1,
    },
  ],
};
