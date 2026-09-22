# Changelog

All notable changes to Flowsint will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### [1.2.12](https://github.com/reconurge/flowsint/compare/v1.2.11...v1.2.12) (2026-08-26)


### Features

* **ci:** add manual release workflow ([e8aa938](https://github.com/reconurge/flowsint/commit/e8aa938e7a14a2bde797f4633ea24e98365ebec1))
* **types:** detect @-prefixed usernames ([d0d37ee](https://github.com/reconurge/flowsint/commit/d0d37ee9f2cd15e4e05c04da8e21f4b217f61b13))


### Bug Fixes

* **ci:** bump frontend node version to 22 ([5ef6f3c](https://github.com/reconurge/flowsint/commit/5ef6f3c630b1fdd0f38697a27ade6fc77950f376))
* **ci:** exclude pure-formatting diffs from the mypy ratchet ([c421126](https://github.com/reconurge/flowsint/commit/c421126fb1bc773a126c8290726c4cb3e8c3dcdf))
* **ci:** isort still disagreed with itself after the previous fix ([9239d40](https://github.com/reconurge/flowsint/commit/9239d4037704292aaca1348b1895614619dc3bb6))
* **ci:** make isort's first-party grouping invocation-independent ([cf69a7e](https://github.com/reconurge/flowsint/commit/cf69a7e088dba55c68debff6b3a9c4f189b35d6b))
* **ci:** make ruff resolvable from the repo root ([61f7112](https://github.com/reconurge/flowsint/commit/61f71126481685222ea9487558042d9dafb795b6))
* **ci:** resolve ruff once in the typecheck ratchet instead of per-file ([3a0ca88](https://github.com/reconurge/flowsint/commit/3a0ca88e10f9597634164366cbf349c5a5ef5219))
* **docker:** relabel nginx.conf bind mount for SELinux hosts ([9554fb4](https://github.com/reconurge/flowsint/commit/9554fb4e9b24cc0329ce64bab44f1d693effe0d9)), closes [#207](https://github.com/reconurge/flowsint/issues/207)
* **enrichers:** dnsx stdin input + configurable Scamalytics API host ([ebda0f4](https://github.com/reconurge/flowsint/commit/ebda0f4c4981cf437ee0da5d597ec4bd19a96ba2))
* **frontend:** clear the small eslint rule violations ([189048e](https://github.com/reconurge/flowsint/commit/189048ea03ef584f15d2921ea74ca40b0285df66))
* **frontend:** disable rule/tool mismatches, fix remaining jsx-key + a refs regression ([929785f](https://github.com/reconurge/flowsint/commit/929785f00e96e75fcc6dbbb3370ec89058673e25))
* **frontend:** document deliberate no-deps effect in image-view-block.tsx ([74ce90f](https://github.com/reconurge/flowsint/commit/74ce90f18d7bd8190ee8c8be5d236606c947a50f))
* **frontend:** fix exhaustive-deps errors blocking the eslint ratchet ([fa8c507](https://github.com/reconurge/flowsint/commit/fa8c5078a7f88622c81a05e5ad984447216d63a2))
* **frontend:** fix first-mount data loss in adjust-during-render sync ([58a3c39](https://github.com/reconurge/flowsint/commit/58a3c39f0bf901c2750528991d0eda1ce12316b6))
* **frontend:** resolve all react-hooks/rules-of-hooks violations ([a620635](https://github.com/reconurge/flowsint/commit/a620635c02ab1c11f692815390c879ab92abb464))
* **frontend:** resolve no-unescaped-entities and ban-ts-comment ([6410091](https://github.com/reconurge/flowsint/commit/64100914d753426cd96362149e33d6d1fde141e2))
* **frontend:** resolve no-unused-vars, fix two real bugs found along the way ([2b988f0](https://github.com/reconurge/flowsint/commit/2b988f034f41f95c968428020bc9b98b3899bebe))
* **frontend:** resolve react-hooks/exhaustive-deps across live code ([73f258f](https://github.com/reconurge/flowsint/commit/73f258f3b105bd1fc9b95ad2eec709195a4cce40))
* **frontend:** resolve react-hooks/refs ([2ea9db5](https://github.com/reconurge/flowsint/commit/2ea9db54d38df92cdd21116817a5dae274db4c2b))
* **frontend:** resolve react-hooks/set-state-in-effect ([0441bc2](https://github.com/reconurge/flowsint/commit/0441bc2313811f10b59047c71876861fec31ac2a))
* **frontend:** resolve react-hooks/static-components ([135c81a](https://github.com/reconurge/flowsint/commit/135c81a03772d0d545abc9ea5a6d39399c59d8a6))
* **frontend:** resolve remaining react-hooks rules (purity, immutability, memoization) ([695fdff](https://github.com/reconurge/flowsint/commit/695fdff4a0f3f27432591e445f40c2f57c58b1ec))
* **frontend:** type GraphNode.nodeProperties/nodeMetadata/neighbors/links ([203d6c1](https://github.com/reconurge/flowsint/commit/203d6c1363abd868c68d829d36505d024f8d01c9))
* **frontend:** type the analysis-service API boundary ([35632bd](https://github.com/reconurge/flowsint/commit/35632bde8195255d45a3a607e87401f7335bcb42))
* **frontend:** type the chat-service API boundary ([f47426d](https://github.com/reconurge/flowsint/commit/f47426d4f2d1847ee96366eae77d7d11f579cbd3))
* **frontend:** type the enricher-service and log-service API boundaries ([704702f](https://github.com/reconurge/flowsint/commit/704702f9cec0888bdc6b8e1856ae0eef7debf6b6))
* **frontend:** type the flow-service API boundary ([7493c37](https://github.com/reconurge/flowsint/commit/7493c37ee445401df7ac3243429a39110cd2d5d4))
* **frontend:** type the graph settings store, drop dead setting types ([37e3f73](https://github.com/reconurge/flowsint/commit/37e3f737477cc43c45a1a030f8716b3cf5f0c189))
* **frontend:** type the graph subsystem's react-force-graph boundary ([e301455](https://github.com/reconurge/flowsint/commit/e3014553a5e126fc0dff8bdad36178cd5cef030e))
* **frontend:** type the investigation-service API boundary ([e0aef87](https://github.com/reconurge/flowsint/commit/e0aef871fb411b39142a25d5e9e6e478be1f66b7))
* **frontend:** type the sketch-service API boundary ([639648a](https://github.com/reconurge/flowsint/commit/639648a882d4bbd7393ef3ca0b0f1ccf360d0957))
* increase Celery healthcheck timeout ([7d1f8a4](https://github.com/reconurge/flowsint/commit/7d1f8a466640a47d13b38c32c0ee5579b68d0278))
* increase Neo4j healthcheck timeout ([7ea453a](https://github.com/reconurge/flowsint/commit/7ea453ad5f4191a3cd68828f577adde81ac5f783))
* **lint:** bring flowsint-api/alembic into ruff's scope ([a05fd13](https://github.com/reconurge/flowsint/commit/a05fd1379f00270b431eb5b34a0f969f926739b2))
* **mypy:** disable import-untyped, the last structural false-positive ([2857745](https://github.com/reconurge/flowsint/commit/28577452b4fb336eed678ff05bdfd13043710c36))
* **mypy:** enable pydantic mypy plugin, fix template_enricher/yaml_loader ([521138d](https://github.com/reconurge/flowsint/commit/521138d1dc58a3378dcbce98ea20836da6ede9ce))
* **mypy:** finish the ratchet backlog — permissions, dockertool, alembic ([441de48](https://github.com/reconurge/flowsint/commit/441de48264403667ecd40816d1f14036b5c878af))
* **mypy:** fix orchestrator/serializer type gaps, scope enricher pattern overrides ([fa1c8e7](https://github.com/reconurge/flowsint/commit/fa1c8e75802482e4e4dbd88ab9a7937ff1c57325))
* **mypy:** relax disallow_untyped_defs for tests across all packages ([b1a6252](https://github.com/reconurge/flowsint/commit/b1a62522195f5b154db4dfaf03251bd81edd1aa2))
* **mypy:** type annotations across enrichers, models, logger, utils ([4289d26](https://github.com/reconurge/flowsint/commit/4289d2630b89828c4762c1d242aee1a6d8299885))
* **mypy:** type flowsint_enrichers/utils.py, mirroring the already-fixed ([a1f8c2d](https://github.com/reconurge/flowsint/commit/a1f8c2da0eb46e903fca6a6d3186f0aefa25e6f5))
* **python:** correctness fixes surfaced by turning flake8 on ([24e1e27](https://github.com/reconurge/flowsint/commit/24e1e276c8d0a4139f00e0a35e28d1acf680f59c))
* **release:** realign version files to latest tag (v1.2.11) ([24177b2](https://github.com/reconurge/flowsint/commit/24177b2572d239c0d87596350378a530bb9ca167))
* **security:** pin minimum TLS version in get_domain_from_ssl ([bb0dfa9](https://github.com/reconurge/flowsint/commit/bb0dfa99f59e6c86c6dd6b72bd8fa025cb59ceed))


### Build System

* **python:** replace black+isort+flake8 with ruff ([8b49497](https://github.com/reconurge/flowsint/commit/8b494979657f81a335197cf31602a6061a6e0a3c))


### Documentation

* add CONTRIBUTING.md with the pre-commit verification checklist ([a284e44](https://github.com/reconurge/flowsint/commit/a284e4446fea60689e45e5cd8396f8cbf4e925cc))


### Code Refactoring

* drop dead get_domain_from_ssl from flowsint_core/flowsint_enrichers ([9082444](https://github.com/reconurge/flowsint/commit/9082444dca98a87d7d9604e6e92274e96cc75074))
* remove dead code from the utils.py triplication ([7228e8a](https://github.com/reconurge/flowsint/commit/7228e8a2107736b5af4d9a20371ca3bf46fb2815))

# Changelog

All notable changes to Flowsint will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
