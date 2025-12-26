from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
import httpx
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime
import json
from typing import List, Optional

load_dotenv()

# Database Setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./news.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class NewsItem(Base):
    __tablename__ = "news"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text)
    assets = Column(String) # Stored as JSON string
    language = Column(String)
    published = Column(Boolean, default=False)
    source = Column(String, default="manual")  # "manual" or "scheduled"
    created_at = Column(DateTime, default=datetime.utcnow)

class ScheduleItem(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    asset = Column(String, index=True)
    language = Column(String)
    days = Column(String)  # Stored as JSON string, e.g. ["Mon", "Tue", "Wed"]
    times = Column(String)  # Stored as JSON string, e.g. ["07:00", "09:30"]
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app = FastAPI()

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")

N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL")

class AssetRequest(BaseModel):
    asset: str
    language: str

class NewsUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    published: Optional[bool] = None

class NewsOut(BaseModel):
    id: int
    title: str
    description: str
    assets: str
    language: Optional[str]
    published: bool
    source: Optional[str] = "manual"
    created_at: datetime

    class Config:
        from_attributes = True

class ScheduleCreate(BaseModel):
    asset: str
    language: str
    days: List[str]  # ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    times: List[str]  # ["07:00", "09:30", "12:00"]

class ScheduleOut(BaseModel):
    id: int
    asset: str
    language: str
    days: str
    times: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/news", response_model=List[NewsOut])
def get_news(
    asset: Optional[str] = None,
    source: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(NewsItem)

    if asset:
        # Filter by asset (search in JSON string)
        query = query.filter(NewsItem.assets.contains(asset.upper()))

    if source:
        query = query.filter(NewsItem.source == source)

    return query.order_by(NewsItem.created_at.desc()).all()

@app.delete("/news/all")
def delete_all_news(db: Session = Depends(get_db)):
    db.query(NewsItem).delete()
    db.commit()
    return {"message": "All news deleted"}

@app.delete("/news/{news_id}")
def delete_news(news_id: int, db: Session = Depends(get_db)):
    news = db.query(NewsItem).filter(NewsItem.id == news_id).first()
    if not news:
        raise HTTPException(status_code=404, message="News not found")
    db.delete(news)
    db.commit()
    return {"message": "News deleted"}

@app.put("/news/{news_id}")
def update_news(news_id: int, news_update: NewsUpdate, db: Session = Depends(get_db)):
    news = db.query(NewsItem).filter(NewsItem.id == news_id).first()
    if not news:
        raise HTTPException(status_code=404, message="News not found")

    if news_update.title is not None:
        news.title = news_update.title
    if news_update.description is not None:
        news.description = news_update.description
    if news_update.published is not None:
        news.published = news_update.published

    db.commit()
    db.refresh(news)
    return news

@app.post("/news/{news_id}/publish")
def publish_news(news_id: int, db: Session = Depends(get_db)):
    news = db.query(NewsItem).filter(NewsItem.id == news_id).first()
    if not news:
        raise HTTPException(status_code=404, message="News not found")
    news.published = True
    db.commit()
    return {"message": "News published"}

# Schedule endpoints
@app.get("/schedules", response_model=List[ScheduleOut])
def get_schedules(db: Session = Depends(get_db)):
    return db.query(ScheduleItem).order_by(ScheduleItem.created_at.desc()).all()

@app.post("/schedules", response_model=ScheduleOut)
def create_schedule(schedule: ScheduleCreate, db: Session = Depends(get_db)):
    new_schedule = ScheduleItem(
        asset=schedule.asset.upper(),
        language=schedule.language,
        days=json.dumps(schedule.days),
        times=json.dumps(schedule.times),
        is_active=True
    )
    db.add(new_schedule)
    db.commit()
    db.refresh(new_schedule)
    return new_schedule

@app.delete("/schedules/{schedule_id}")
def delete_schedule(schedule_id: int, db: Session = Depends(get_db)):
    schedule = db.query(ScheduleItem).filter(ScheduleItem.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    db.delete(schedule)
    db.commit()
    return {"message": "Schedule deleted"}

@app.put("/schedules/{schedule_id}/toggle")
def toggle_schedule(schedule_id: int, db: Session = Depends(get_db)):
    schedule = db.query(ScheduleItem).filter(ScheduleItem.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    schedule.is_active = not schedule.is_active
    db.commit()
    return {"message": "Schedule toggled", "is_active": schedule.is_active}

@app.post("/get-asset-value")
async def get_asset_value(data: AssetRequest, db: Session = Depends(get_db)):
    async with httpx.AsyncClient() as client:
        try:
            # Forwarding the request to n8n
            response = await client.post(
                N8N_WEBHOOK_URL,
                json=data.model_dump(),
                timeout=30.0
            )

            response_data = None
            try:
                response_data = response.json()
            except:
                return {"output": response.text}

            # Parse and save to DB
            saved_news = []
            items_to_process = []

            if isinstance(response_data, list):
                items_to_process = response_data
            elif isinstance(response_data, dict):
                items_to_process = [response_data]

            for item in items_to_process:
                result_str = item.get("result")
                if result_str and isinstance(result_str, str):
                    if result_str.startswith('='):
                        result_str = result_str[1:]
                    try:
                        news_json = json.loads(result_str)

                        # Get description and preserve newlines
                        description = news_json.get("description", "")
                        # Ensure newlines are preserved (they should be from JSON parsing)

                        # Create DB entry
                        new_news = NewsItem(
                            title=news_json.get("title", "No Title"),
                            description=description,
                            assets=json.dumps(news_json.get("assets", [])),
                            language=news_json.get("language", data.language)
                        )
                        db.add(new_news)
                        saved_news.append(new_news)
                    except json.JSONDecodeError:
                        continue

            if saved_news:
                db.commit()
                for n in saved_news:
                    db.refresh(n)

            return response_data

        except Exception as e:
            return {"error": str(e)}
