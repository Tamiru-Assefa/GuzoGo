from typing import List

import httpx
from fastapi import FastAPI, HTTPException

from models import MatchPreference
from matcher import find_best_match


app = FastAPI(
    title="GuzoGo AI Matching Service",
    version="1.0.0"
)


DOTNET_API_URL = "http://localhost:5011"


@app.get("/")
async def root():

    return {
        "service": "GuzoGo AI Matcher",
        "status": "running"
    }


@app.get("/health")
async def health():

    return {
        "status": "healthy"
    }


@app.post("/match/{user_id}")
async def find_match(user_id: int):

    async with httpx.AsyncClient() as client:

        # -------------------------------------------------
        # Get current user's preference
        # -------------------------------------------------

        current_response = await client.get(
            f"{DOTNET_API_URL}/api/MatchPreference/{user_id}"
        )

        if current_response.status_code == 404:
            raise HTTPException(
                status_code=404,
                detail="User match preference not found."
            )

        if current_response.status_code != 200:
            raise HTTPException(
                status_code=500,
                detail="Failed to retrieve current user's preference."
            )

        current_data = current_response.json()

        current_user = MatchPreference(
            **current_data
        )

        # -------------------------------------------------
        # Get all searching users
        # -------------------------------------------------

        searching_response = await client.get(
            f"{DOTNET_API_URL}/api/MatchPreference/searching"
        )

        if searching_response.status_code != 200:
            raise HTTPException(
                status_code=500,
                detail="Failed to retrieve searching users."
            )

        searching_data = searching_response.json()

        candidates = [
            MatchPreference(**item)
            for item in searching_data
        ]

        # -------------------------------------------------
        # Find matches
        # -------------------------------------------------

        results = find_best_match(
            current_user,
            candidates
        )

        if not results:

            return {
                "matched": False,
                "results": []
            }

        best_match = results[0]

        return {
            "matched": True,
            "bestMatch": best_match,
            "results": results
        }