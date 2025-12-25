from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
import httpx
from pydantic import BaseModel
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

templates = Jinja2Templates(directory="templates")

N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL")

class AssetRequest(BaseModel):
    asset: str
    language: str

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/get-asset-value")
async def get_asset_value(data: AssetRequest):
    async with httpx.AsyncClient() as client:
        try:
            # Forwarding the request to n8n
            response = await client.post(
                N8N_WEBHOOK_URL,
                json=data.model_dump(),
                timeout=30.0
            )
            # If n8n returns a non-200 status, we'll catch it here if we want,
            # but often n8n returns 200 even on workflow errors unless configured otherwise.
            # response.raise_for_status()

            # Try to parse JSON, otherwise return text
            try:
                return response.json()
            except:
                return {"output": response.text}

        except Exception as e:
            return {"error": str(e)}

@app.get("/hello/{name}")
async def say_hello(name: str):
    return {"message": f"Hello {name}"}
