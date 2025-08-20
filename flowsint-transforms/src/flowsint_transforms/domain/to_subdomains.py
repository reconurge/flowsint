import shutil
import requests
from typing import List, Union
from flowsint_core.core.scanner_base import Scanner
from flowsint_types.domain import Domain
from flowsint_core.utils import is_valid_domain
from flowsint_core.core.logger import Logger
from tools.network.subfinder import SubfinderTool
from flowsint_core.core.logger import Logger


class SubdomainScanner(Scanner):
    """Scanner to find subdomains associated with a domain."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = List[Domain | str]
    OutputType = List[Domain]

    @classmethod
    def name(cls) -> str:
        return "domain_to_subdomains"

    @classmethod
    def category(cls) -> str:
        return "Domain"

    @classmethod
    def key(cls) -> str:
        return "domain"

    def preprocess(self, data: Union[List[str], List[dict], InputType]) -> InputType:
        cleaned: InputType = []
        for item in data:
            domain_obj = None
            if isinstance(item, str):
                domain_obj = Domain(domain=item)
            elif isinstance(item, dict) and "domain" in item:
                domain_obj = Domain(domain=item["domain"])
            elif isinstance(item, Domain):
                domain_obj = item
            if domain_obj and is_valid_domain(domain_obj.domain):
                cleaned.append(domain_obj)
        return cleaned

    async def scan(self, data: InputType) -> OutputType:
        """Find subdomains using subfinder (if available) or fallback to crt.sh."""
        domains: OutputType = []
        use_subfinder = not self.__is_subfinder_installed()

        for md in data:
            d = Domain(domain=md.domain)
            if use_subfinder:
                subdomains = self.__get_subdomains_from_subfinder(d.domain)
                if not subdomains:
                    Logger.warn(
                        self.sketch_id,
                        f"subfinder failed for {d.domain}, falling back to crt.sh",
                    )
                    subdomains = self.__get_subdomains_from_crtsh(d.domain)
            else:
                Logger.info(self.sketch_id, "subfinder not found, using crt.sh only")
                subdomains = self.__get_subdomains_from_crtsh(d.domain)

            domains.append({"domain": d.domain, "subdomains": sorted(subdomains)})

        return domains

    def __is_subfinder_installed(self) -> bool:
        return shutil.which("subfinder") is not None

    def __get_subdomains_from_crtsh(self, domain: str) -> set[str]:
        subdomains: set[str] = set()
        try:
            response = requests.get(
                f"https://crt.sh/?q=%25.{domain}&output=json", timeout=60
            )
            if response.ok:
                entries = response.json()
                for entry in entries:
                    name_value = entry.get("name_value", "")
                    for sub in name_value.split("\n"):
                        sub = sub.strip().lower()
                        if (
                            "*" not in sub
                            and is_valid_domain(sub)
                            and sub.endswith(domain)
                            and sub != domain
                        ):
                            subdomains.add(sub)
                        elif "*" in sub:
                            continue
        except Exception as e:
            Logger.error(self.sketch_id, f"crt.sh failed for {domain}: {e}")
        return subdomains

    def __get_subdomains_from_subfinder(self, domain: str) -> set[str]:
        subdomains: set[str] = set()
        subfinder = SubfinderTool()
        try:
            subdomains = subfinder.launch(domain)
        except Exception as e:
            Logger.error(self.sketch_id, f"subfinder exception for {domain}: {e}")
        return subdomains

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        output: OutputType = []
        for domain_obj in results:
            if not self.neo4j_conn:
                continue
            for subdomain in domain_obj["subdomains"]:
                output.append(Domain(domain=subdomain))
                Logger.info(
                    self.sketch_id,
                    {"message": f"{domain_obj['domain']} -> {subdomain}"},
                )

                # Create subdomain node
                self.create_node("domain", "domain", subdomain, type="domain")

                # Create relationship from parent domain to subdomain
                self.create_relationship(
                    "domain",
                    "domain",
                    domain_obj["domain"],
                    "domain",
                    "domain",
                    subdomain,
                    "HAS_SUBDOMAIN",
                )

            self.log_graph_message(
                f"{domain_obj['domain']} -> {len(domain_obj['subdomains'])} subdomain(s) found."
            )

        return output


InputType = SubdomainScanner.InputType
OutputType = SubdomainScanner.OutputType
