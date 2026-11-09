"""Runs the scoring chain's offline scenarios (canned model replies) as part of the unittest suite."""
import contextlib
import io
import unittest

from tests import offline_env

offline_env.apply()

from tests import score_comparison  # noqa: E402


class ScoringOfflineTests(unittest.TestCase):
    def test_offline_scenarios_pass(self):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            code = score_comparison.run_offline()
        self.assertEqual(code, 0, output.getvalue())


if __name__ == "__main__":
    unittest.main()
