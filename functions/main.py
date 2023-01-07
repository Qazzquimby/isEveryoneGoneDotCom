import abc
from pathlib import Path

from fastapi import FastAPI
import requests
from bs4 import BeautifulSoup

app = FastAPI()

DATA_PATH = Path("data")


class SiteChecker(abc.ABC):
    def __init__(
        self, url: str, element_name: str, element_attributes: dict, cache_path: Path
    ):
        self.url = url
        self.element_name = element_name
        self.element_attributes = element_attributes
        self.cache_path = cache_path

    def get_has_changed(self):
        old_value = self.get_old_value()
        new_value = self.get_new_value()
        return not new_value or old_value != new_value

    def get_old_value(self):
        with open(self.cache_path, "r") as f:
            title = f.read()
        return title

    def get_new_value(self):
        request = requests.get(self.url)
        if request.status_code == 200:
            soup = BeautifulSoup(request.text, "html.parser")
            title = soup.find(self.element_name, self.element_attributes).text
            with open(self.cache_path, "w", errors="ignore") as f:
                f.write(title)
            return title
        else:
            return None


class RedditChecker(SiteChecker):
    def __init__(self):
        super().__init__(
            url="https://old.reddit.com/r/all/new/",
            cache_path=Path("data") / "reddit.txt",
            element_name="p",
            element_attributes={"class": "title"},
        )


class WikipediaChecker(SiteChecker):
    def __init__(self):
        super().__init__(
            url="https://en.wikipedia.org/wiki/Special:RecentChanges?hidebots=1&hidecategorization=1&hideWikibase=1&limit=50&days=7&urlversion=2",
            cache_path=Path("data") / "wikipedia.txt",
            element_name="li",
            element_attributes={"class": "mw-changeslist-line"},
        )


SITE_CHECKERS = [
    RedditChecker(),
    WikipediaChecker(),
]


def is_everyone_gone():
    status = [checker.get_has_changed() for checker in SITE_CHECKERS]
    return not all(status), status


@app.get("/")
async def root():
    return is_everyone_gone()


if __name__ == "__main__":
    result = is_everyone_gone()
    print(result)
