import asyncio
from backend.shared.database import engine
from sqlalchemy import text
from bs4 import BeautifulSoup
import json

def clean_html(raw_html):
    if not raw_html: return ""
    soup = BeautifulSoup(raw_html, "html.parser")
    return soup.get_text()

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text('SELECT id, type_id, correct_answer, options FROM questions LIMIT 5'))
        rows = res.fetchall()
        for r in rows:
            opt = json.loads(r.options) if r.options else []
            print(f"ID: {r.id} | Correct: {r.correct_answer!r} | Options: {opt!r}")

if __name__ == "__main__":
    asyncio.run(main())
