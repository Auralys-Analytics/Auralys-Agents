from typing import List, Dict, Union

def detect_volume_bursts(
    volumes: List[float],
    threshold_ratio: float = 1.5,
    min_interval: int = 1
) -> List[Dict[str, Union[int, float]]]:
    """
    Detect points where trading volume increases sharply compared to the previous value.

    Args:
        volumes: List of trading volumes.
        threshold_ratio: Minimum ratio between current and previous to count as a burst.
        min_interval: Minimum distance between consecutive bursts.

    Returns:
        A list of burst events with index, previous, current, and ratio values.
    """
    events: List[Dict[str, Union[int, float]]] = []
    last_idx = -min_interval

    for i in range(1, len(volumes)):
        prev, curr = volumes[i - 1], volumes[i]
        ratio = (curr / prev) if prev > 0 else float("inf")

        if ratio >= threshold_ratio and (i - last_idx) >= min_interval:
            events.append({
                "index": i,
                "previous": prev,
                "current": curr,
                "ratio": round(ratio, 4),
                "change": round(curr - prev, 4)  # new: absolute change in volume
            })
            last_idx = i

    return events


def summarize_bursts(events: List[Dict[str, Union[int, float]]]) -> str:
    """
    Provide a quick summary of detected bursts.
    """
    if not events:
        return "No bursts detected."
    return f"Detected {len(events)} bursts. Largest ratio: {max(e['ratio'] for e in events)}"
