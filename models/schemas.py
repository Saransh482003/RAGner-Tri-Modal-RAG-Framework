from pydantic import BaseModel

class QueryResponse(BaseModel):
    name: str
    price: float
    is_offer: bool | None = None