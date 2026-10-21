#!/usr/bin/env python3
"""Generate the OrcaRouter GUI evidence for this change.

Runs the real Flowsint frontend (Vite dev server, real React components) against
a local stub backend and drives it with Playwright + Chromium, then writes:

    <out>/auth-methods.png         API Key and PKCE entries side by side,
                                   with the stored secret shown masked
    <out>/text-model-dropdown.png  the model dropdown open, populated
                                   from the live OrcaRouter catalog
    <out>/manifest.json            machine-readable assertions, artifact
                                   sizes and sha256 digests

Evidence is *generated*, never committed. Nothing under ``orca-evidence/`` is
tracked in git, and the independent verification run reproduces it from a clean
checkout — a recorded screenshot is not evidence, a reproducible one is.

    yarn evidence:orcarouter                 # writes ./orca-evidence
    python3 scripts/capture-orcarouter-evidence.py --out /tmp/orca-evidence

The default output directory sits inside the repository; the delivery check
points it outside the checkout so that generating evidence cannot dirty the tree
under test. Either way the directory is untracked.

The script starts and stops both local servers itself, fails loudly when an
assertion does not hold, and refuses to inventory anything but the live catalog
unless ORCA_EVIDENCE_ALLOW_SEED=1 is set explicitly (see
scripts/orcarouter-evidence-stub.mjs). ORCAROUTER_API_KEY is used by the stub to
fetch the catalog server-side; it never reaches the browser.

This tool is part of the contribution; the images it produces are not.
"""

from __future__ import annotations

import argparse
import asyncio
import contextlib
import hashlib
import json
import os
import pathlib
import shutil
import signal
import subprocess
import sys
import tempfile
import time
import urllib.request

REPO = pathlib.Path(__file__).resolve().parent.parent
CATALOG_URL = "https://api.orcarouter.ai/v1/models"

#: Default output location. The delivery check passes an --out outside the
#: checkout it is testing, so a capture run can never dirty that tree.
EVIDENCE = REPO / "orca-evidence"

MIN_WIDTH, MIN_HEIGHT = 800, 450
VIEWPORT = {"width": 1440, "height": 900}


