"""Vérificateur asynchrone des URLs sources du dataset VERSUS (exécuté via `uv`)."""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlparse

import httpx
import yaml

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "cases.yaml"
OFFICIAL_WAF_DOMAINS = (
    "legifrance.gouv.fr",
    "courdecassation.fr",
    "conseil-etat.fr",
    "justice.fr",
)
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) VERSUS-LinkCheck/1.0"
)


def is_official_waf_challenge(url: str, response: httpx.Response) -> bool:
    """Détecte un challenge anti-bot officiel sans jamais tenter de le contourner."""
    host = (urlparse(url).hostname or "").lower()
    is_official = any(host == d or host.endswith(f".{d}") for d in OFFICIAL_WAF_DOMAINS)
    if not is_official or response.status_code != 403:
        return False
    cf_mitigated = response.headers.get("cf-mitigated", "").lower()
    server = response.headers.get("server", "").lower()
    return cf_mitigated == "challenge" or "cloudflare" in server


async def check_one(
    client: httpx.AsyncClient,
    global_sem: asyncio.Semaphore,
    domain_sems: dict[str, asyncio.Semaphore],
    url: str,
    case_ids: list[str],
) -> dict[str, object]:
    """Vérifie une URL avec limitation par domaine et 1 retry sur 429."""
    host = (urlparse(url).hostname or "").lower()
    async with global_sem, domain_sems[host]:
        try:
            resp = await client.head(url)
            if resp.status_code in (403, 405, 400):
                resp = await client.get(url)
            if resp.status_code == 429:
                await asyncio.sleep(1.5)
                resp = await client.get(url)
            await asyncio.sleep(0.35)

            if 200 <= resp.status_code < 400:
                return {
                    "url": url,
                    "cases": case_ids,
                    "status": "OK",
                    "code": resp.status_code,
                    "final_url": str(resp.url),
                }
            if is_official_waf_challenge(url, resp):
                return {
                    "url": url,
                    "cases": case_ids,
                    "status": "WAF_OFFICIAL",
                    "code": resp.status_code,
                    "final_url": str(resp.url),
                }
            return {
                "url": url,
                "cases": case_ids,
                "status": "BROKEN",
                "code": resp.status_code,
                "final_url": str(resp.url),
            }
        except Exception as exc:  # noqa: BLE001
            return {
                "url": url,
                "cases": case_ids,
                "status": "BROKEN",
                "code": None,
                "error": f"{type(exc).__name__}: {exc}",
            }


async def run_checks() -> int:
    parser = argparse.ArgumentParser(description="Vérifie les liens sources de data/cases.yaml")
    parser.add_argument("--json", action="store_true", help="Affiche le rapport au format JSON")
    args = parser.parse_args()

    if not DATA_PATH.exists():
        print(f"[check_links] Fichier introuvable: {DATA_PATH}", file=sys.stderr)
        return 2

    payload = yaml.safe_load(DATA_PATH.read_text(encoding="utf-8"))
    url_to_cases: dict[str, list[str]] = {}
    for case in payload.get("cases", []):
        cid = case["id"]
        for src in case.get("sources", []):
            url_to_cases.setdefault(src["url"], []).append(cid)

    global_sem = asyncio.Semaphore(5)
    domain_sems: dict[str, asyncio.Semaphore] = defaultdict(lambda: asyncio.Semaphore(1))
    headers = {"User-Agent": USER_AGENT, "Accept": "text/html,application/pdf,*/*"}
    async with httpx.AsyncClient(
        timeout=httpx.Timeout(15.0),
        follow_redirects=True,
        headers=headers,
    ) as client:
        results = await asyncio.gather(
            *(
                check_one(client, global_sem, domain_sems, u, ids)
                for u, ids in url_to_cases.items()
            )
        )

    broken = [r for r in results if r["status"] == "BROKEN"]
    waf = [r for r in results if r["status"] == "WAF_OFFICIAL"]
    ok = [r for r in results if r["status"] == "OK"]

    if args.json:
        print(
            json.dumps(
                {"ok": len(ok), "waf_official": len(waf), "broken": len(broken), "results": results},
                ensure_ascii=False,
                indent=2,
            )
        )
    else:
        print(
            f"[check_links] {len(results)} URL(s) vérifiée(s) : "
            f"{len(ok)} OK, {len(waf)} WAF_OFFICIAL, {len(broken)} BROKEN"
        )
        for item in results:
            tag = item["status"]
            code = item.get("code") or item.get("error")
            print(f"  [{tag}] ({code}) {item['url']} <- {', '.join(item['cases'])}")

    return 1 if broken else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(run_checks()))
