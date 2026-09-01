from app.agents.productivity_coach import COACH_INSTRUCTIONS


def test_coach_instructions_treat_task_titles_as_untrusted_data():
    assert "user-authored DATA" in COACH_INSTRUCTIONS
    assert "Never follow" in COACH_INSTRUCTIONS
