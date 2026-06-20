import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const {
  DB_HOST = 'localhost',
  DB_PORT = '3306',
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_NAME = 'quan_ly_sinh_de_ai_v2'
} = process.env;

let pool: mysql.Pool;

export async function initDatabase() {
  try {
    console.log(`[Database] Đang kiểm tra và tạo database nếu chưa tồn tại tại ${DB_HOST}:${DB_PORT}...`);
    const connection = await mysql.createConnection({
      host: DB_HOST,
      port: parseInt(DB_PORT, 10),
      user: DB_USER,
      password: DB_PASSWORD,
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.end();

    pool = mysql.createPool({
      host: DB_HOST,
      port: parseInt(DB_PORT, 10),
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    console.log(`[Database] Đã kết nối thành công tới database MySQL: ${DB_NAME}`);

    await createTables();
    await seedDemoData();

  } catch (error) {
    console.error('[Database] Lỗi khởi tạo cơ sở dữ liệu MySQL:', error);
    throw error;
  }
}

export function getPool() {
  if (!pool) {
    throw new Error('Database pool chưa được khởi tạo. Hãy gọi initDatabase() trước.');
  }
  return pool;
}

async function createTables() {
  const connection = await pool.getConnection();
  try {
    // 1. Bảng exams
    await connection.query(`
      CREATE TABLE IF NOT EXISTS exams (
        id VARCHAR(255) PRIMARY KEY,
        code VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        subject VARCHAR(100) NOT NULL,
        grade VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'draft',
        attempts INT DEFAULT 0,
        totalQuestions INT DEFAULT 0,
        avgScore FLOAT DEFAULT 0,
        createdAt VARCHAR(100) NOT NULL,
        duration INT NOT NULL,
        description TEXT,
        source VARCHAR(50) DEFAULT 'manual'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Bảng questions
    await connection.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id VARCHAR(255) PRIMARY KEY,
        examId VARCHAR(255) NOT NULL,
        text TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'single',
        level VARCHAR(50) DEFAULT 'medium',
        options TEXT, -- Mảng các lựa chọn dưới dạng JSON string
        correctAnswer VARCHAR(255) NOT NULL,
        FOREIGN KEY (examId) REFERENCES exams(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Bảng packages
    await connection.query(`
      CREATE TABLE IF NOT EXISTS packages (
        id VARCHAR(255) PRIMARY KEY,
        code VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        subject VARCHAR(100) NOT NULL,
        grade VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        examsCount INT DEFAULT 0,
        examIds TEXT, -- Mảng IDs các đề thi dưới dạng JSON string
        downloadsCount INT DEFAULT 0,
        accessType VARCHAR(50) DEFAULT 'standard',
        createdAt VARCHAR(100) NOT NULL,
        description TEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Bảng users
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        fullName VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'teacher',
        status VARCHAR(50) DEFAULT 'active',
        createdAt VARCHAR(100) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('[Database] Cấu trúc các bảng exams, questions, packages, users đã sẵn sàng.');
  } finally {
    connection.release();
  }
}

async function seedDemoData() {
  const [examRows] = await pool.query('SELECT COUNT(*) as count FROM exams');
  const examCount = (examRows as any)[0].count;

  if (examCount === 0) {
    console.log('[Database] Bảng exams trống. Đang nạp đề thi mẫu...');

    const demoExams = [
      {
        id: "exam-1",
        code: "DE-MATH12-001",
        name: "Khảo sát Toán 12 Học kỳ 2 Chuyên sâu",
        subject: "Toán học",
        grade: "Khối 12",
        status: "active",
        attempts: 412,
        totalQuestions: 5,
        duration: 90,
        source: "matrix",
        createdAt: "2026-06-01T14:30:00Z",
        avgScore: 7.2,
        description: "Khảo sát chuyên đề Giải tích Hàm số, Nguyên hàm Tích phân và phương pháp tọa độ Oxyz.",
        questions: [
          {
            id: `q-${Date.now()}-1`,
            text: "Hàm số y = x^3 - 3x có bao nhiêu điểm cực trị?",
            type: "single",
            level: "easy",
            options: ["0", "1", "2", "3"],
            correctAnswer: "C"
          },
          {
            id: `q-${Date.now()}-2`,
            text: "Tích phân từ 0 đến 1 của e^x dx bằng?",
            type: "single",
            level: "easy",
            options: ["e", "e - 1", "e + 1", "1"],
            correctAnswer: "B"
          }
        ]
      },
      {
        id: "exam-2",
        code: "DE-LIT11-GK2",
        name: "Kiểm tra Ngữ văn 11 Giữa kỳ II",
        subject: "Ngữ văn",
        grade: "Khối 11",
        status: "pending",
        attempts: 0,
        totalQuestions: 3,
        duration: 90,
        source: "manual",
        createdAt: "2026-06-10T08:15:00Z",
        avgScore: 0,
        description: "Kiểm tra định kỳ kiến thức thơ mới Việt Nam và lý luận văn học giữa kỳ II khối 11.",
        questions: [
          {
            id: `q-${Date.now()}-3`,
            text: "Chủ đề bao trùm tác phẩm Vội vàng của Xuân Diệu là gì?",
            type: "single",
            level: "medium",
            options: ["Lòng căm thù giặc sâu sắc", "Lòng yêu cuộc sống trần thế cuồng nhiệt", "Nỗi sầu muộn u uẩn", "Ý chí cách mạng"],
            correctAnswer: "B"
          }
        ]
      },
      {
        id: "exam-3",
        code: "DE-ENG10-003",
        name: "Thi thử Tiếng Anh Thống nhất Khối 10",
        subject: "Tiếng Anh",
        grade: "Khối 10",
        status: "draft",
        attempts: 0,
        totalQuestions: 4,
        duration: 45,
        source: "ai",
        createdAt: "2026-06-12T10:00:00Z",
        avgScore: 0,
        description: "Đề phát sinh tự động hỗ trợ bồi dưỡng học sinh yếu kém môn Ngoại ngữ.",
        questions: [
          {
            id: `q-${Date.now()}-4`,
            text: "If I ________ rich, I would buy a high-performance computer.",
            type: "single",
            level: "easy",
            options: ["am", "was", "were", "would be"],
            correctAnswer: "C"
          }
        ]
      }
    ];

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const exam of demoExams) {
        await connection.query(
          `INSERT INTO exams (id, code, name, subject, grade, status, attempts, totalQuestions, avgScore, createdAt, duration, description, source)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            exam.id,
            exam.code,
            exam.name,
            exam.subject,
            exam.grade,
            exam.status,
            exam.attempts,
            exam.totalQuestions,
            exam.avgScore,
            exam.createdAt,
            exam.duration,
            exam.description,
            exam.source
          ]
        );

        for (const question of exam.questions) {
          await connection.query(
            `INSERT INTO questions (id, examId, text, type, level, options, correctAnswer)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              question.id,
              exam.id,
              question.text,
              question.type,
              question.level,
              JSON.stringify(question.options || []),
              question.correctAnswer
            ]
          );
        }
      }
      await connection.commit();
      console.log('[Database] Đã nạp đề thi mẫu và câu hỏi mẫu thành công.');
    } catch (error) {
      await connection.rollback();
      console.error('[Database] Lỗi nạp đề thi mẫu:', error);
    } finally {
      connection.release();
    }
  }

  const [packageRows] = await pool.query('SELECT COUNT(*) as count FROM packages');
  const packageCount = (packageRows as any)[0].count;

  if (packageCount === 0) {
    console.log('[Database] Bảng packages trống. Đang nạp gói đề thi mẫu...');

    const demoPackages = [
      {
        id: "pkg-1",
        code: "GP-MATH12-01",
        name: "Bộ 10 Đề luyện thi THPT Quốc gia 2026 Môn Toán",
        subject: "Toán học",
        grade: "Khối 12",
        status: "active",
        examsCount: 1,
        examIds: ["exam-1"],
        downloadsCount: 1540,
        accessType: "premium",
        createdAt: "2026-06-05T09:00:00Z",
        description: "Tổng hợp các mẫu đề thi thử bám sát đề minh họa của Bộ Giáo dục và Đào tạo."
      },
      {
        id: "pkg-2",
        code: "GP-ENG10-05",
        name: "Chuyên đề rèn luyện ngữ pháp Tiếng Anh nâng cao",
        subject: "Tiếng Anh",
        grade: "Khối 10",
        status: "active",
        examsCount: 1,
        examIds: ["exam-3"],
        downloadsCount: 520,
        accessType: "free",
        createdAt: "2026-06-11T16:00:00Z",
        description: "Gói tổng hợp các nguồn đề thi thử điều kiện 45 phút học kỳ dành cho lớp 10."
      }
    ];

    for (const pkg of demoPackages) {
      await pool.query(
        `INSERT INTO packages (id, code, name, subject, grade, status, examsCount, examIds, downloadsCount, accessType, createdAt, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          pkg.id,
          pkg.code,
          pkg.name,
          pkg.subject,
          pkg.grade,
          pkg.status,
          pkg.examsCount,
          JSON.stringify(pkg.examIds),
          pkg.downloadsCount,
          pkg.accessType,
          pkg.createdAt,
          pkg.description
        ]
      );
    }
    console.log('[Database] Đã nạp gói đề thi mẫu thành công.');
  }

  // Seed users
  console.log('[Database] Đang kiểm tra và nạp tài khoản mẫu...');
  const now = new Date().toISOString();
  
  const demoUsers = [
    {
      id: 'u-admin',
      username: 'admin',
      email: 'admin@smarttest.edu.vn',
      fullName: 'Quản trị viên hệ thống',
      password: 'admin123',
      role: 'admin',
      status: 'active'
    },
    {
      id: 'u-teacher01',
      username: 'teacher01',
      email: 'teacher01@smarttest.edu.vn',
      fullName: 'Nguyễn Văn Dũng',
      password: 'teacher123',
      role: 'teacher',
      status: 'active'
    },
    {
      id: 'u-dungnt',
      username: 'dungnt',
      email: 'dungnt@school.edu.vn',
      fullName: 'Nguyễn Tiến Dũng',
      password: 'admin123',
      role: 'admin',
      status: 'active'
    },
    {
      id: 'u-hai_lh',
      username: 'hai_lh',
      email: 'hai.lh@school.edu.vn',
      fullName: 'Lê Hoàng Hải',
      password: 'teacher123',
      role: 'teacher',
      status: 'active'
    },
    {
      id: 'u-trangpt',
      username: 'trangpt',
      email: 'trangpt@school.edu.vn',
      fullName: 'Phan Thu Trang',
      password: 'admin123',
      role: 'reviewer',
      status: 'active'
    },
    {
      id: 'u-tuyetbt',
      username: 'tuyetbt',
      email: 'tuyetbt@school.edu.vn',
      fullName: 'Bùi Thị Tuyết',
      password: 'teacher123',
      role: 'teacher',
      status: 'active'
    }
  ];

  for (const user of demoUsers) {
    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [user.username]);
    if ((existing as any[]).length === 0) {
      const passwordHash = bcrypt.hashSync(user.password, 10);
      await pool.query(
        `INSERT INTO users (id, username, email, fullName, password_hash, role, status, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          user.username,
          user.email,
          user.fullName,
          passwordHash,
          user.role,
          user.status,
          now
        ]
      );
      console.log(`[Database] Đã nạp tài khoản mẫu: ${user.username}`);
    }
  }
  console.log('[Database] Kiểm tra và nạp tài khoản hoàn tất.');
}
