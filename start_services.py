"""
SmartTest Microservices - Startup Script
Launches all 5 services (Gateway, Exam, AI, Analytics, Auth) concurrently.
Usage: python start_services.py
"""
import subprocess
import sys
import os
import signal
import time

# Ensure UTF-8 output on Windows
os.environ["PYTHONIOENCODING"] = "utf-8"

SERVICES = [
    {
        "name": "Auth Service",
        "module": "backend.auth_service.main:app",
        "port": 8004,
    },
    {
        "name": "Exam Service",
        "module": "backend.exam_service.main:app",
        "port": 8001,
    },
    {
        "name": "AI Service",
        "module": "backend.ai_service.main:app",
        "port": 8002,
    },
    {
        "name": "Analytics Service",
        "module": "backend.analytics_service.main:app",
        "port": 8003,
    },
    {
        "name": "API Gateway",
        "module": "backend.gateway.main:app",
        "port": 8000,
    },
]

processes: list[subprocess.Popen] = []


def start_all():
    """Start all microservices."""
    print("")
    print("=" * 60)
    print("  SmartTest Microservices Architecture v2.0")
    print(f"  Starting {len(SERVICES)} microservices...")
    print("=" * 60)
    print("")

    for svc in SERVICES:
        print(f"  [*] Starting {svc['name']} on port {svc['port']}...")

        env = os.environ.copy()
        env["PYTHONIOENCODING"] = "utf-8"

        proc = subprocess.Popen(
            [
                sys.executable, "-m", "uvicorn",
                svc["module"],
                "--host", "0.0.0.0",
                "--port", str(svc["port"]),
                "--reload",
            ],
            cwd=os.path.dirname(os.path.abspath(__file__)),
            env=env,
        )
        processes.append(proc)
        time.sleep(1)

    print("")
    print("=" * 60)
    print("  ALL SERVICES STARTED SUCCESSFULLY!")
    print("")
    print("  API Gateway:       http://localhost:8000")
    print("  Exam Service:      http://localhost:8001")
    print("  AI Service:        http://localhost:8002")
    print("  Analytics Service: http://localhost:8003")
    print("  Auth Service:      http://localhost:8004")
    print("")
    print("  API Docs (Gateway): http://localhost:8000/docs")
    print("  API Docs (Exam):    http://localhost:8001/docs")
    print("  API Docs (AI):      http://localhost:8002/docs")
    print("  API Docs (Analytics): http://localhost:8003/docs")
    print("  API Docs (Auth):    http://localhost:8004/docs")
    print("=" * 60)
    print("")
    print("Press Ctrl+C to stop all services.")
    print("")


def stop_all(signum=None, frame=None):
    """Stop all microservices."""
    print("\n  Stopping all services...")
    for proc in processes:
        try:
            proc.terminate()
        except Exception:
            pass
    for proc in processes:
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()
    print("  All services stopped.")
    sys.exit(0)


if __name__ == "__main__":
    signal.signal(signal.SIGINT, stop_all)
    signal.signal(signal.SIGTERM, stop_all)

    start_all()

    try:
        while True:
            for i, proc in enumerate(processes):
                if proc.poll() is not None:
                    print(f"  WARNING: {SERVICES[i]['name']} stopped unexpectedly!")
            time.sleep(2)
    except KeyboardInterrupt:
        stop_all()
