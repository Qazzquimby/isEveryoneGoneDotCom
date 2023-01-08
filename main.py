import abc
import os
import time
from pathlib import Path
from typing import List

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
    "storageBucket": "is-everyone-gone.appspot.com",
}

firebase = pyrebase.initialize_app(config)
auth: Auth = firebase.auth()
user = auth.sign_in_anonymous()
db = firebase.database()

CURRENT_TIMESTAMP = str(int(time.time()))


class SiteChecker(abc.ABC):
    def __init__(
        self, url: str, element_name: str, element_attributes: dict, cache_name: str
    ):
        self.url = url
        self.element_name = element_name
        self.element_attributes = element_attributes
        self.cache_name = cache_name

        self.loaded = False
        self.old_value = None
        self.last_updated = None
        self.last_successful_read = None

        self.new_value = None

    def load(self, cache):
        self.loaded = True
        self.old_value = self.get_old_value(cache)
        self.new_value = self.get_new_value()
        # need to set timestamps

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

    def get_has_changed(self):
        return self.new_value is not None and self.old_value != self.new_value


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


SITE_CHECKERS: List[SiteChecker] = [
    RedditChecker(),
    WikipediaChecker(),
]


def save_cache(site_checkers: List[SiteChecker]):
    new_cache = {}
    for checker in site_checkers:
        site_cache = {
            "last_checked": CURRENT_TIMESTAMP,
        }
        if checker.new_value is not None:
            site_cache.update(
                {
                    "last_checked": CURRENT_TIMESTAMP,
                    "last_successful_read": CURRENT_TIMESTAMP,
                    "value": checker.new_value,
                }
            )
            if checker.get_has_changed():
                site_cache["last_updated"] = CURRENT_TIMESTAMP

        new_cache[checker.cache_name] = site_cache
    db.set(new_cache)


def update_db():
    cache = db.get().val()
    if cache is None:
        cache = {}

    for checker in SITE_CHECKERS:
        checker.load(cache)

    save_cache(SITE_CHECKERS)

    response = [
        {
            "name": checker.cache_name,
            "old": checker.old_value,
            "new": checker.new_value,
            "has_changed": checker.get_has_changed(),
            "has_new_value": checker.new_value is not None,
            "last_updated": checker.last_updated,
            "last_successful_read": checker.last_successful_read,
        }
        for checker in SITE_CHECKERS
    ]
    return response


@app.get("/")
async def root():
    return update_db()


if __name__ == "__main__":
    result = update_db()
    print(result)


#######
# Rewrite all the above code in typescript:
