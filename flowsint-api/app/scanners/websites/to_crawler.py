from datetime import datetime
from typing import List, Dict, Any, TypeAlias, Union, Set
import requests
import re
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from app.utils import resolve_type
from app.scanners.base import Scanner
from app.types.website import Website
from app.types.phone import Phone
from app.types.email import Email
from app.types.individual import Individual
from pydantic import TypeAdapter
from app.core.logger import Logger
import time
import spacy

InputType: TypeAlias = List[Website]
OutputType: TypeAlias = List[Dict[str, Union[Website, List[Phone], List[Email], List[Individual]]]]

# Disable SSL warnings
requests.packages.urllib3.disable_warnings()

# Load spaCy model for person recognition
try:
    nlp = spacy.load("fr_core_news_md")
except OSError:
    # Fallback to English model if French model is not available
    try:
        nlp = spacy.load("en_core_web_md")
    except OSError:
        # If no model is available, we'll handle this gracefully
        nlp = None


def remove_dup_email(emails):
    """Remove duplicate emails while preserving order."""
    return list(dict.fromkeys(emails))


def remove_dup_phone(phones):
    """Remove duplicate phones while preserving order."""
    return list(dict.fromkeys(phones))


def remove_dup_individual(individuals):
    """Remove duplicate individuals while preserving order."""
    seen = set()
    unique_individuals = []
    for individual in individuals:
        # Use full_name as the key for deduplication
        if individual.full_name not in seen:
            seen.add(individual.full_name)
            unique_individuals.append(individual)
    return unique_individuals


def get_email_from_mailto(html):
    """Extract emails from mailto links in HTML content."""
    try:
        emails = []
        
        # First, try to extract mailto patterns from the entire content (works for any format)
        mailto_pattern = r'mailto:([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})'
        mailto_matches = re.findall(mailto_pattern, html, re.IGNORECASE)
        for email in mailto_matches:
            email_clean = email.strip()
            if len(email_clean) <= 100:
                emails.append(email_clean)
        
        # If it looks like HTML, also try to parse it with BeautifulSoup for more structured extraction
        if '<' in html and '>' in html:
            try:
                soup = BeautifulSoup(html, 'lxml')
                # Find all anchor tags with mailto href
                mailto_links = soup.find_all('a', href=re.compile(r'^mailto:', re.IGNORECASE))
                
                for link in mailto_links:
                    href = link.get('href', '')
                    # Extract email from mailto:email@domain.com
                    email_match = re.search(r'^mailto:([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})', href, re.IGNORECASE)
                    if email_match:
                        email = email_match.group(1).strip()
                        if len(email) <= 100:
                            emails.append(email)
            except Exception:
                # If BeautifulSoup parsing fails, we already have the regex results
                pass
        
        # Remove duplicates while preserving order
        return remove_dup_email(emails)
        
    except Exception:
        return []


def get_email(html):
    """Extract emails from HTML content."""
    try:
        # Use BeautifulSoup to extract visible text with proper spacing
        if '<' in html and '>' in html:
            soup = BeautifulSoup(html, 'lxml')
            text = soup.get_text(separator=' ')
        else:
            text = html
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b'
        emails = re.findall(email_pattern, text)
        nodup_emails = remove_dup_email(emails)
        filtered_emails = []
        for email in nodup_emails:
            email_clean = email.strip()
            if len(email_clean) > 100:
                continue
            filtered_emails.append(email_clean)
        return filtered_emails
    except Exception:
        return []


def get_phone(html):
    """Extract phone numbers from HTML content."""
    try:
        # Simpler phone pattern that matches common formats
        phone_pattern = r'(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})'
        phones = re.findall(phone_pattern, html)
        # Reconstruct phone numbers from groups
        formatted_phones = []
        for phone in phones:
            if len(phone) == 3:
                formatted_phones.append(f"+1-{phone[0]}-{phone[1]}-{phone[2]}")
        
        # Also try a simpler pattern for basic phone numbers
        simple_pattern = r'\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}'
        simple_phones = re.findall(simple_pattern, html)
        
        # Combine and deduplicate
        all_phones = formatted_phones + simple_phones
        nodup_phones = remove_dup_phone(all_phones)
        return [phone.strip() for phone in nodup_phones]
    except Exception:
        return []


