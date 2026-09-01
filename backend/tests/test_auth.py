from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient


@pytest.mark.asyncio
async def test_missing_authorization_returns_401(app):
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/v1/coach/analyze",
            json={"question": "How productive was I?"},
        )
    assert response.status_code == 401
    assert response.json()["code"] == "unauthorized"


@pytest.mark.asyncio
async def test_invalid_token_returns_401(app):
    with patch("app.dependencies.create_request_context") as mock_ctx:
        from app.errors import AuthenticationError

        mock_ctx.side_effect = AuthenticationError()
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            response = await client.post(
                "/v1/coach/analyze",
                json={"question": "How productive was I?"},
                headers={"Authorization": "Bearer invalid-token"},
            )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_request_validation_rejects_empty_question(app):
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/v1/coach/analyze",
            json={"question": ""},
            headers={"Authorization": "Bearer token"},
        )
    assert response.status_code == 422