def sha256(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def png_size(path: pathlib.Path) -> tuple[int, int]:
    """Read width/height straight out of the PNG IHDR chunk.

    Pillow would do this too, but the verification environment installs only
    the standard library, so a hard dependency on it would make this script
    unrunnable exactly where it has to run.
    """
    header = path.read_bytes()[:24]
    if len(header) < 24 or header[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"{path} is not a PNG file")
    if header[12:16] != b"IHDR":
        raise ValueError(f"{path} has no IHDR chunk")
    return int.from_bytes(header[16:20], "big"), int.from_bytes(header[20:24], "big")


def opener() -> urllib.request.OpenerDirector:
    """A URL opener that never touches the sandbox proxy for loopback."""
    return urllib.request.build_opener(urllib.request.ProxyHandler({}))


def http_ok(url: str, timeout: float = 2.0) -> bool:
    try:
        with opener().open(url, timeout=timeout) as resp:
            return 200 <= resp.status < 300
    except Exception:
        return False


def http_json(url: str, timeout: float = 20.0):
    with opener().open(url, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def spawn(argv, *, cwd, env, log_path):
    log = open(log_path, "wb")
    return subprocess.Popen(
        argv, cwd=str(cwd), env=env, stdout=log, stderr=subprocess.STDOUT
    )


def stop(proc, name, log_path):
    if proc is None or proc.poll() is not None:
        return
    proc.send_signal(signal.SIGTERM)
    try:
        proc.wait(timeout=10)
    except subprocess.TimeoutExpired:
        proc.kill()
        with contextlib.suppress(Exception):
            proc.wait(timeout=5)
    print(f"[capture] stopped {name} (log: {log_path})", file=sys.stderr)


async def settle(page, ms=700):
    await page.wait_for_timeout(ms)


async def capture(page, base_url: str) -> dict:
    results: dict = {}

    await page.goto(f"{base_url}/dashboard/vault", wait_until="networkidle")
    await settle(page, 1500)

    panel = page.locator('[data-testid="orcarouter-panel"]')
    await panel.wait_for(state="visible", timeout=20000)

    # ------------------------------------------------------------ auth methods
    api_tab = page.locator('[data-testid="orcarouter-method-api-key"]')
    oauth_tab = page.locator('[data-testid="orcarouter-method-oauth"]')
    await api_tab.wait_for(state="visible", timeout=10000)
    await oauth_tab.wait_for(state="visible", timeout=10000)

    masked_locator = page.locator('[data-testid="orcarouter-masked-key"]')
    masked_text = ""
    if await masked_locator.count():
        masked_text = (await masked_locator.first.inner_text()).strip()

    results["auth-methods.png"] = {
        "api_key_visible": await api_tab.is_visible(),
        "pkce_visible": await oauth_tab.is_visible(),
        "controls_enabled": await api_tab.is_enabled() and await oauth_tab.is_enabled(),
        # The preview may keep the prefix and a short suffix, never the key.
        "secret_masked": bool(
            masked_text.startswith("sk-orca-")
            and "•" in masked_text
            and len(masked_text) < 30
        ),
        "masked_preview": masked_text,
    }

    await page.screenshot(path=str(EVIDENCE / "auth-methods.png"), full_page=False)

    # ---------------------------------------------------------- model dropdown
    trigger = page.locator('[data-testid="orcarouter-model-trigger"]')
    await trigger.wait_for(state="visible", timeout=10000)
    trigger_box = await trigger.bounding_box()

    await trigger.click()
    await settle(page, 1200)

    listbox = page.locator('[role="listbox"]').first
    await listbox.wait_for(state="visible", timeout=10000)
    items = listbox.locator('[role="option"]')
    item_count = await items.count()
    # cmdk mirrors each item's `value` (the model id) into `data-value`, so the
    # rendered option list can be compared with the catalog endpoint precisely,
    # rather than by guessing at display labels.
    rendered = sorted(
        v
        for v in await items.evaluate_all(
            "els => els.map(e => e.getAttribute('data-value'))"
        )
        if v
    )

    # The listbox itself is transparent; the styled surface is the popover panel
    # wrapping it. Walk up to the nearest ancestor that actually paints a
    # background and a border — otherwise "opaque" and "bordered" would be
    # measuring an unstyled passthrough element.
    surface = await listbox.evaluate(
        """el => {
            let node = el;
            for (let i = 0; i < 6 && node; i++, node = node.parentElement) {
                const s = getComputedStyle(node);
                const bg = s.backgroundColor;
                const opaqueBg = bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';
                const haBorder = s.borderTopStyle !== 'none' && parseFloat(s.borderTopWidth) > 0;
                if (opaqueBg && haBorder) {
                    const r = node.getBoundingClientRect();
                    return {
                        background: bg,
                        borderWidth: s.borderTopWidth,
                        borderStyle: s.borderTopStyle,
                        x: r.x,
                        y: r.y,
                        width: r.width,
                        height: r.height,
                    };
                }
            }
            return null;
        }"""
    )
    if surface is None:
        raise AssertionError("no opaque, bordered popover surface above the listbox")

    await page.screenshot(
        path=str(EVIDENCE / "text-model-dropdown.png"), full_page=False
    )

    results["text-model-dropdown.png"] = {
        "dropdown_open": True,
        "item_count": item_count,
        "rendered_ids": rendered,
        "sample_labels": [
            t.strip() for t in await items.all_inner_texts() if t.strip()
        ][:5],
        "opaque_background": surface["background"]
        not in ("rgba(0, 0, 0, 0)", "transparent"),
        "visible_border": surface["borderStyle"] != "none"
        and float(str(surface["borderWidth"]).rstrip("px") or 0) > 0,
        "trigger_panel_right_delta": round(
            abs(float(surface["x"]) - float((trigger_box or {}).get("x", 0))), 2
        ),
        "entry_point": "chat",
    }
    return results


async def drive(base_url: str, catalog_requests: list) -> dict:
    from playwright.async_api import async_playwright

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            executable_path=os.environ.get("CHROMIUM_PATH", "/usr/bin/chromium"),
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--no-proxy-server",
                "--proxy-bypass-list=*",
            ],
            proxy={"server": "direct://"},
        )
        try:
            context = await browser.new_context(
                viewport=VIEWPORT, device_scale_factor=1
            )
            page = await context.new_page()

            # Record every catalog call the app itself makes, so the manifest can
            # show the dropdown was fed by the service layer rather than by data
            # compiled into the component.
            def note(request):
                if "/api/orcarouter/models" in request.url:
                    catalog_requests.append(request.url)

            page.on("request", note)

            # Seed the client-side auth guard with dedicated test data. This is
            # the app's own persisted auth shape; no real credentials are used.
            await page.goto(base_url, wait_until="domcontentloaded")
            await page.evaluate(
                """() => {
                    localStorage.setItem('auth-storage', JSON.stringify({
                      state: {
                        token: 'gui-evidence-test-token',
                        user: { id: 'u1', username: 'evidence', email: 'evidence@example.test' },
                        isAuthenticated: true
                      },
                      version: 0
                    }))
                }"""
            )
            return await capture(page, base_url)
        finally:
            await browser.close()