def get_individuals(text):
    """Extract individual names from text using spaCy."""
    try:
        if nlp is None:
            return []
        
        # Clean the text first - remove HTML tags and extra whitespace
        # Remove HTML tags
        clean_text = re.sub(r'<[^>]+>', ' ', text)
        # Remove extra whitespace
        clean_text = re.sub(r'\s+', ' ', clean_text).strip()
        
        # Process the cleaned text with spaCy
        doc = nlp(clean_text)
        
        # Extract person entities - French models use "PER", English models use "PERSON"
        person_entities = []
        for ent in doc.ents:
            if ent.label_ in ["PERSON", "PER"]:
                # Clean the entity text
                entity_text = ent.text.strip()
                # Remove any remaining HTML artifacts
                entity_text = re.sub(r'<[^>]+>', '', entity_text)
                # Remove common punctuation at the end
                entity_text = re.sub(r'[.,;:!?]+$', '', entity_text)
                # Only add if it's a reasonable length
                if len(entity_text) > 2 and len(entity_text) < 100:
                    person_entities.append(entity_text)
        
        # Remove duplicates while preserving order
        unique_persons = list(dict.fromkeys(person_entities))
        
        # Filter out very short names and common false positives
        filtered_persons = []
        for person in unique_persons:
            # Skip very short names
            if len(person) <= 2:
                continue
            # Skip names that are just common words
            common_words = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']
            if person.lower() in common_words:
                continue
            # Skip names that are just numbers
            if person.isdigit():
                continue
            filtered_persons.append(person)
        
        # Convert to Individual objects
        individuals = []
        for person in filtered_persons:
            # Split the name into parts
            name_parts = person.split()
            if len(name_parts) >= 2:
                # Assume first part is first name, rest is last name
                first_name = name_parts[0]
                last_name = " ".join(name_parts[1:])
                full_name = person
            else:
                # Single name - use as both first and last name
                first_name = person
                last_name = person
                full_name = person
            
            # Create Individual object
            individual = Individual(
                first_name=first_name,
                last_name=last_name,
                full_name=full_name
            )
            individuals.append(individual)
        
        return individuals
    except Exception as e:
        # Log the error for debugging
        print(f"Error in get_individuals: {str(e)}")
        return []


