"""A tutor session that ends after the browser has already left must not raise from the final close."""
import unittest
from unittest import mock

from tests import offline_env

offline_env.apply()

from starlette.websockets import WebSocketDisconnect  # noqa: E402

from app.routers import tutor  # noqa: E402


class GoneBrowser:
    """A socket whose peer has disconnected: accept and the auth message work, close raises."""

    def __init__(self):
        self.close_calls = 0

    async def accept(self):
        pass

    async def receive_json(self):
        return {"type": "auth", "token": "any"}

    async def send_json(self, data):
        pass

    async def close(self, code=1000):
        self.close_calls += 1
        raise WebSocketDisconnect(1001)


class EndedSession:
    def __init__(self, ws, user_id):
        pass

    async def send(self, message, audio=None):
        pass

    async def run(self):
        raise WebSocketDisconnect(1001)

    async def cancel_turn(self):
        pass


class FinalCloseTests(unittest.IsolatedAsyncioTestCase):
    async def test_close_after_the_browser_left_does_not_raise(self):
        ws = GoneBrowser()
        with mock.patch.object(tutor, "verify_access_token", return_value="user-1"), mock.patch.object(tutor, "TutorSession", EndedSession):
            await tutor.tutor_ws(ws)
        self.assertEqual(ws.close_calls, 1)


if __name__ == "__main__":
    unittest.main()
