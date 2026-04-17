from __future__ import annotations

from aiolimiter import AsyncLimiter

sa_limiter = AsyncLimiter(max_rate=3, time_period=1)
commerce_limiter = AsyncLimiter(max_rate=2, time_period=1)
datalab_limiter = AsyncLimiter(max_rate=10, time_period=1)
