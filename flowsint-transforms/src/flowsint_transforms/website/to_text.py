from typing import List, Union
from flowsint_core.core.transform_base import Transform
from flowsint_types.phrase import Phrase
from flowsint_types.website import Website
import requests
from bs4 import BeautifulSoup


class WebsiteToText(Transform):
    """Extracts the texts in a webpage."""

    InputType = List[Website]
    OutputType = List[Phrase]

    @classmethod
    def name(cls) -> str:
        return "website_to_text"

    @classmethod
    def category(cls) -> str:
        return "Website"

    @classmethod
    def key(cls) -> str:
        return "website"

    def preprocess(self, data: Union[List[str], List[dict], InputType]) -> InputType:
        cleaned: InputType = []
        for item in data:
            website_obj = None
            if isinstance(item, str):
                website_obj = Website(url=item)
            elif isinstance(item, dict) and "url" in item:
                website_obj = Website(url=item["url"])
            elif isinstance(item, Website):
                website_obj = item
            if website_obj:
                cleaned.append(website_obj)
        return cleaned

    async def scan(self, data: InputType) -> OutputType:
        results: OutputType = []
        for website in data:
            text_data = self._extract_text(website.url)
            if text_data:
                phrase_obj = Phrase(text=text_data)
                results.append(phrase_obj)
        return results

    def _extract_text(self, website_url: str) -> str:
        try:
            response = requests.get(website_url, timeout=8)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, "html.parser")
            text = soup.get_text()
            return text
        except requests.exceptions.RequestException as e:
            print(f"Error fetching the URL: {e}")
            return None
        except Exception as e:
            print(f"An error occurred: {e}")
            return None

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        # Create Neo4j relationships between websites and their corresponding phrases
        for input_website, result in zip(original_input, results):
            website_url = str(input_website.url)

            if self.neo4j_conn:
                self.create_node(
                    "website",
                    "url",
                    str(website_url),
                    caption=str(website_url),
                    type="website",
                )

                # Create relationship with the specific phrase for this website
                self.create_node(
                    "phrase",
                    "text",
                    result.text,
                    caption=result.text,
                    type="phrase",
                )
                self.create_relationship(
                    "website",
                    "url",
                    website_url,
                    "phrase",
                    "text",
                    result.text,
                    "HAS_INNER_TEXT",
                )
                self.log_graph_message(
                    f"Extracted some text from the website {website_url}."
                )
        return results


# Make types available at module level for easy access
InputType = WebsiteToText.InputType
OutputType = WebsiteToText.OutputType
