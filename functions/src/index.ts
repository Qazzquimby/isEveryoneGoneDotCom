/* eslint-disable require-jsdoc */
// updateDb function. Runs every 30 minutes, uses "https://is-everyone-gone-default-rtdb.firebaseio.com/",

import * as functions from "firebase-functions";
// import firebase from "firebase/app";
// require("firebase/auth");
// require("firebase/database");

const key = process.env.FIREBASE_KEY;

const config = {
  apiKey: key,
  authDomain: "is-everyone-gone.firebaseapp.com",
  databaseURL: "https://is-everyone-gone-default-rtdb.firebaseio.com/",
  storageBucket: "is-everyone-gone.appspot.com",
};

// firebase.initializeApp(config);

// const auth = firebase.auth();
// const user = auth.signInAnonymously();
// const db = firebase.database();

const CURRENT_TIMESTAMP = Math.floor(Date.now() / 1000).toString();

export const recurringUpdateDb = functions.pubsub
    .schedule("every 30 minutes")
    .onRun(async (_context) => {
      await updateDb();

      functions.logger.info("Updated db", {structuredData: true});
    });

type SiteCache = Record<string, string>;
type Cache = Record<string, SiteCache>;
class SiteChecker {
  url: string;
  elementName: string;
  elementAttributes: Record<string, string>;
  cacheName: string;
  loaded: boolean;
  oldValue: string | null;
  lastUpdated: string | null;
  lastSuccessfulRead: string | null;
  newValue: string | null;

  constructor(
      url: string,
      elementName: string,
      elementAttributes: Record<string, string>,
      cacheName: string,
  ) {
    this.url = url;
    this.elementName = elementName;
    this.elementAttributes = elementAttributes;
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

    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");
    const element = doc.querySelector(this.elementName);
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
  elementName = "p";
  elementAttributes = {class: "title"};
  cacheName = "reddit";
  loaded = false;
  oldValue = null;
  lastUpdated = null;
  lastSuccessfulRead = null;
  newValue = null;

  constructor() {
    super(
        "https://old.reddit.com/r/all/new/",
        "p",
        {class: "title"},
        "reddit",
    );
  }
}

class WikipediaChecker extends SiteChecker {
  url = "https://en.wikipedia.org/wiki/Special:RecentChanges?hidebots=1&hidecategorization=1&hideWikibase=1&limit=50&days=7&urlversion=2";
  elementName = "li";
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
        "li",
        {class: "mw-changeslist-line"},
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
  await db.set(newCache);
}

async function updateDb() {
  let cache = (await db.get()).val();
  if (cache === null) {
    cache = {};
  }

  for (const checker of SITE_CHECKERS) {
    checker.load(cache);
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

