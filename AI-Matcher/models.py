from pydantic import BaseModel
from typing import List, Optional


class MatchPreference(BaseModel):
    userId: int
    desiredProfession: str = ""
    desiredSkills: List[str] = []
    additionalDescription: Optional[str] = None
    goal: str = ""
    matchType: str = "random"
    isSearching: bool = True


class MatchResult(BaseModel):
    userId: int
    candidateUserId: int
    score: float
    goalScore: float
    professionScore: float
    skillScore: float
    descriptionScore: float