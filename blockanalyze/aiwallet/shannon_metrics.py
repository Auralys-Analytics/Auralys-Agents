import math
from typing import List, Dict

def compute_shannon_entropy(addresses: List[str]) -> float:
    """
    Compute the Shannon entropy (in bits) of a sequence of addresses.

    Args:
        addresses: List of address strings.

    Returns:
        Shannon entropy value rounded to 4 decimals.
    """
    if not addresses:
        return 0.0

    freq: Dict[str, int] = {}
    for addr in addresses:
        freq[addr] = freq.get(addr, 0) + 1

    total = len(addresses)
    entropy = 0.0
    for count in freq.values():
        p = count / total
        entropy -= p * math.log2(p)

    return round(entropy, 4)


def normalize_entropy(entropy: float, max_symbols: int) -> float:
    """
    Normalize entropy to a [0.0 – 1.0] scale based on the maximum possible entropy.

    Args:
        entropy: Raw Shannon entropy.
        max_symbols: Number of unique possible symbols.

    Returns:
        Normalized entropy value between 0.0 and 1.0.
    """
    if max_symbols <= 1:
        return 0.0
    max_entropy = math.log2(max_symbols)
    return round(entropy / max_entropy, 4)
