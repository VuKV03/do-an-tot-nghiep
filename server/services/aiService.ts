import { Router } from "express";
import { GoogleGenAI, Type } from "@google/genai";

const router = Router();

// Helper to check and retrieve Gemini Client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Vui lòng cấu hình GEMINI_API_KEY trong Settings > Secrets để sử dụng các tính năng tạo sinh đề bằng AI.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

const logTraffic = (method: string, path: string, desc: string) => {
  console.log(`[AI Service] Trực cuộc gọi ${method} ${path} - ${desc}`);
};

// Robust utility with Retry option and Model fallbacks to insulate application from transient API errors (e.g., 503 / 429)
async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
  }
) {
  // Try stable 3.5 flash then fall back to high-availability 3.1 flash lite if demand spikes
  const candidateModels = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
  let lastError: any = null;

  for (const modelName of candidateModels) {
    let attemptsLeft = 3; // Retry up to 3 times per model
    while (attemptsLeft > 0) {
      try {
        console.log(`[AI Service] Gửi yêu cầu đến mô hình: ${modelName} (Còn ${attemptsLeft - 1} lần thử lại)`);
        const result = await ai.models.generateContent({
          model: modelName,
          contents: params.contents,
          config: params.config,
        });
        return result;
      } catch (err: any) {
        lastError = err;
        attemptsLeft--;
        const rawErrString = String(err.message || err).toLowerCase();
        console.warn(`[AI Service] Mô hình ${modelName} gặp lỗi:`, rawErrString);

        const isTransient =
          rawErrString.includes("503") ||
          rawErrString.includes("unavailable") ||
          rawErrString.includes("demand") ||
          rawErrString.includes("429") ||
          rawErrString.includes("limit") ||
          rawErrString.includes("overloaded") ||
          rawErrString.includes("rate") ||
          rawErrString.includes("fetch") ||
          rawErrString.includes("network") ||
          rawErrString.includes("socket");

        if (isTransient && attemptsLeft > 0) {
          const waitMs = (3 - attemptsLeft) * 1200;
          console.log(`[AI Service] Lỗi tạm thời (Transient error). Đợi ${waitMs}ms và thử lại...`);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        } else {
          // If not a transient error, or we ran out of attempts for this model, break and fallback to next model in line
          break;
        }
      }
    }
  }

  throw lastError || new Error("Mô hình AI hiện đang bận hoặc quá tải. Quý khách vui lòng thử lại sau giây lát.");
}

// API Endpoint to suggest exam main details (title, description, duration)
router.post("/suggest-info", async (req, res) => {
  logTraffic("POST", "/suggest-info", "Gợi ý thông số cấu hình đề thi");
  try {
    const { subject, grade, topic } = req.body;
    
    const finalSubject = subject || "Toán";
    const finalGrade = grade || "Lớp 12";
    const finalTopic = topic || "Kiến thức tổng hợp";

    let ai;
    try {
      ai = getGeminiClient();
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }

    const systemInstruction = `Bạn là trợ lý ảo cố vấn xây dựng cấu hình học thuật. Nhiệm vụ của bạn là đưa ra đề xuất cho:
- Tiêu đề kiểm tra (suggestedTitle) bám sát môn học ${finalSubject} lớp ${finalGrade}. Tiếng Việt chuẩn.
- Thời gian tối ưu (suggestedDuration) tính bằng số phút hợp lý (ví dụ: 15, 45, 60, 90).
- Mô tả tổng quan đề thi (suggestedDescription) khoa học, khái quát mục tiêu nhận thức học sinh đạt được.`;

    const prompt = `Gợi ý cấu hình đề thi môn ${finalSubject} khối ${finalGrade} với trọng tâm nội dung: ${finalTopic}.`;

    const response = await generateContentWithRetry(ai, {
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedTitle: { type: Type.STRING, description: "Tiêu đề mẫu đề thi lý tưởng tiếng Việt, bóng bẩy và chuyên nghiệp" },
            suggestedDuration: { type: Type.INTEGER, description: "Thời gian làm bài tối ưu tính bằng phút" },
            suggestedDescription: { type: Type.STRING, description: "Mô tả chất lượng cao về phạm vi ôn tập và chỉ dẫn học sinh làm bài" }
          },
          required: ["suggestedTitle", "suggestedDuration", "suggestedDescription"]
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Không nhận được nội dung trả về từ mô hình AI.");
    }

    const data = JSON.parse(responseText.trim());
    return res.json({ success: true, ...data });

  } catch (error: any) {
    console.error("AI Service - error in suggest-info:", error);
    return res.status(500).json({ success: false, error: "Lỗi kết nối AI: " + error.message });
  }
});

