import sys

# Under unittest, switch to the offline settings before any app module is imported.
# Scripts run directly (for example `python -m tests.score_comparison`) keep the real settings.
if "unittest" in (sys.argv[0] if sys.argv else ""):
    from tests import offline_env

    offline_env.apply()
