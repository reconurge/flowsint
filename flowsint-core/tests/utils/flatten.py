from flowsint_core.utils import flatten, unflatten

my_dict = {
    "root_key_1": "value 1",
    "root_key_2": 2,
    "root_key_3": "value 3",
    "root_key_4": {
        "child_key_1": "child 1",
        "child_key_2": "child 2",
        "child_key_3": {"grand_child_1": 0},
    },
}

my_flat_dict = {
    "root_key_1": "value 1",
    "root_key_2": 2,
    "root_key_3": "value 3",
    "root_key_4.child_key_1": "child 1",
    "root_key_4.child_key_2": "child 2",
    "root_key_4.child_key_3.grand_child_1": 0,
}

my_flat_dict_other_separator = {
    "root_key_1": "value 1",
    "root_key_2": 2,
    "root_key_3": "value 3",
    "root_key_4_child_key_1": "child 1",
    "root_key_4_child_key_2": "child 2",
    "root_key_4_child_key_3_grand_child_1": 0,
}


def test_flatten():
    assert flatten(my_dict) == my_flat_dict


def test_unflatten():
    assert unflatten(my_flat_dict) == my_dict
