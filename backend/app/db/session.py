import ssl
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.core.config import settings

# Permissive SSL context — required for the Supabase connection pooler.
_ssl_ctx = ssl.create_default_context()
_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = ssl.CERT_NONE

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args={
        "ssl": _ssl_ctx,
        # Supabase's transaction pooler (port 6543) doesn't support prepared
        # statements — disable asyncpg's statement cache so it works there.
        "statement_cache_size": 0,
    },
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
