from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.leads import router as leads_router
from app.routers.tasks import router as tasks_router
from app.routers.network import router as network_router
from app.routers.notifications import router as notifications_router
from app.routers.dashboard import router as dashboard_router
from app.routers.admin import router as admin_router
from app.routers.titles import router as titles_router
from app.routers.badges import router as badges_router
from app.routers.teacher import router as teacher_router
from app.routers.points import router as points_router
from app.routers.achievements import router as achievements_router
from app.routers.public import router as public_router
from app.routers.materials import router as materials_router

app = FastAPI(title=settings.PROJECT_NAME, openapi_url="/openapi.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (
    auth_router,
    users_router,
    leads_router,
    tasks_router,
    network_router,
    notifications_router,
    dashboard_router,
    admin_router,
    titles_router,
    badges_router,
    teacher_router,
    points_router,
    achievements_router,
    public_router,
    materials_router,
):
    app.include_router(r)


@app.get("/")
def root():
    return {"message": f"Welcome to {settings.PROJECT_NAME} API"}
