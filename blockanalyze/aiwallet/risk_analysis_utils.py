import math

def calculate_risk_score(price_change_pct: float, liquidity_usd: float, flags_mask: int) -> float:
    """
    Compute a risk score in the range [0, 100].

    Args:
        price_change_pct: Percent change over period (e.g., +5.0 for +5%).
        liquidity_usd: Total liquidity in USD.
        flags_mask: Integer bitmask of risk flags; each set bit adds a penalty.

    Returns:
        Final risk score (0–100).
    """
    # volatility component (max 50 points)
    volatility_score = min(abs(price_change_pct) / 10, 1) * 50

    # liquidity component (higher liquidity reduces risk, up to 30 points)
    if liquidity_usd > 0:
        liquidity_score = max(0.0, 30 - (math.log10(liquidity_usd) * 5))
    else:
        liquidity_score = 30.0

    # flag penalties: 5 points per active bit
    flag_count = bin(flags_mask).count("1")
    penalty_score = flag_count * 5

    # total score capped at 100
    total_score = volatility_score + liquidity_score + penalty_score
    return min(round(total_score, 2), 100.0)


def classify_risk(score: float) -> str:
    """
    Classify risk score into categories.
    """
    if score < 30:
        return "Low"
    if score < 70:
        return "Medium"
    return "High"
