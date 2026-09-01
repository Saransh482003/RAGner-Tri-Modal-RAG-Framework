from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class QueryResponse(BaseModel):
    name: str
    price: float
    is_offer: bool | None = None