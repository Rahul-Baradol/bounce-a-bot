import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME")

if not MONGO_URI:
    raise RuntimeError("MONGO_URI missing in .env")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
conversations_collection = db["conversations"]