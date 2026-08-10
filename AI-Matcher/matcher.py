from typing import List
import numpy as np
from sentence_transformers import SentenceTransformer

from models import MatchPreference, MatchResult

# ---------------------------------------------------------
# LOAD EMBEDDING MODEL (once when module imported)
# ---------------------------------------------------------
embedder = SentenceTransformer('all-MiniLM-L6-v2')

# ---------------------------------------------------------
# GOAL COMPATIBILITY (unchanged)
# ---------------------------------------------------------
GOAL_COMPATIBILITY = {
    "jobseeker": {
        "hiring": 1.0,
        "jobseeker": 0.2,
        "networking": 0.5,
        "learning": 0.7,
        "mentoring": 0.8,
    },
    "hiring": {
        "jobseeker": 1.0,
        "hiring": 0.2,
        "networking": 0.5,
        "learning": 0.4,
        "mentoring": 0.5,
    },
    "networking": {
        "jobseeker": 0.5,
        "hiring": 0.5,
        "networking": 1.0,
        "learning": 0.7,
        "mentoring": 0.7,
    },
    "learning": {
        "jobseeker": 0.7,
        "hiring": 0.4,
        "networking": 0.7,
        "learning": 0.9,
        "mentoring": 1.0,
    },
    "mentoring": {
        "jobseeker": 0.8,
        "hiring": 0.5,
        "networking": 0.7,
        "learning": 1.0,
        "mentoring": 0.8,
    }
}

def normalize_goal(goal: str) -> str:
    return goal.strip().lower()

def calculate_goal_score(current: MatchPreference, candidate: MatchPreference) -> float:
    current_goal = normalize_goal(current.goal)
    candidate_goal = normalize_goal(candidate.goal)
    return GOAL_COMPATIBILITY.get(current_goal, {}).get(candidate_goal, 0.2)

# ---------------------------------------------------------
# SEMANTIC SIMILARITY USING EMBEDDINGS
# ---------------------------------------------------------
def semantic_similarity(text1: str, text2: str) -> float:
    """Return cosine similarity between two texts using the embedding model."""
    if not text1 or not text2:
        return 0.0
    # Encode both, normalize embeddings, then dot product = cosine similarity
    emb1 = embedder.encode(text1, normalize_embeddings=True)
    emb2 = embedder.encode(text2, normalize_embeddings=True)
    return float(np.dot(emb1, emb2))

# ---------------------------------------------------------
# PROFESSION SCORE (semantic)
# ---------------------------------------------------------
def calculate_profession_score(current: MatchPreference, candidate: MatchPreference) -> float:
    return semantic_similarity(current.desiredProfession, candidate.desiredProfession)

# ---------------------------------------------------------
# SKILL SCORE (weighted Jaccard + optional semantic fallback)
# ---------------------------------------------------------
def calculate_skill_score(current: MatchPreference, candidate: MatchPreference) -> float:
    # Exact match sets (case‑insensitive)
    c_skills = {s.strip().lower() for s in current.desiredSkills if s.strip()}
    d_skills = {s.strip().lower() for s in candidate.desiredSkills if s.strip()}
    
    if not c_skills or not d_skills:
        return 0.0

    # Exact overlap (Jaccard)
    intersection = c_skills & d_skills
    union = c_skills | d_skills
    exact_score = len(intersection) / len(union)

    # Unmatched skills
    unmatched_c = list(c_skills - intersection)
    unmatched_d = list(d_skills - intersection)

    # If no unmatched skills, no semantic bonus needed
    if not unmatched_c or not unmatched_d:
        return exact_score

    # Choose the smaller set as query, larger as target (for efficiency)
    if len(unmatched_c) > len(unmatched_d):
        query, target = unmatched_d, unmatched_c
    else:
        query, target = unmatched_c, unmatched_d

    # For each query skill, find the best semantic similarity in the target
    best_sims = []
    for q_skill in query:
        sims = [semantic_similarity(q_skill, t_skill) for t_skill in target]
        best_sims.append(max(sims))

    # Average the best matches (or use a threshold)
    average_best = sum(best_sims) / len(best_sims) if best_sims else 0.0

    # Only count skill pairs that are actually semantically related
    meaningful_matches = [s for s in best_sims if s > 0.5]
    meaningful_fraction = len(meaningful_matches) / len(best_sims) if best_sims else 0.0

    # Combine with weighted fraction (so that if only a few skills are related, bonus is reduced)
    semantic_bonus = average_best * meaningful_fraction * 0.3

    return min(exact_score + semantic_bonus, 1.0)
# ---------------------------------------------------------
# DESCRIPTION SCORE (semantic)
# ---------------------------------------------------------
def calculate_description_score(current: MatchPreference, candidate: MatchPreference) -> float:
    text1 = current.additionalDescription or ""
    text2 = candidate.additionalDescription or ""
    return semantic_similarity(text1, text2)

# ---------------------------------------------------------
# FINAL SCORE
# ---------------------------------------------------------
def calculate_match_score(current: MatchPreference, candidate: MatchPreference) -> MatchResult:
    goal_score = calculate_goal_score(current, candidate)
    profession_score = calculate_profession_score(current, candidate)
    skill_score = calculate_skill_score(current, candidate)
    description_score = calculate_description_score(current, candidate)

    # Weighted final score
    final_score = (
        goal_score * 40 +
        profession_score * 30 +
        skill_score * 20 +
        description_score * 10
    )

    return MatchResult(
        userId=current.userId,
        candidateUserId=candidate.userId,
        score=round(final_score, 2),
        goalScore=round(goal_score * 100, 2),
        professionScore=round(profession_score * 100, 2),
        skillScore=round(skill_score * 100, 2),
        descriptionScore=round(description_score * 100, 2)
    )

# ---------------------------------------------------------
# FIND BEST MATCH
# ---------------------------------------------------------
def find_best_match(current_user: MatchPreference, candidates: List[MatchPreference]):
    results = []
    for candidate in candidates:
        if candidate.userId == current_user.userId or not candidate.isSearching:
            continue
        result = calculate_match_score(current_user, candidate)
        results.append(result)

    results.sort(key=lambda x: x.score, reverse=True)
    return results