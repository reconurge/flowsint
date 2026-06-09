from typing import Any, Dict, List
import requests
from bs4 import BeautifulSoup
from flowsint_core.core.enricher_base import Enricher
from flowsint_enrichers.registry import flowsint_enricher
from flowsint_types.domain import Domain
from flowsint_types.website import Website
from flowsint_core.core.logger import Logger


@flowsint_enricher
class DomainToWebsiteEnricher(Enricher):
    """From domain to website."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = Domain
    OutputType = Website

    @classmethod
    def name(cls) -> str:
        return "domain_to_website"

    @classmethod
    def category(cls) -> str:
        return "Domain"

    @classmethod
    def key(cls) -> str:
        return "domain"

    @classmethod
    def get_params_schema(cls) -> List[Dict[str, Any]]:
        """Optional toggles to skip the heavier extractions for faster scans."""
        return [
            {
                "name": "extract_content",
                "type": "select",
                "description": "Extract the page text content (can be slow / large)",
                "required": False,
                "default": "true",
                "options": [
                    {"label": "Enabled", "value": "true"},
                    {"label": "Disabled", "value": "false"},
                ],
            },
            {
                "name": "extract_technologies",
                "type": "select",
                "description": "Detect web technologies from the HTML",
                "required": False,
                "default": "true",
                "options": [
                    {"label": "Enabled", "value": "true"},
                    {"label": "Disabled", "value": "false"},
                ],
            },
            {
                "name": "extract_headers",
                "type": "select",
                "description": "Capture relevant HTTP response headers",
                "required": False,
                "default": "true",
                "options": [
                    {"label": "Enabled", "value": "true"},
                    {"label": "Disabled", "value": "false"},
                ],
            },
        ]

    def _param_enabled(self, name: str) -> bool:
        """A select param is enabled unless explicitly set to 'false'."""
        return self.params.get(name, "true") != "false"

    def _extract_headers(self, response: requests.Response) -> Dict[str, str]:
        """Pick out the relevant HTTP headers, dropping missing ones."""
        headers = {
            "content-type": response.headers.get("content-type"),
            "server": response.headers.get("server"),
            "x-powered-by": response.headers.get("x-powered-by"),
        }
        return {k: v for k, v in headers.items() if v}

    def _extract_page_info(
        self,
        html_content: str,
        extract_content: bool = True,
        extract_technologies: bool = True,
    ) -> Dict[str, Any]:
        """Extract title, description, and (optionally) content and technologies."""
        soup = BeautifulSoup(html_content, 'html.parser')

        # Extract title
        title = None
        title_tag = soup.find('title')
        if title_tag:
            title = title_tag.get_text().strip()

        # Extract meta description
        description = None
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        if meta_desc and meta_desc.get('content'):
            description = meta_desc.get('content').strip()

        info: Dict[str, Any] = {'title': title, 'description': description}

        # Extract text content (remove scripts and styles)
        if extract_content:
            for script in soup(['script', 'style']):
                script.decompose()
            content = soup.get_text(separator=' ', strip=True)
            # Limit content to first 5000 characters
            if len(content) > 5000:
                content = content[:5000] + "..."
            info['content'] = content

        # Detect technologies
        if extract_technologies:
            technologies = []

            # Check for common frameworks and libraries
            if soup.find('meta', attrs={'name': 'generator'}):
                generator = soup.find('meta', attrs={'name': 'generator'}).get('content')
                if generator:
                    technologies.append(generator)

            # Check for React
            if soup.find('div', id='root') or soup.find('div', id='react-root'):
                technologies.append('React')

            # Check for Vue.js
            if soup.find(attrs={'data-v-'}):
                technologies.append('Vue.js')

            # Check for Angular
            if soup.find(attrs={'ng-app'}) or soup.find(attrs={'ng-version'}):
                technologies.append('Angular')

            # Check for WordPress
            if soup.find('meta', attrs={'name': 'generator', 'content': lambda x: x and 'WordPress' in x}):
                technologies.append('WordPress')

            info['technologies'] = technologies

        return info

    def _build_website_data(
        self, domain: Domain, url: str, response: requests.Response
    ) -> Dict[str, Any]:
        """Assemble Website fields from a successful response, honoring params."""
        website_data: Dict[str, Any] = {
            'url': url,
            'domain': domain,
            'active': True,
            'status_code': response.status_code,
        }

        if self._param_enabled("extract_headers"):
            website_data['headers'] = self._extract_headers(response)

        page_info = self._extract_page_info(
            response.text,
            extract_content=self._param_enabled("extract_content"),
            extract_technologies=self._param_enabled("extract_technologies"),
        )
        website_data.update(page_info)
        return website_data

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        results: List[OutputType] = []
        for domain in data:
            try:
                website_data = {
                    'url': f"https://{domain.domain}",
                    'domain': domain,
                    'active': False
                }

                # Try HTTPS first, then HTTP.
                for scheme in ("https", "http"):
                    url = f"{scheme}://{domain.domain}"
                    try:
                        response = requests.get(
                            url, timeout=10, allow_redirects=True
                        )
                    except requests.RequestException:
                        continue

                    if response.status_code < 400:
                        website_data = self._build_website_data(domain, url, response)
                        break

                results.append(Website(**website_data))

            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {
                        "message": f"Error converting domain {domain.domain} to website: {e}"
                    },
                )
                # Add HTTPS URL as fallback
                results.append(Website(url=f"https://{domain.domain}", domain=domain, active=False))

        return results

    def postprocess(self, results: List[OutputType], original_input: List[InputType]) -> List[OutputType]:
        for website in results:
            # Log each redirect step
            if website.redirects:
                for i, redirect_url in enumerate(website.redirects):
                    next_url = (
                        website.redirects[i + 1]
                        if i + 1 < len(website.redirects)
                        else str(website.url)
                    )
                    redirect_payload = {
                        "message": f"Redirect: {str(redirect_url)} -> {str(next_url)}"
                    }
                    Logger.info(self.sketch_id, redirect_payload)

            if self._graph_service:
                # Create domain node
                self.create_node(website.domain)

                # Create website node
                self.create_node(website)

                # Create relationship
                self.create_relationship(website.domain, website, "HAS_WEBSITE")

            is_active_str = "active" if website.active else "inactive"
            redirects_str = (
                f" (redirects: {len(website.redirects)})" if website.redirects else ""
            )
            self.log_graph_message(
                f"{website.domain.domain} -> {str(website.url)} ({is_active_str}){redirects_str}"
            )

        return results


# Make types available at module level for easy access
InputType = DomainToWebsiteEnricher.InputType
OutputType = DomainToWebsiteEnricher.OutputType