class WebsiteToCrawler(Scanner):
    """From website to crawler."""

    @classmethod
    def name(cls) -> str:
        return "to_crawler"

    @classmethod
    def category(cls) -> str:
        return "Website"
    
    @classmethod
    def key(cls) -> str:
        return "url"

    @classmethod
    def input_schema(cls) -> Dict[str, Any]:
        adapter = TypeAdapter(InputType)
        schema = adapter.json_schema()
        # Find the Website type in $defs
        website_def = schema["$defs"].get("Website")
        if not website_def:
            raise ValueError("Website type not found in schema")
        return {
            "type": "Website",
            "properties": [
                {"name": prop, "type": resolve_type(info, schema)}
                for prop, info in website_def["properties"].items()
            ]
        }

    @classmethod
    def output_schema(cls) -> Dict[str, Any]:
        adapter = TypeAdapter(OutputType)
        schema = adapter.json_schema()
        # For complex output types, we need to create a custom schema
        return {
            "type": "WebsiteResult",
            "properties": [
                {"name": "website", "type": "Website"},
                {"name": "emails", "type": "Email[]"},
                {"name": "phones", "type": "Phone[]"},
                {"name": "individuals", "type": "Individual[]"}
            ]
        }

    def is_same_domain(self, url: str, base_domain: str) -> bool:
        """Check if URL belongs to the same domain."""
        try:
            parsed_url = urlparse(url)
            parsed_base = urlparse(base_domain)
            return parsed_url.netloc == parsed_base.netloc
        except Exception:
            return False

    def extract_internal_links(self, soup: BeautifulSoup, base_url: str, visited_urls: Set[str]) -> Set[str]:
        """Extract internal links from the page."""
        internal_links = set()
        
        try:
            # Find all anchor tags
            for link in soup.find_all('a', href=True):
                href = link.get('href')
                if not href:
                    continue
                    
                # Resolve relative URLs
                absolute_url = urljoin(base_url, href)
                
                # Check if it's an internal link and not already visited
                if self.is_same_domain(absolute_url, base_url) and absolute_url not in visited_urls:
                    # Filter out common non-content URLs
                    if not any(exclude in absolute_url.lower() for exclude in [
                        '#', 'javascript:', 'mailto:', 'tel:', '.pdf', '.doc', '.docx', 
                        '.jpg', '.jpeg', '.png', '.gif', '.css', '.js', '.xml', '.rss',
                        'logout', 'admin', 'login', 'register', 'signup', 'signin'
                    ]):
                        internal_links.add(absolute_url)
                        
        except Exception:
            pass
            
        return internal_links

    def get_final_url(self, url: str, timeout: int = 30) -> str:
        """Follow redirects to get the final URL."""
        try:
            response = requests.head(url, verify=False, timeout=timeout, allow_redirects=True)
            return response.url
        except Exception:
            return url

    def crawl_website_comprehensive(self, url: str, max_pages: int = 50, timeout: int = 30, delay: float = 1.0) -> Dict[str, Any]:
        """Comprehensive website crawler that follows internal links."""
        result = {"website": url, "emails": [], "phones": [], "individuals": []}
        visited_urls = set()
        urls_to_visit = set()
        
        try:
            # Ensure URL has protocol
            if not url.startswith('http'):
                url = 'https://' + url
            
            # Get final URL after redirects
            final_url = self.get_final_url(url, timeout)
            base_domain = urlparse(final_url).netloc
            
            # Start with the main page
            urls_to_visit.add(final_url)
            
            page_count = 0
            
            while urls_to_visit and page_count < max_pages:
                current_url = urls_to_visit.pop()
                
                if current_url in visited_urls:
                    continue
                    
                visited_urls.add(current_url)
                page_count += 1
                
                # Log current page being crawled
                Logger.info(self.sketch_id, {"message": f"Crawling page {page_count}: {current_url}"})
                
                try:
                    # Add delay to be respectful to the server
                    if page_count > 1:
                        time.sleep(delay)
                    
                    # Get the page
                    response = requests.get(current_url, verify=False, timeout=timeout)
                    
                    # Only proceed if we get a 200 status code
                    if response.status_code != 200:
                        Logger.info(self.sketch_id, {"message": f"Skipping {current_url} - status code: {response.status_code}"})
                        continue
                    
                    # Parse HTML content
                    html_content = getattr(response, 'text', None)
                    if html_content is None:
                        html_content = response.content.decode(response.encoding or 'utf-8', errors='replace')
                    
                    soup = BeautifulSoup(html_content, 'lxml', from_encoding=response.encoding)
                    visible_text = soup.get_text(separator=' ')
                    
                    # Extract emails from both HTML content (for mailto links) and visible text (for regular patterns)
                    page_emails_from_text = get_email(visible_text)
                    page_emails_from_mailto = get_email_from_mailto(html_content)
                    page_emails = remove_dup_email(page_emails_from_text + page_emails_from_mailto)
                    
                    page_phones = get_phone(visible_text)
                    # page_individuals = get_individuals(visible_text)
                    
                    # Log findings for this page
                    # if page_emails or page_phones or page_individuals:
                    if page_emails or page_phones:
                        Logger.info(self.sketch_id, {
                            # "message": f"Found {len(page_emails)} emails, {len(page_phones)} phones, and {len(page_individuals)} individuals on {current_url}"
                            "message": f"Found {len(page_emails)} emails, {len(page_phones)} phones on {current_url}"
                        })
                    
                    # Add to results
                    result["emails"].extend(page_emails)
                    result["phones"].extend(page_phones)
                    # result["individuals"].extend(page_individuals)
                    
                    # Extract internal links for further crawling
                    if page_count < max_pages:
                        new_links = self.extract_internal_links(soup, current_url, visited_urls)
                        urls_to_visit.update(new_links)
                        if new_links:
                            Logger.info(self.sketch_id, {"message": f"Found {len(new_links)} new internal links on {current_url}"})
                    
                except Exception as e:
                    # Log error but continue with other pages
                    Logger.error(self.sketch_id, {"message": f"Error crawling {current_url}: {str(e)}"})
                    continue
            
            # Remove duplicates from final results
            result["emails"] = remove_dup_email(result["emails"])
            result["phones"] = remove_dup_phone(result["phones"])
            result["individuals"] = remove_dup_individual(result["individuals"])
            
        except Exception as e:
            Logger.error(self.sketch_id, {"message": f"Error in comprehensive crawl of {url}: {str(e)}"})
        
        return result

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
   
    def scan(self, data: InputType) -> OutputType:
        """Crawl websites to extract emails and phone numbers."""
        results = []
        
        for website in data:
            try:
                Logger.info(self.sketch_id, {"message": f"Starting comprehensive crawl of {str(website.url)}"})
                
                crawl_result = self.crawl_website_comprehensive(str(website.url))
                
                # Create structured result for this website
                website_result = {
                    "website": str(website.url),  # Store as string instead of Website object
                    "emails": [],
                    "phones": [],
                    "individuals": []
                }
                
                # Create Email objects for found emails
                for email in crawl_result["emails"]:
                    website_result["emails"].append(Email(email=email))
                
                # Create Phone objects for found phone numbers
                for phone in crawl_result["phones"]:
                    website_result["phones"].append(Phone(number=phone))
                
                # Create Individual objects for found individuals
                for individual in crawl_result["individuals"]:
                    website_result["individuals"].append(individual)
                
                # Log results
                Logger.info(self.sketch_id, {
                    "message": f"Crawl completed for {str(website.url)}: {len(website_result['emails'])} emails, {len(website_result['phones'])} phones, and {len(website_result['individuals'])} individuals found"
                })
                
                if not website_result["emails"] and not website_result["phones"] and not website_result["individuals"]:
                    Logger.info(self.sketch_id, {"message": f"No emails, phones, or individuals found for website {str(website.url)}"})
                elif not website_result["emails"]:
                    Logger.info(self.sketch_id, {"message": f"No emails found for website {str(website.url)}"})
                elif not website_result["phones"]:
                    Logger.info(self.sketch_id, {"message": f"No phones found for website {str(website.url)}"})
                elif not website_result["individuals"]:
                    Logger.info(self.sketch_id, {"message": f"No individuals found for website {str(website.url)}"})
                
                results.append(website_result)
                    
            except Exception as e:
                # Log error but continue with other websites
                Logger.error(self.sketch_id, {"message": f"Error crawling {str(website.url)}: {str(e)}"})
                # Add empty result for failed website
                results.append({
                    "website": str(website.url),  # Store as string instead of Website object
                    "emails": [],
                    "phones": [],
                    "individuals": []
                })
                continue

        return results

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        # Create Neo4j relationships between websites and their corresponding emails and phones
        for input_website, result in zip(original_input, results):
            website_url = str(input_website.url)
            
            # Create website node
            website_query = """
            MERGE (website:website {url: $website_url})
            SET website.sketch_id = $sketch_id,
                website.label = $website_url,
                website.caption = $website_url,
                website.type = "website"
            """
            
            if self.neo4j_conn:
                self.neo4j_conn.query(website_query, {
                    "website_url": website_url,
                    "sketch_id": self.sketch_id,
                })
                
                # Create email nodes and relationships
                for email in result["emails"]:
                    email_query = """
                    MERGE (email:email {email: $email_address})
                    SET email.sketch_id = $sketch_id,
                        email.label = $email_address,
                        email.caption = $email_address,
                        email.type = "email"
                    
                    MERGE (website:website {url: $website_url})
                    MERGE (website)-[:HAS_EMAIL {sketch_id: $sketch_id}]->(email)
                    """
                    
                    self.neo4j_conn.query(email_query, {
                        "email_address": email.email,
                        "website_url": website_url,
                        "sketch_id": self.sketch_id,
                    })
                    Logger.graph_append(self.sketch_id, {"message": f"Found email {email.email} for website {website_url}"})
                
                # Create phone nodes and relationships
                for phone in result["phones"]:
                    phone_query = """
                    MERGE (phone:phone {number: $phone_number})
                    SET phone.sketch_id = $sketch_id,
                        phone.label = $phone_number,
                        phone.caption = $phone_number,
                        phone.type = "phone"
                    
                    MERGE (website:website {url: $website_url})
                    MERGE (website)-[:HAS_PHONE {sketch_id: $sketch_id}]->(phone)
                    """
                    
                    self.neo4j_conn.query(phone_query, {
                        "phone_number": phone.number,
                        "website_url": website_url,
                        "sketch_id": self.sketch_id,
                    })
                    Logger.graph_append(self.sketch_id, {"message": f"Found phone {phone.number} for website {website_url}"})
                
                # Create individual nodes and relationships
                for individual in result["individuals"]:
                    individual_query = """
                    MERGE (individual:individual {full_name: $full_name})
                    SET individual.sketch_id = $sketch_id,
                        individual.label = $full_name,
                        individual.caption = $full_name,
                        individual.type = "individual",
                        individual.first_name = $first_name,
                        individual.last_name = $last_name
                    
                    MERGE (website:website {url: $website_url})
                    MERGE (website)-[:MENTIONS_INDIVIDUAL {sketch_id: $sketch_id}]->(individual)
                    """
                    
                    self.neo4j_conn.query(individual_query, {
                        "full_name": individual.full_name,
                        "first_name": individual.first_name,
                        "last_name": individual.last_name,
                        "website_url": website_url,
                        "sketch_id": self.sketch_id,
                    })
                    Logger.graph_append(self.sketch_id, {"message": f"Found individual {individual.full_name} for website {website_url}"})

        return results