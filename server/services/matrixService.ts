import { Router } from "express";
import { getPool } from "../db";

const router = Router();

// GET /api/matrix-configs — Lấy danh sách ma trận đề (hỗ trợ tìm kiếm, lọc, phân trang)
router.get("/", async (req, res) => {
  try {
    const pool = getPool();
    const { search, subject, status, page = '1', pageSize = '10' } = req.query;

    let whereClauses: string[] = [];
    let params: any[] = [];

    if (search && typeof search === 'string' && search.trim()) {
      whereClauses.push('(name LIKE ? OR code LIKE ?)');
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (subject && subject !== 'all') {
      whereClauses.push('subject = ?');
      params.push(subject);
    }

    if (status && status !== 'all') {
      whereClauses.push('status = ?');
      params.push(status);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Đếm tổng số bản ghi
    const [countResult] = await pool.query(`SELECT COUNT(*) as total FROM matrix_configs ${whereSQL}`, params);
    const total = (countResult as any)[0].total;

    // Phân trang
    const currentPage = Math.max(1, parseInt(page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(pageSize as string, 10) || 10));
    const offset = (currentPage - 1) * limit;

    const [rows] = await pool.query(
      `SELECT * FROM matrix_configs ${whereSQL} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const data = (rows as any[]).map(r => ({
      id: r.id,
      code: r.code,
      name: r.name,
      subject: r.subject,
      totalScore: parseFloat(r.totalScore) || 10,
      totalQuestions: Number(r.totalQuestions) || 0,
      duration: Number(r.duration) || 120,
      status: r.status,
      createdAt: r.createdAt,
    }));

    res.json({
      success: true,
      total,
      page: currentPage,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
      data
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/matrix-configs/:id — Lấy chi tiết 1 ma trận
router.get("/:id", async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM matrix_configs WHERE id = ?', [req.params.id]);
    if ((rows as any[]).length === 0) {
      return res.status(404).json({ success: false, error: "Không tìm thấy ma trận đề." });
    }
    const r = (rows as any[])[0];
    res.json({
      success: true,
      data: {
        id: r.id,
        code: r.code,
        name: r.name,
        subject: r.subject,
        totalScore: parseFloat(r.totalScore) || 10,
        totalQuestions: Number(r.totalQuestions) || 0,
        duration: Number(r.duration) || 120,
        status: r.status,
        createdAt: r.createdAt,
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/matrix-configs — Thêm mới ma trận
router.post("/", async (req, res) => {
  const { name, code, subject, totalScore, totalQuestions, duration, status } = req.body;

  if (!name || !subject) {
    return res.status(400).json({ success: false, error: "Vui lòng nhập đầy đủ: Tên ma trận, Môn học." });
  }

  try {
    const pool = getPool();
    const id = `mtx-${Date.now()}`;
    const matrixCode = code || `MTX-${Date.now().toString().slice(-6).toUpperCase()}`;
    const createdAt = new Date().toISOString();

    await pool.query(
      `INSERT INTO matrix_configs (id, code, name, subject, totalScore, totalQuestions, duration, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        matrixCode,
        name,
        subject,
        totalScore ?? 10.00,
        totalQuestions ?? 0,
        duration ?? 120,
        status || 'new',
        createdAt
      ]
    );

    const [rows] = await pool.query('SELECT * FROM matrix_configs WHERE id = ?', [id]);
    const r = (rows as any[])[0];

    res.status(201).json({
      success: true,
      message: "Đã thêm mới ma trận đề thành công!",
      data: {
        id: r.id,
        code: r.code,
        name: r.name,
        subject: r.subject,
        totalScore: parseFloat(r.totalScore) || 10,
        totalQuestions: Number(r.totalQuestions) || 0,
        duration: Number(r.duration) || 120,
        status: r.status,
        createdAt: r.createdAt,
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/matrix-configs/:id — Cập nhật ma trận
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM matrix_configs WHERE id = ?', [id]);
    if ((rows as any[]).length === 0) {
      return res.status(404).json({ success: false, error: "Không tìm thấy ma trận đề cần cập nhật." });
    }

    const fieldsToUpdate: { [key: string]: any } = {};
    const allowedFields = ['code', 'name', 'subject', 'totalScore', 'totalQuestions', 'duration', 'status'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        fieldsToUpdate[field] = req.body[field];
      }
    }

    if (Object.keys(fieldsToUpdate).length > 0) {
      const setClauses = Object.keys(fieldsToUpdate).map(key => `\`${key}\` = ?`).join(', ');
      const values = Object.values(fieldsToUpdate);
      await pool.query(`UPDATE matrix_configs SET ${setClauses} WHERE id = ?`, [...values, id]);
    }

    const [updatedRows] = await pool.query('SELECT * FROM matrix_configs WHERE id = ?', [id]);
    const r = (updatedRows as any[])[0];

    res.json({
      success: true,
      message: "Đã cập nhật ma trận đề thành công!",
      data: {
        id: r.id,
        code: r.code,
        name: r.name,
        subject: r.subject,
        totalScore: parseFloat(r.totalScore) || 10,
        totalQuestions: Number(r.totalQuestions) || 0,
        duration: Number(r.duration) || 120,
        status: r.status,
        createdAt: r.createdAt,
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/matrix-configs/:id — Xóa 1 ma trận
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM matrix_configs WHERE id = ?', [id]);
    if ((rows as any[]).length === 0) {
      return res.status(404).json({ success: false, error: "Không tìm thấy ma trận đề cần xóa." });
    }
    const deleted = (rows as any[])[0];
    await pool.query('DELETE FROM matrix_configs WHERE id = ?', [id]);
    res.json({ success: true, message: `Đã xóa ma trận "${deleted.name}" thành công.` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/matrix-configs — Xóa nhiều ma trận (batch delete)
router.delete("/", async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, error: "Vui lòng cung cấp danh sách ID cần xóa." });
  }
  try {
    const pool = getPool();
    const placeholders = ids.map(() => '?').join(',');
    await pool.query(`DELETE FROM matrix_configs WHERE id IN (${placeholders})`, ids);
    res.json({ success: true, message: `Đã xóa ${ids.length} ma trận đề thành công.` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
