from __future__ import annotations

from naver_ads_mcp.tools.bulk_ops import bulk_keyword_filter


async def test_filter_by_searches():
    keywords = [
        {"keyword": "압화", "monthlySearches": 6000, "competitionIndex": "중간", "avgCpc": 8},
        {"keyword": "작은키워드", "monthlySearches": 50, "competitionIndex": "낮음", "avgCpc": 3},
    ]
    result = await bulk_keyword_filter(keywords, min_searches=100)
    assert result["passedCount"] == 1
    assert result["filteredOutCount"] == 1
    assert result["passed"][0]["keyword"] == "압화"


async def test_filter_by_competition():
    keywords = [
        {"keyword": "a", "monthlySearches": 500, "competitionIndex": "낮음"},
        {"keyword": "b", "monthlySearches": 500, "competitionIndex": "높음"},
    ]
    result = await bulk_keyword_filter(keywords, min_searches=100, competition=["낮음", "중간"])
    assert result["passedCount"] == 1
    assert result["passed"][0]["keyword"] == "a"


async def test_filter_empty():
    result = await bulk_keyword_filter([], min_searches=100)
    assert result["passedCount"] == 0
    assert result["filteredOutCount"] == 0
