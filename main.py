from pathlib import Path

from fastapi import FastAPI
import requests
from bs4 import BeautifulSoup

app = FastAPI()

DATA_PATH = Path("data")
REDDIT_PATH = Path("data") / "reddit.txt"

def get_most_recent_reddit_title():
    request = requests.get("https://old.reddit.com/r/all/new/")
    if request.status_code == 200:
        soup = BeautifulSoup(request.text, "html.parser")
        title = soup.find("p", {"class": "title"}).text
        with open(REDDIT_PATH, "w") as f:
            f.write(title)
        return title
    else:
        return None

def get_old_reddit_title():
    with open(REDDIT_PATH, "r") as f:
        title = f.read()
    return title

def get_reddit_has_updated():
    old_value = get_old_reddit_title()
    new_value = get_most_recent_reddit_title()
    return not new_value or old_value != new_value

def is_everyone_gone():
    reddit_updated = get_reddit_has_updated()

    return reddit_updated


@app.get("/")
async def root():
    return is_everyone_gone()

if __name__ == '__main__':
    result = is_everyone_gone()
    print(result)