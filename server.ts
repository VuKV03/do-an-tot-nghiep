import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { initDatabase } from "./server/db";

// Import Virtual Microservices Routers
import examService from "./server/services/examService";
import aiService from "./server/services/aiService";
import analyticsService from "./server/services/analyticsService";
import matrixService from "./server/services/matrixService";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json());

// In-Memory state for the Microservices Monitoring and Topology
let replicas = {
  gateway: 1,
  exam: 2,
  ai: 2,
  analytics: 1
};

interface MicroserviceLog {
  id: string;
  timestamp: string;
  service: "gateway" | "exam" | "ai" | "analytics";
  method: string;
  path: string;
  status: number;
  message: string;
}

// Global rolling log storage for visual console
let gatewayLogs: MicroserviceLog[] = [
  {
    id: "log-init-1",
    timestamp: new Date(Date.now() - 120000).toISOString(),
    service: "gateway",
    method: "SYS",
    path: "/init",
    status: 200,
    message: "API Gateway (Port 3000) khởi động thành công. Đang tải cấu hình..."
  },
  {
    id: "log-init-2",
    timestamp: new Date(Date.now() - 118000).toISOString(),
    service: "exam",
    method: "SYS",
    path: "/bootstrap",
    status: 200,
    message: "Exam Service khởi tạo thành công. 3 đề mẫu được nạp vào bộ nhớ."
  },
  {
    id: "log-init-3",
    timestamp: new Date(Date.now() - 116000).toISOString(),
    service: "ai",
    method: "SYS",
    path: "/genai-ping",
    status: 200,
    message: "AI Generation Service sẵn sàng kết nối qua SDK GoogleGenAI (Gemini)."
  },
  {
    id: "log-init-4",
    timestamp: new Date(Date.now() - 114000).toISOString(),
    service: "analytics",
    method: "SYS",
    path: "/metrics-calc",
    status: 200,
    message: "Analytics Service sẵn sàng tổng lực tính toán ma trận độ khó."
  }
];

const addLog = (service: "gateway" | "exam" | "ai" | "analytics", method: string, path: string, status: number, message: string) => {
  const newLog: MicroserviceLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    service,
    method,
    path,
    status,
    message
  };
  gatewayLogs.unshift(newLog);
  if (gatewayLogs.length > 50) {
    gatewayLogs.pop();
  }
};

// Middleware to capture and log Gateway traffic flows through to routers
app.use((req, res, next) => {
  const start = Date.now();
  
  // Intercept response finish
  res.on("finish", () => {
    const duration = Date.now() - start;
    let service: "gateway" | "exam" | "ai" | "analytics" = "gateway";
    
    if (req.originalUrl.startsWith("/api/v1/exams") || req.originalUrl.startsWith("/api/exams")) {
      service = "exam";
    } else if (req.originalUrl.startsWith("/api/generate-questions") || req.originalUrl.startsWith("/api/suggest-exam-info") || req.originalUrl.includes("/ai/")) {
      service = "ai";
    } else if (req.originalUrl.startsWith("/api/analytics")) {
      service = "analytics";
    }
    
    let msg = `Yêu cầu được chuyển hướng. Phản hồi trong ${duration}ms`;
    if (res.statusCode >= 400) {
      msg = `Gặp lỗi xử lý dịch vụ. Mã lỗi ${res.statusCode}`;
    }
    
    // Only log API routes to terminal list
    if (req.originalUrl.startsWith("/api/")) {
      addLog(service, req.method, req.originalUrl, res.statusCode, msg);
    }
  });
  
  next();
});

// API Gateway Proxy Route registrations

// 1. EXAM SERVICE ROUTER
app.use("/api/v1/exams", examService);
app.use("/api/exams", examService); // fallback wrapper

// 2. AI GENERATION ROUTER (Mount AI Service & keep old endpoints for perfect backward compatibility)
app.use("/api/ai/v1", aiService);

// Backward compatible endpoints matching Wizard imports
app.post("/api/generate-questions", async (req, res, next) => {
  // Delegate rewrite
  req.url = "/generate-questions";
  aiService(req, res, next);
});

app.post("/api/suggest-exam-info", async (req, res, next) => {
  // Delegate rewrite
  req.url = "/suggest-info";
  aiService(req, res, next);
});

// 3. ANALYTICS ROUTER
app.use("/api/analytics", analyticsService);

