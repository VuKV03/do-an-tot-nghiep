import { Router } from "express";
import { getPool } from "../db";

const router = Router();

export interface MockQuestion {
  text: string;
  type: string;
  level: string;
  options?: string[];
  correctAnswer: string;
}

export interface MockExam {
  id: string;
  code: string;
  name: string;
  subject: string;
  grade: string;
  status: "active" | "pending" | "draft" | "closed";
  attempts: number;
  totalQuestions: number;
  questions: MockQuestion[];
  avgScore: number;
  createdAt: string;
  duration: number; // minutes
  description?: string;
  source: "matrix" | "ai" | "manual";
}

export interface MockPackage {
  id: string;
  code: string;
  name: string;
  subject: string;
  grade: string;
  status: "active" | "inactive";
  examsCount: number;
  examIds: string[];
  downloadsCount: number;
  accessType: "free" | "standard" | "premium";
  createdAt: string;
  description?: string;
}

// Database-backed implementation
export async function getExamsList(): Promise<MockExam[]> {
  const pool = getPool();
  const [exams] = await pool.query('SELECT * FROM exams ORDER BY createdAt DESC');
  const [questions] = await pool.query('SELECT * FROM questions');
  
  const questionsByExamId: { [key: string]: MockQuestion[] } = {};
  for (const q of questions as any[]) {
    if (!questionsByExamId[q.examId]) {
      questionsByExamId[q.examId] = [];
    }
    let parsedOptions: string[] | undefined = undefined;
    if (q.options) {
      try {
        parsedOptions = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
      } catch (e) {
        parsedOptions = [];
      }
    }
    questionsByExamId[q.examId].push({
      text: q.text,
      type: q.type,
      level: q.level,
      options: parsedOptions,
      correctAnswer: q.correctAnswer
    });
  }

  return (exams as any[]).map(e => ({
    id: e.id,
    code: e.code,
    name: e.name,
    subject: e.subject,
    grade: e.grade,
    status: e.status,
    attempts: Number(e.attempts) || 0,
    totalQuestions: Number(e.totalQuestions) || 0,
    avgScore: Number(e.avgScore) || 0,
    createdAt: e.createdAt,
    duration: Number(e.duration) || 60,
    description: e.description || "",
    source: e.source,
    questions: questionsByExamId[e.id] || []
  }));
}

export async function getPackagesList(): Promise<MockPackage[]> {
  const pool = getPool();
  const [packages] = await pool.query('SELECT * FROM packages ORDER BY createdAt DESC');
  return (packages as any[]).map(p => {
    let examIds: string[] = [];
    if (p.examIds) {
      try {
        examIds = typeof p.examIds === 'string' ? JSON.parse(p.examIds) : p.examIds;
      } catch (e) {
        examIds = [];
      }
    }
    return {
      id: p.id,
      code: p.code,
      name: p.name,
      subject: p.subject,
      grade: p.grade,
      status: p.status,
      examsCount: Number(p.examsCount) || 0,
      examIds,
      downloadsCount: Number(p.downloadsCount) || 0,
      accessType: p.accessType,
      createdAt: p.createdAt,
      description: p.description || ""
    };
  });
}

