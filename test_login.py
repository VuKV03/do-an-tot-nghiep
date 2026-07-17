import asyncio
import httpx

async def main():
    async with httpx.AsyncClient() as client:
        try:
            r = await client.post("http://localhost:8005/api/exam/portal/auth/login", json={"username": "NVC30092003", "password": "abc"})
            print(r.status_code, r.text)
        except Exception as e:
            print("Error connecting to 8005:", e)

asyncio.run(main())
