"""
Base Repository — Generic Asynchronous Repository for MongoDB Collections
Provides standard CRUD operations, pagination, projections, and counting.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorCollection
import uuid

class BaseRepository:
    def __init__(self, collection: AsyncIOMotorCollection, id_field: str = "id"):
        self.collection = collection
        self.id_field = id_field

    async def get_by_id(self, item_id: str, projection: Optional[Dict[str, int]] = None) -> Optional[Dict[str, Any]]:
        """Fetch a single document by its custom ID or ObjectId."""
        proj = projection or {"_id": 0}
        return await self.collection.find_one({self.id_field: item_id}, proj)

    async def find_one(self, filter_query: Dict[str, Any], projection: Optional[Dict[str, int]] = None) -> Optional[Dict[str, Any]]:
        """Fetch a single document matching the query."""
        proj = projection or {"_id": 0}
        return await self.collection.find_one(filter_query, proj)

    async def find_many(
        self,
        filter_query: Optional[Dict[str, Any]] = None,
        skip: int = 0,
        limit: int = 50,
        sort_by: Optional[str] = "created_at",
        sort_order: int = -1,
        projection: Optional[Dict[str, int]] = None
    ) -> List[Dict[str, Any]]:
        """Fetch multiple documents with pagination and sorting."""
        query = filter_query or {}
        proj = projection or {"_id": 0}
        cursor = self.collection.find(query, proj)
        if sort_by:
            cursor = cursor.sort(sort_by, sort_order)
        cursor = cursor.skip(skip).limit(limit)
        return await cursor.to_list(length=limit)

    async def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Insert a document with auto-generated ID and created_at timestamp if missing."""
        doc = dict(data)
        if self.id_field not in doc:
            doc[self.id_field] = str(uuid.uuid4())
        if "created_at" not in doc:
            doc["created_at"] = datetime.now(timezone.utc)
        await self.collection.insert_one(doc)
        doc.pop("_id", None)
        return doc

    async def update_by_id(self, item_id: str, update_data: Dict[str, Any]) -> bool:
        """Update a document by its ID."""
        data = dict(update_data)
        data["updated_at"] = datetime.now(timezone.utc)
        result = await self.collection.update_one(
            {self.id_field: item_id},
            {"$set": data}
        )
        return result.modified_count > 0

    async def update_one(self, filter_query: Dict[str, Any], update_data: Dict[str, Any]) -> bool:
        """Update a document matching filter criteria."""
        data = dict(update_data)
        data["updated_at"] = datetime.now(timezone.utc)
        result = await self.collection.update_one(
            filter_query,
            {"$set": data}
        )
        return result.modified_count > 0

    async def delete_by_id(self, item_id: str) -> bool:
        """Delete a document by its ID."""
        result = await self.collection.delete_one({self.id_field: item_id})
        return result.deleted_count > 0

    async def delete_one(self, filter_query: Dict[str, Any]) -> bool:
        """Delete a document matching filter query."""
        result = await self.collection.delete_one(filter_query)
        return result.deleted_count > 0

    async def count(self, filter_query: Optional[Dict[str, Any]] = None) -> int:
        """Count total documents matching query."""
        query = filter_query or {}
        return await self.collection.count_documents(query)

    async def exists(self, filter_query: Dict[str, Any]) -> bool:
        """Check if at least one document exists matching query."""
        doc = await self.collection.find_one(filter_query, {"_id": 1})
        return doc is not None