// EXAMS REST SUITE
router.get("/", async (req, res) => {
  try {
    const exams = await getExamsList();
    res.json({ success: true, count: exams.length, data: exams });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/", async (req, res) => {
  const { name, code, subject, grade, duration, description, questions, source } = req.body;
  
  if (!name || !subject || !grade) {
    return res.status(400).json({ success: false, error: "Vui lòng nhập đầy đủ thông tin: Tên đề, Môn học, Khối lớp" });
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const examId = `exam-${Date.now()}`;
    const examCode = code || `DE-${Date.now().toString().slice(-6).toUpperCase()}`;
    const totalQuestions = questions ? questions.length : 0;
    const createdAt = new Date().toISOString();
    const parsedDuration = Number(duration) || 60;
    const parsedDescription = description || "";
    const parsedSource = source || "manual";
    const status = "draft";
    const attempts = 0;
    const avgScore = 0;

    await connection.query(
      `INSERT INTO exams (id, code, name, subject, grade, status, attempts, totalQuestions, avgScore, createdAt, duration, description, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        examId, examCode, name, subject, grade, status, attempts, totalQuestions, avgScore, createdAt, parsedDuration, parsedDescription, parsedSource
      ]
    );

    const qs = questions || [];
    for (let i = 0; i < qs.length; i++) {
      const q = qs[i];
      const questionId = `q-${Date.now()}-${i}`;
      await connection.query(
        `INSERT INTO questions (id, examId, text, type, level, options, correctAnswer)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          questionId, examId, q.text, q.type, q.level, JSON.stringify(q.options || []), q.correctAnswer
        ]
      );
    }

    await connection.commit();

    const newExam: MockExam = {
      id: examId,
      code: examCode,
      name,
      subject,
      grade,
      status,
      attempts,
      totalQuestions,
      avgScore,
      createdAt,
      duration: parsedDuration,
      description: parsedDescription,
      source: parsedSource,
      questions: qs
    };

    res.status(201).json({ success: true, message: "Khởi tạo đề thi thành công!", data: newExam });
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ success: false, error: error.message });
  } finally {
    connection.release();
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Check if exam exists
    const [rows] = await connection.query('SELECT * FROM exams WHERE id = ?', [id]);
    if ((rows as any[]).length === 0) {
      await connection.rollback();
      return res.status(455).json({ success: false, error: "Không tìm thấy đề thi yêu cầu." });
    }

    const fieldsToUpdate: { [key: string]: any } = {};
    const examFields = ['code', 'name', 'subject', 'grade', 'status', 'attempts', 'totalQuestions', 'avgScore', 'duration', 'description', 'source'];
    for (const field of examFields) {
      if (req.body[field] !== undefined) {
        fieldsToUpdate[field] = req.body[field];
      }
    }

    // If questions are provided, we should update questions
    if (req.body.questions !== undefined) {
      // Let's delete existing questions first
      await connection.query('DELETE FROM questions WHERE examId = ?', [id]);

      // Insert new questions
      const qs = req.body.questions || [];
      for (let i = 0; i < qs.length; i++) {
        const q = qs[i];
        const questionId = `q-${Date.now()}-${i}`;
        await connection.query(
          `INSERT INTO questions (id, examId, text, type, level, options, correctAnswer)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            questionId, id, q.text, q.type, q.level, JSON.stringify(q.options || []), q.correctAnswer
          ]
        );
      }
      fieldsToUpdate['totalQuestions'] = qs.length;
    }

    if (Object.keys(fieldsToUpdate).length > 0) {
      const setClauses = Object.keys(fieldsToUpdate).map(key => `\`${key}\` = ?`).join(', ');
      const values = Object.values(fieldsToUpdate);
      await connection.query(`UPDATE exams SET ${setClauses} WHERE id = ?`, [...values, id]);
    }

    await connection.commit();

    // Fetch updated exam to return
    const [updatedRows] = await connection.query('SELECT * FROM exams WHERE id = ?', [id]);
    const updatedExamData = (updatedRows as any[])[0];

    const [updatedQuestions] = await connection.query('SELECT * FROM questions WHERE examId = ?', [id]);
    const questionsList = (updatedQuestions as any[]).map(q => {
      let parsedOptions: string[] | undefined = undefined;
      if (q.options) {
        try {
          parsedOptions = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
        } catch (e) {
          parsedOptions = [];
        }
      }
      return {
        text: q.text,
        type: q.type,
        level: q.level,
        options: parsedOptions,
        correctAnswer: q.correctAnswer
      };
    });

    const updatedExam: MockExam = {
      id: updatedExamData.id,
      code: updatedExamData.code,
      name: updatedExamData.name,
      subject: updatedExamData.subject,
      grade: updatedExamData.grade,
      status: updatedExamData.status,
      attempts: Number(updatedExamData.attempts) || 0,
      totalQuestions: Number(updatedExamData.totalQuestions) || 0,
      avgScore: Number(updatedExamData.avgScore) || 0,
      createdAt: updatedExamData.createdAt,
      duration: Number(updatedExamData.duration) || 60,
      description: updatedExamData.description || "",
      source: updatedExamData.source,
      questions: questionsList
    };

    res.json({ success: true, message: "Đã cập nhật thông tin đề thi thành công!", data: updatedExam });

  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ success: false, error: error.message });
  } finally {
    connection.release();
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const pool = getPool();
  try {
    const [rows] = await pool.query('SELECT * FROM exams WHERE id = ?', [id]);
    if ((rows as any[]).length === 0) {
      return res.status(404).json({ success: false, error: "Không tìm thấy đề thi cần xóa." });
    }
    const deleted = (rows as any[])[0];
    await pool.query('DELETE FROM exams WHERE id = ?', [id]); // cascaded delete of questions too
    res.json({ success: true, message: `Đã gỡ bỏ đề thi "${deleted.name}" khỏi hệ thống.` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// PACKAGES REST SUITE
router.get("/packages", async (req, res) => {
  try {
    const packagesList = await getPackagesList();
    res.json({ success: true, count: packagesList.length, data: packagesList });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/packages", async (req, res) => {
  const { name, code, subject, grade, examIds, accessType, description } = req.body;

  if (!name || !subject || !grade) {
    return res.status(400).json({ success: false, error: "Thiếu dữ liệu: Tên gói, Môn học, Khối học là bắt buộc." });
  }

  const pool = getPool();
  try {
    const pkgId = `pkg-${Date.now()}`;
    const pkgCode = code || `GP-${Date.now().toString().slice(-6).toUpperCase()}`;
    const examsCount = examIds ? examIds.length : 0;
    const pkgExamIds = examIds || [];
    const downloadsCount = 0;
    const pkgAccessType = accessType || "standard";
    const createdAt = new Date().toISOString();
    const pkgDescription = description || "";
    const status = "active";

    await pool.query(
      `INSERT INTO packages (id, code, name, subject, grade, status, examsCount, examIds, downloadsCount, accessType, createdAt, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pkgId, pkgCode, name, subject, grade, status, examsCount, JSON.stringify(pkgExamIds), downloadsCount, pkgAccessType, createdAt, pkgDescription
      ]
    );

    const newPackage: MockPackage = {
      id: pkgId,
      code: pkgCode,
      name,
      subject,
      grade,
      status,
      examsCount,
      examIds: pkgExamIds,
      downloadsCount,
      accessType: pkgAccessType,
      createdAt,
      description: pkgDescription
    };

    res.status(201).json({ success: true, message: "Đã thiết lập gói đề thi thành công!", data: newPackage });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/packages/:id", async (req, res) => {
  const { id } = req.params;
  const pool = getPool();
  try {
    const [rows] = await pool.query('SELECT * FROM packages WHERE id = ?', [id]);
    if ((rows as any[]).length === 0) {
      return res.status(404).json({ success: false, error: "Không tìm thấy gói đề thi yêu cầu." });
    }

    const fieldsToUpdate: { [key: string]: any } = {};
    const pkgFields = ['name', 'code', 'subject', 'grade', 'status', 'examIds', 'downloadsCount', 'accessType', 'description'];
    for (const field of pkgFields) {
      if (req.body[field] !== undefined) {
        if (field === 'examIds') {
          fieldsToUpdate['examIds'] = JSON.stringify(req.body.examIds);
          fieldsToUpdate['examsCount'] = req.body.examIds.length;
        } else {
          fieldsToUpdate[field] = req.body[field];
        }
      }
    }

    if (Object.keys(fieldsToUpdate).length > 0) {
      const setClauses = Object.keys(fieldsToUpdate).map(key => `\`${key}\` = ?`).join(', ');
      const values = Object.values(fieldsToUpdate);
      await pool.query(`UPDATE packages SET ${setClauses} WHERE id = ?`, [...values, id]);
    }

    // Fetch updated package
    const [updatedRows] = await pool.query('SELECT * FROM packages WHERE id = ?', [id]);
    const p = (updatedRows as any[])[0];
    let parsedExamIds: string[] = [];
    if (p.examIds) {
      try {
        parsedExamIds = typeof p.examIds === 'string' ? JSON.parse(p.examIds) : p.examIds;
      } catch (e) {
        parsedExamIds = [];
      }
    }

    const updatedPackage: MockPackage = {
      id: p.id,
      code: p.code,
      name: p.name,
      subject: p.subject,
      grade: p.grade,
      status: p.status,
      examsCount: Number(p.examsCount) || 0,
      examIds: parsedExamIds,
      downloadsCount: Number(p.downloadsCount) || 0,
      accessType: p.accessType,
      createdAt: p.createdAt,
      description: p.description || ""
    };

    res.json({ success: true, message: "Đã cập nhập dán nhãn gói đề thi thành công!", data: updatedPackage });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete("/packages/:id", async (req, res) => {
  const { id } = req.params;
  const pool = getPool();
  try {
    const [rows] = await pool.query('SELECT * FROM packages WHERE id = ?', [id]);
    if ((rows as any[]).length === 0) {
      return res.status(404).json({ success: false, error: "Không phát hiện gói đề thi tương thích để xóa." });
    }

    const deleted = (rows as any[])[0];
    await pool.query('DELETE FROM packages WHERE id = ?', [id]);

    res.json({ success: true, message: `Đã giải tán thành công gói đề: "${deleted.name}"` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
