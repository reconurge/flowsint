import requests
from bs4 import BeautifulSoup

def extract_text_from_url(url):
    try:
        # Send a GET request to the URL
        response = requests.get(url)
        response.raise_for_status()  # Raise an exception for HTTP errors

        # Parse the HTML content using BeautifulSoup
        soup = BeautifulSoup(response.text, 'html.parser')

        # Extract all the text from the page
        text = soup.get_text()

        return text
    except requests.exceptions.RequestException as e:
        print(f"Error fetching the URL: {e}")
        return None
    except Exception as e:
        print(f"An error occurred: {e}")
        return None

# Example usage
if __name__ == "__main__":
    url = input("Enter the URL of the webpage: ")
    extracted_text = extract_text_from_url(url)
    if extracted_text:
        print("Extracted Text:")
        print(extracted_text)