from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.auth import router as auth_router
from routes.conversations import router as conversations_router
from routes.ingest import router as ingest_router
from routes.prompt import router as prompt_router

app = FastAPI(title="Mock LLM Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(conversations_router)
app.include_router(ingest_router)
app.include_router(prompt_router)

@app.get("/")
async def root():
    return {
        "status": "ok",
        "service": "mock-llm-backend"
    }