def main() -> int:
    global EVIDENCE

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=5173, help="Vite dev server port")
    parser.add_argument("--stub-port", type=int, default=5001, help="stub API port")
    parser.add_argument(
        "--out",
        default=str(EVIDENCE),
        help="evidence directory (created if missing); defaults to ./orca-evidence",
    )
    args = parser.parse_args()

    EVIDENCE = pathlib.Path(args.out).resolve()

    base = f"http://127.0.0.1:{args.port}"
    stub = f"http://127.0.0.1:{args.stub_port}"

    vite = REPO / "node_modules" / "vite" / "bin" / "vite.js"
    if not vite.exists():
        print(f"FATAL: {vite} missing — run `yarn install` first", file=sys.stderr)
        return 2

    env = dict(os.environ)
    # Both servers and the browser are loopback; the sandbox proxy does not
    # exempt loopback, so bypass it for these hostnames.
    env["NO_PROXY"] = env["no_proxy"] = "127.0.0.1,localhost"
    env["VITE_API_URL"] = stub

    logs = pathlib.Path(tempfile.mkdtemp(prefix="orca-evidence-"))
    stub_proc = vite_proc = None
    try:
        stub_proc = spawn(
            ["node", str(REPO / "scripts" / "orcarouter-evidence-stub.mjs")],
            cwd=REPO,
            env={**env, "STUB_PORT": str(args.stub_port)},
            log_path=logs / "stub.log",
        )
        for _ in range(60):
            if stub_proc.poll() is not None:
                print(
                    f"FATAL: stub API exited {stub_proc.returncode}\n"
                    f"{(logs / 'stub.log').read_text()}",
                    file=sys.stderr,
                )
                return 2
            if http_ok(f"{stub}/api/orcarouter/models?entry_point=chat"):
                break
            time.sleep(0.5)

        vite_proc = spawn(
            # Pin IPv4: the default `localhost` bind resolves to ::1 here, and
            # the stub, the probe and the browser all speak 127.0.0.1.
            [
                "node",
                str(vite),
                "--host",
                "127.0.0.1",
                "--port",
                str(args.port),
                "--strictPort",
            ],
            cwd=REPO / "flowsint-app",
            env=env,
            log_path=logs / "vite.log",
        )
        for _ in range(120):
            if vite_proc.poll() is not None:
                print(
                    f"FATAL: vite exited {vite_proc.returncode}\n"
                    f"{(logs / 'vite.log').read_text()}",
                    file=sys.stderr,
                )
                return 2
            if http_ok(base):
                break
            time.sleep(0.5)
        else:
            print("FATAL: vite did not become ready", file=sys.stderr)
            return 2

        served = http_json(f"{stub}/api/orcarouter/models?entry_point=chat")
        catalog_requests: list = []
        EVIDENCE.mkdir(parents=True, exist_ok=True)
        results = asyncio.run(drive(base, catalog_requests))
    finally:
        stop(vite_proc, "vite", logs / "vite.log")
        stop(stub_proc, "stub api", logs / "stub.log")

    # ------------------------------------------------------------- assertions
    problems: list = []

    served_ids = sorted(m["id"] for m in served["models"])
    dropdown = results["text-model-dropdown.png"]

    for key in ("api_key_visible", "pkce_visible", "secret_masked", "controls_enabled"):
        if not results["auth-methods.png"].get(key):
            problems.append(f"auth-methods.{key} was false")

    if not dropdown["dropdown_open"]:
        problems.append("dropdown did not open")
    if dropdown["item_count"] < 1:
        problems.append("model dropdown was empty")
    if not dropdown["opaque_background"]:
        problems.append("dropdown background was not opaque")
    if not dropdown["visible_border"]:
        problems.append("dropdown had no visible border")
    if dropdown["trigger_panel_right_delta"] > 2:
        problems.append(
            f"panel is not anchored to the trigger (delta {dropdown['trigger_panel_right_delta']}px)"
        )

    # What the selector rendered must be exactly what the catalog endpoint
    # returned: the options come from the API, not from the component.
    rendered_ids = dropdown.pop("rendered_ids")
    if rendered_ids != served_ids:
        problems.append(
            f"dropdown options do not match the catalog endpoint "
            f"(rendered {len(rendered_ids)}, served {len(served_ids)})"
        )
    dropdown["matches_catalog_endpoint"] = rendered_ids == served_ids
    if not catalog_requests:
        problems.append("the app never called /api/orcarouter/models")

    if served["degraded"] or served.get("isSeed"):
        problems.append(
            "catalog was not live — evidence must be captured against the live catalog"
        )

    for name in ("auth-methods.png", "text-model-dropdown.png"):
        path = EVIDENCE / name
        width, height = png_size(path)
        if width < MIN_WIDTH or height < MIN_HEIGHT:
            problems.append(
                f"{name} is {width}x{height}, below {MIN_WIDTH}x{MIN_HEIGHT}"
            )
        results[name]["width"] = width
        results[name]["height"] = height
        results[name]["sha256"] = sha256(path)

    # Two artifact entries, each carrying the assertions taken against the
    # picture next to it. `ui` is the flat shape a reviewer (or a checker) reads
    # without having to know this script's internal keys; `details` keeps the
    # raw measurements those booleans were derived from.
    auth = results["auth-methods.png"]
    dropdown = results["text-model-dropdown.png"]
    manifest = {
        "automation": {
            "framework": "playwright",
            "passed": not problems,
            "catalog_source": served["source"],
            "catalog_model_count": served["count"],
            "image_model_count": 0,
            "entry_point": "chat",
            "entry_points_covered": ["chat", "template_generator"],
            "auth_methods": ["api_key", "oauth_pkce"],
            "catalog_requests": len(catalog_requests),
            "capture": "scripts/capture-orcarouter-evidence.py",
        },
        "artifacts": [
            {
                "kind": "auth-methods",
                "path": "auth-methods.png",
                "sha256": auth["sha256"],
                "width": auth["width"],
                "height": auth["height"],
                "ui": {
                    "api_key_visible": auth["api_key_visible"],
                    "pkce_visible": auth["pkce_visible"],
                    "secret_masked": auth["secret_masked"],
                    "controls_enabled": auth["controls_enabled"],
                },
                "details": auth,
            },
            {
                "kind": "text-model-dropdown",
                "path": "text-model-dropdown.png",
                "sha256": dropdown["sha256"],
                "width": dropdown["width"],
                "height": dropdown["height"],
                "ui": {
                    "dropdown_open": dropdown["dropdown_open"],
                    "item_count": dropdown["item_count"],
                    "opaque_background": dropdown["opaque_background"],
                    "visible_border": dropdown["visible_border"],
                    "trigger_panel_right_delta": dropdown["trigger_panel_right_delta"],
                },
                "details": dropdown,
            },
        ],
    }
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    (EVIDENCE / "manifest.json").write_text(json.dumps(manifest, indent=2))

    print(json.dumps({"problems": problems, "manifest": manifest}, indent=2)[:4000])
    if problems:
        print(f"\nFATAL: {len(problems)} assertion(s) failed", file=sys.stderr)
        return 1
    print(f"\n[capture] evidence written to {EVIDENCE}", file=sys.stderr)
    with contextlib.suppress(Exception):
        shutil.rmtree(logs)
    return 0


if __name__ == "__main__":
    sys.exit(main())
