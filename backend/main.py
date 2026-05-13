from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, leads, tasks, admin, dashboard, swag, network, notifications

app = FastAPI(title="Spacepoint Ambassador Portal API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update with frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(leads.router)
app.include_router(tasks.router)
app.include_router(admin.router)
app.include_router(dashboard.router)
app.include_router(swag.router)
app.include_router(network.router)
app.include_router(notifications.router)


@app.get("/")
def read_root():
    return {"message": "Welcome to Spacepoint Ambassador API"}


from database import get_db_connection


@app.get("/api/settings")
def get_settings(conn=Depends(get_db_connection)):
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM system_settings")
    rows = cursor.fetchall()
    settings = {row["key"]: row["value"] for row in rows}
    
    return {
        "commission_enabled": settings.get("commission_enabled") == "true",
        "session_points_reward": int(settings.get("session_points_reward", 200)),
        "teacher_points_reward": int(settings.get("teacher_points_reward", 500)),
        "instructor_points_reward": int(settings.get("instructor_points_reward", 500)),
        "lead_points_reward": int(settings.get("lead_points_reward", 1000)) # Default 1000 for converted leads
    }