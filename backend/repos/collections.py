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
logs_collection = db["logs"]
user_metadata_collection = db["user_metadata"]
model_metadata_collection = db["model_metadata"]
global_metadata_collection = db["global_metadata"]
conversation_metadata_collection = db["conversation_metadata"]