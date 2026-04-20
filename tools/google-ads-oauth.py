"""Google Ads OAuth2 refresh_token 발급 스크립트.

실행: python3 tools/google-ads-oauth.py
브라우저가 열리면 구글 로그인 → 동의 → 터미널에 refresh_token 출력
"""

import json

from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/adwords"]
CLIENT_SECRET_PATH = "/Users/jangjiho/secrets/oauth-desktop.json"

flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRET_PATH, scopes=SCOPES)
credentials = flow.run_local_server(port=8085)

print("\n=== Google Ads OAuth 완료 ===")
print(f"refresh_token: {credentials.refresh_token}")
print(f"access_token:  {credentials.token}")
print("\nrefresh_token을 .secrets.env에 저장하세요:")
print(f"GADS_REFRESH_TOKEN={credentials.refresh_token}")
