from contextlib import contextmanager
from typing import Iterator

from sqlmodel import SQLModel, Session, create_engine

from app.config import get_settings


_settings = get_settings()
_engine = create_engine(_settings.database_url, echo=False)


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(_engine)


@contextmanager
def get_session() -> Iterator[Session]:
    with Session(_engine) as session:
        yield session 