// API Endpoint to generate actual intelligent questions
router.post("/generate-questions", async (req, res) => {
  logTraffic("POST", "/generate-questions", "Tạo sinh gói câu hỏi trắc nghiệm");
  try {
    const { subject, grade, topic, count, easyPercent, mediumPercent, hardPercent } = req.body;
    
    const qCount = Math.min(Math.max(Number(count) || 5, 1), 15);
    const finalSubject = subject || "Toán";
    const finalGrade = grade || "Lớp 12";
    const finalTopic = topic || "Kiến thức tổng hợp";

    let ai;
    try {
      ai = getGeminiClient();
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }

    const systemInstruction = `Bạn là chuyên gia biên soạn đề kiểm tra chất lượng cao của Bộ Giáo dục và Đào tạo Việt Nam. Do đó, bạn hiểu rất rõ cấu trúc đề, ngữ nghĩa, và ma trận kiến thức chuẩn.
Hãy biên soạn đúng ${qCount} câu hỏi trắc nghiệm tiếng Việt chất lượng tốt cho môn học "${finalSubject}", mức độ "${finalGrade}" với trọng tâm kiến thức: "${finalTopic}".

Xếp loại cấu trúc:
- 'options' chứa đúng 4 đáp án văn bản ứng với A, B, C, D độc lập. Không chèn nhãn "A. ", "B. ", "C. ", "D. " hay ký tự tương ứng vào nội dung tùy chọn.
- 'correctAnswer' lưu đáp án đúng bằng chữ cái in hoa duy nhất ('A', 'B', 'C', hoặc 'D').
- 'level' tương ứng với mức nhận thức: 'easy' (Nhận biết/Dễ), 'medium' (Thông hiểu/Vừa), 'hard' (Vận dụng/Khó).`;

    const prompt = `Tạo đúng ${qCount} câu hỏi trắc nghiệm tiếng Việt môn ${finalSubject} lớp ${finalGrade} về nội dung: ${finalTopic}.
Phân chia tỉ lệ độ khó tương đương: 
- Dễ (Nhận biết): ${easyPercent || 40}%
- Vừa (Thông hiểu): ${mediumPercent || 40}%
- Khó (Vận dụng): ${hardPercent || 20}%`;

    const response = await generateContentWithRetry(ai, {
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.75,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING, description: "Nội dung câu hỏi sâu sắc, chính xác, không sai lệch lý thuyết" },
                  type: { type: Type.STRING, description: "Bắt buộc trả về là 'single'" },
                  level: { type: Type.STRING, description: "Mức độ khó, một trong: 'easy', 'medium', 'hard'" },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Chứa đúng 4 phương án đề xuất"
                  },
                  correctAnswer: { type: Type.STRING, description: "Ký tự in hoa đại diện đáp án chính xác nhất: 'A', 'B', 'C', 'D'" }
                },
                required: ["text", "type", "level", "options", "correctAnswer"]
              }
            }
          },
          required: ["questions"]
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Không nhận được nội dung trả về từ mô hình AI.");
    }

    const data = JSON.parse(responseText.trim());
    return res.json({ success: true, questions: data.questions });

  } catch (error: any) {
    console.error("AI Service - error in generate-questions:", error);
    return res.status(500).json({ success: false, error: "Lỗi kết nối AI: " + error.message });
  }
});

export default router;
