import abc
import os
import time
from pathlib import Path

from fastapi import FastAPI
import requests
from bs4 import BeautifulSoup
import pyrebase
from pyrebase.pyrebase import Auth

app = FastAPI()

DATA_PATH = Path("data")

key = os.environ.get("FIREBASE_KEY")

# firebase realtime  database
config = {
  "apiKey": key,
  "authDomain": "is-everyone-gone.firebaseapp.com",
  "databaseURL": "https://is-everyone-gone-default-rtdb.firebaseio.com/",
  "storageBucket": "is-everyone-gone.appspot.com"
}

firebase = pyrebase.initialize_app(config)
auth: Auth = firebase.auth()
user = auth.sign_in_anonymous()
db = firebase.database()


class SiteChecker(abc.ABC):
    def __init__(
        self, url: str, element_name: str, element_attributes: dict, cache_name: str
    ):
        self.url = url
        self.element_name = element_name
        self.element_attributes = element_attributes
        self.cache_name = cache_name

    def get_old_value(self, cache: dict):
        old_value = cache.get(self.cache_name)
        return old_value

    def get_new_value(self):
        request = requests.get(self.url)
        if request.status_code != 200:
            print(request.status_code, request.text)
            return None

        soup = BeautifulSoup(request.text, "html.parser")
        title = soup.find(self.element_name, self.element_attributes).text
        return title


class RedditChecker(SiteChecker):
    def __init__(self):
        super().__init__(
            url="https://old.reddit.com/r/all/new/",
            cache_name="reddit",
            element_name="p",
            element_attributes={"class": "title"},
        )


class WikipediaChecker(SiteChecker):
    def __init__(self):
        super().__init__(
            url="https://en.wikipedia.org/wiki/Special:RecentChanges?hidebots=1&hidecategorization=1&hideWikibase=1&limit=50&days=7&urlversion=2",
            cache_name="wikipedia",
            element_name="li",
            element_attributes={"class": "mw-changeslist-line"},
        )

SITE_CHECKERS = [
    RedditChecker(),
    WikipediaChecker(),
]


def save_cache(new_values):
    timestamp = str(int(time.time()))
    new_cache = { checker.cache_name: new_value for checker, new_value in zip(SITE_CHECKERS, new_values) }
    new_cache["timestamp"] = timestamp
    db.set(new_cache)

def is_everyone_gone():
    cache = db.get().val()
    old_values = [checker.get_old_value(cache) for checker in SITE_CHECKERS]
    new_values = [checker.get_new_value() for checker in SITE_CHECKERS]

    save_cache(new_values)

    response = [
        {"name": checker.cache_name,
         "old": old,
         "new": new,}
        for checker, old, new in zip(SITE_CHECKERS, old_values, new_values)
    ]
    return response

def get_has_changed(old, new):
    return new is not None and old != new

@app.get("/")
async def root():
    return is_everyone_gone()


if __name__ == "__main__":
    result = is_everyone_gone()
    print(result)
