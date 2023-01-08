/* eslint-disable require-jsdoc */

import * as functions from "firebase-functions";

import {initializeApp} from "firebase/app";
import {get, getDatabase, ref, set} from "firebase/database";

import {JSDOM} from "jsdom";

const key = process.env.FIREBASE_KEY;

const config = {
  apiKey: key,
  authDomain: "is-everyone-gone.firebaseapp.com",
  databaseURL: "https://is-everyone-gone-default-rtdb.firebaseio.com/",
  storageBucket: "is-everyone-gone.appspot.com",
};

const app = initializeApp(config);
const db = getDatabase(app);

const CURRENT_TIMESTAMP = Math.floor(Date.now() / 1000).toString();

export const recurringUpdateDb = functions.pubsub
    .schedule("every 30 minutes")
    .onRun(async () => {
      await updateDb();

      functions.logger.info("Updated db", {structuredData: true});
    });

type SiteCache = Record<string, string>;
type Cache = Record<string, SiteCache>;
class SiteChecker {
  url: string;
  selector: string;
  cacheName: string;
  loaded: boolean;
  oldValue: string | null;
  lastUpdated: string | null;
  lastSuccessfulRead: string | null;
  newValue: string | null;

  constructor(
      url: string,
      selector: string,
      cacheName: string,
  ) {
    this.url = url;
    this.selector = selector;
    this.cacheName = cacheName;

    this.loaded = false;
    this.oldValue = null;
    this.lastUpdated = null;
    this.lastSuccessfulRead = null;

    this.newValue = null;
  }

  async load(cache: SiteCache) {
    this.loaded = true;
    this.oldValue = cache.value;
    this.lastUpdated = cache.lastUpdated;
    this.lastSuccessfulRead = cache.lastSuccessfulRead;

    this.newValue = await this.getNewValue();
  }

  async getNewValue() {
    const response = await fetch(this.url);
    const text = await response.text();

    if (!response.ok) {
      console.log(response.status, text);
      return null;
    }

    const dom = new JSDOM(text);
    const element = dom.window.document.querySelector(this.selector);

    if (element === null) {
      console.log("Element not found");
      return null;
    } else {
      return element.textContent;
    }
  }

  getHasChanged() {
    return this.newValue !== null && this.oldValue !== this.newValue;
  }
}


class RedditChecker extends SiteChecker {
  url = "https://old.reddit.com/r/all/new/";
  cacheName = "reddit";
  loaded = false;
  oldValue = null;
  lastUpdated = null;
  lastSuccessfulRead = null;
  newValue = null;

  constructor() {
    super(
        "https://old.reddit.com/r/all/new/",
        "p.title",
        "reddit",
    );
  }
}

class WikipediaChecker extends SiteChecker {
  url = "https://en.wikipedia.org/wiki/Special:RecentChanges?hidebots=1&hidecategorization=1&hideWikibase=1&limit=50&days=7&urlversion=2";
  selector = "li";
  elementAttributes = {class: "mw-changeslist-line"};
  cacheName = "wikipedia";
  loaded = false;
  oldValue = null;
  lastUpdated = null;
  lastSuccessfulRead = null;
  newValue = null;

  constructor() {
    super(
        "https://en.wikipedia.org/wiki/Special:RecentChanges?hidebots=1&hidecategorization=1&hideWikibase=1&limit=50&days=7&urlversion=2",
        "li.mw-changeslist-line",
        "wikipedia",
    );
  }
}

const SITE_CHECKERS: SiteChecker[] = [
  new RedditChecker(),
  new WikipediaChecker(),
];

async function saveCache(siteCheckers: SiteChecker[]) {
  const newCache: Record<string, Record<string, string>> = {};
  for (const checker of siteCheckers) {
    const siteCache: Record<string, string> = {
      lastChecked: CURRENT_TIMESTAMP,
    };
    if (checker.newValue !== null) {
      siteCache.lastChecked = CURRENT_TIMESTAMP;
      siteCache.lastSuccessfulRead = CURRENT_TIMESTAMP;
      siteCache.value = checker.newValue;
      if (checker.getHasChanged()) {
        siteCache.lastUpdated = CURRENT_TIMESTAMP;
      }
    }
    newCache[checker.cacheName] = siteCache;
  }
  await set(ref(db), newCache);
}

export async function updateDb() {
  let cache: Cache = (await get(ref(db))).val();
  if (cache === null) {
    cache = {};
  }

  for (const checker of SITE_CHECKERS) {
    checker.load(cache[checker.cacheName]);
  }

  await saveCache(SITE_CHECKERS);

  const response = SITE_CHECKERS.map((checker) => ({
    name: checker.cacheName,
    old: checker.oldValue,
    new: checker.newValue,
    hasChanged: checker.getHasChanged(),
    hasNewValue: checker.newValue !== null,
    lastUpdated: checker.lastUpdated,
    lastSuccessfulRead: checker.lastSuccessfulRead,
  }));
  return response;
}

updateDb().then((response) => console.log(response));
