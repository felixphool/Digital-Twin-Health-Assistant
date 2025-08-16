from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.models.db import create_db_and_tables
from app.routes.upload import router as upload_router
from app.routes.chat import router as chat_router
from app.routes.digital import router as digital_router


_settings = get_settings()

app = FastAPI(title="Digital Twin Health Assistant", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    create_db_and_tables()


app.include_router(upload_router)
app.include_router(chat_router)
app.include_router(digital_router)


@app.get("/")
async def root():
    return {"ok": True, "service": "DigitalTwin API"}
