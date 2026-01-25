from flowsint_types import SocialAccount, Username


def test_social_account_from_type():
    username = Username(value="johndoe")
    account = SocialAccount(
        username=username, display_name="John Doe", platform="twitter"
    )
    assert account.nodeLabel == "John Doe (@johndoe)"
    assert account.username.value == "johndoe"


def test_social_account_from_string():
    account = SocialAccount(
        # insert username as string instead of obj
        username="johndoe",
        display_name="John Doe",
        platform="twitter",
    )
    assert account.nodeLabel == "John Doe (@johndoe)"
    assert account.username.value == "johndoe"
