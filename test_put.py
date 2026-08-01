import httpx
import asyncio

async def main():
    async with httpx.AsyncClient() as client:
        # Get sessions
        resp = await client.get("http://localhost:8005/api/exam/admin/sessions")
        sessions = resp.json()
        print("Sessions:", sessions)
        if not sessions:
            print("No sessions found.")
            return

        session_id = sessions[0]["id"]
        
        # Get exams
        resp = await client.get("http://localhost:8001/exams/")
        exams = resp.json()
        print("Exams Count:", exams.get("count"))
        if not exams.get("data"):
            print("No exams found.")
            return
            
        exam_id = exams["data"][0]["id"]
        
        # Update session
        resp = await client.put(
            f"http://localhost:8005/api/exam/admin/sessions/{session_id}",
            json={"exam_id": exam_id, "duration_minutes": 120}
        )
        print("Update Status:", resp.status_code)
        print("Update Response:", resp.json())

if __name__ == "__main__":
    asyncio.run(main())
