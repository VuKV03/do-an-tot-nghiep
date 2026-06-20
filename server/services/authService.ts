import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getPool } from "../db";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET_KEY || "smarttest-super-secret-key-2026";

const logTraffic = (method: string, path: string, desc: string) => {
  console.log(`[Auth Service] Trực cuộc gọi ${method} ${path} - ${desc}`);
};

// POST: Đăng nhập
router.post("/login", async (req, res) => {
  logTraffic("POST", "/login", "Người dùng thực hiện đăng nhập");
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      detail: "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu."
    });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query("SELECT * FROM users WHERE username = ?", [username.toLowerCase().trim()]);
    const users = rows as any[];

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        detail: "Tên đăng nhập hoặc mật khẩu không chính xác."
      });
    }

    const user = users[0];

    // Kiểm tra mật khẩu
    const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        detail: "Tên đăng nhập hoặc mật khẩu không chính xác."
      });
    }

    // Kiểm tra trạng thái tài khoản
    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        detail: "Tài khoản đã bị khóa hoặc vô hiệu hóa."
      });
    }

    // Tạo JWT tokens
    const tokenData = { sub: user.id, username: user.username, role: user.role };

    const accessToken = jwt.sign(
      { ...tokenData, type: "access" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { ...tokenData, type: "refresh" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "bearer",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status
      }
    });

  } catch (error: any) {
    console.error("Auth Service Login Error:", error);
    return res.status(500).json({
      success: false,
      detail: error.message || "Đã xảy ra lỗi hệ thống."
    });
  }
});

// POST: Đăng ký tài khoản
router.post("/register", async (req, res) => {
  logTraffic("POST", "/register", "Đăng ký tài khoản mới");
  const { username, email, fullName, password, role } = req.body;

  if (!username || !email || !fullName || !password) {
    return res.status(400).json({
      success: false,
      detail: "Vui lòng điền đầy đủ các thông tin bắt buộc."
    });
  }

  try {
    const pool = getPool();

    // Kiểm tra trùng username hoặc email
    const [existingRows] = await pool.query(
      "SELECT * FROM users WHERE username = ? OR email = ?",
      [username.toLowerCase().trim(), email.trim()]
    );
    const existingUsers = existingRows as any[];

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        detail: "Tên đăng nhập hoặc email đã tồn tại."
      });
    }

    const userId = `u-${Date.now()}`;
    const passwordHash = bcrypt.hashSync(password, 10);
    const userRole = role || "teacher";
    const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z'); // Match ISO representation

    await pool.query(
      "INSERT INTO users (id, username, email, fullName, password_hash, role, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [userId, username.toLowerCase().trim(), email.trim(), fullName.trim(), passwordHash, userRole, "active", now]
    );

    return res.status(201).json({
      success: true,
      message: "Đăng ký tài khoản thành công!",
      user: {
        id: userId,
        username: username.toLowerCase().trim(),
        email: email.trim(),
        fullName: fullName.trim(),
        role: userRole,
        status: "active",
        createdAt: now
      }
    });

  } catch (error: any) {
    console.error("Auth Service Register Error:", error);
    return res.status(500).json({
      success: false,
      detail: error.message || "Đã xảy ra lỗi hệ thống."
    });
  }
});

// GET: Lấy danh sách người dùng
router.get("/users", async (req, res) => {
  logTraffic("GET", "/users", "Truy vấn danh sách người dùng");
  try {
    const pool = getPool();
    const [rows] = await pool.query("SELECT * FROM users ORDER BY createdAt DESC");
    const users = rows as any[];

    return res.json({
      success: true,
      count: users.length,
      data: users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt
      }))
    });

  } catch (error: any) {
    console.error("Auth Service Get Users Error:", error);
    return res.status(500).json({
      success: false,
      detail: error.message || "Đã xảy ra lỗi hệ thống."
    });
  }
});

export default router;