// 4. MATRIX CONFIG ROUTER
app.use("/api/matrix-configs", matrixService);

// 4. MICROSERVICES CONTROL AND STATUS ROUTE
app.get("/api/microservices/status", (req, res) => {
  // Read memory levels
  const mem = process.memoryUsage();
  const memoryMB = Math.round(mem.rss / 1024 / 1024);
  
  res.json({
    success: true,
    data: {
      services: [
        {
          id: "gateway",
          name: "API Gateway (Cổng nối)",
          status: "healthy",
          port: 3000,
          replicas: replicas.gateway,
          cpu: "0.8%",
          memory: `${memoryMB} MB`,
          latency: "2ms",
          dbType: "Nginx Proxy / Router",
          desc: "Định tuyến luồng kiểm định, bảo mật và cân bằng tải yêu cầu API."
        },
        {
          id: "exam",
          name: "Exam Service (Quản lý đề)",
          status: "healthy",
          port: 3001,
          replicas: replicas.exam,
          cpu: `${(1.2 * replicas.exam).toFixed(1)}%`,
          memory: `${45 * replicas.exam} MB`,
          latency: `${Math.floor(10 + Math.random() * 15)}ms`,
          dbType: "PostgreSQL (In-Memory Copy)",
          desc: "Cung cấp CRUD đề thi, chi tiết câu hỏi và lưu ngân hàng câu hỏi."
        },
        {
          id: "ai",
          name: "AI Generation Service (Tạo đề)",
          status: "healthy",
          port: 3002,
          replicas: replicas.ai,
          cpu: `${(2.4 * replicas.ai).toFixed(1)}%`,
          memory: `${90 * replicas.ai} MB`,
          latency: `${Math.floor(180 + Math.random() * 120)}ms`,
          dbType: "External Gemini Agent Web API",
          desc: "Orchestration với Google Gemini 3.5 Flash để dựng cấu hình & tạo câu hỏi."
        },
        {
          id: "analytics",
          name: "Analytics Service (Phân tích)",
          status: "healthy",
          port: 3003,
          replicas: replicas.analytics,
          cpu: `${(0.9 * replicas.analytics).toFixed(1)}%`,
          memory: `${32 * replicas.analytics} MB`,
          latency: `${Math.floor(40 + Math.random() * 30)}ms`,
          dbType: "Calculated Real-time Streams",
          desc: "Tổng hợp phổ điểm, tỉ lệ độ khó ma trận đề và xuất excel tự động."
        }
      ],
      overallHealth: "healthy",
      timestamp: new Date().toISOString()
    }
  });
});

app.post("/api/microservices/scale", (req, res) => {
  const { serviceId, newCount } = req.body;
  
  if (!serviceId || typeof newCount !== "number") {
    return res.status(400).json({ success: false, error: "Tham số yêu cầu bị rỗng" });
  }
  
  if (serviceId === "gateway") {
    return res.status(403).json({ success: false, error: "Không được phép thay đổi số replica của Cổng Gateway trung tâm!" });
  }
  
  if (newCount < 1 || newCount > 8) {
    return res.status(400).json({ success: false, error: "Số lượng replica tối thiểu là 1 và tối đa là 8" });
  }
  
  const oldVal = (replicas as any)[serviceId];
  (replicas as any)[serviceId] = newCount;
  
  const servNames: { [key: string]: string } = {
    exam: "Exam Service",
    ai: "AI Generation Service",
    analytics: "Analytics Service"
  };
  
  const servName = servNames[serviceId] || serviceId;
  const msg = `Lệnh điều dối dịch vụ thành công: Thay đổi số lượng container instances từ ${oldVal} lên ${newCount} replicas.`;
  
  addLog(serviceId as any, "SCALE", `/scale/${serviceId}`, 200, msg);
  console.log(`[Gateway API] Scale ${serviceId} up: ${oldVal} -> ${newCount}`);
  
  res.json({
    success: true,
    replicas,
    message: msg
  });
});

app.get("/api/microservices/logs", (req, res) => {
  res.json({
    success: true,
    logs: gatewayLogs
  });
});


// Start integrated dev/prod server
async function startServer() {
  try {
    await initDatabase();
  } catch (err) {
    console.error("[Startup] Lỗi khởi tạo cơ sở dữ liệu MySQL:", err);
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SmartTest API Gateway microservice framework started on port ${PORT}`);
  });
}

startServer();
