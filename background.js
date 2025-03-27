const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let downloadedIds = new Set();

async function setToStorage(id, value) {
  let obj = {};
  obj[id] = value;
  return browser.storage.local.set(obj);
}

async function getFromStorage(type, id, fallback) {
  let tmp = await browser.storage.local.get(id);
  return typeof tmp[id] === type ? tmp[id] : fallback;
}

browser.browserAction.onClicked.addListener(async (tab) => {
  const tabId = tab.id;
  const tabTitle = tab.title;
  let tmp;
  let tabdead = false;

  try {
    tmp = await browser.tabs.executeScript({
      code: `
          Array.from(
            document.querySelectorAll(".thumb-container img")
          ).map((el) => {
            let url = el.getAttribute("data-src");
            if (url) {
              url = url.replace("https://t", "https://i");
              url = url.replaceAll(".webp.webp", ".webp"); // fix: site issue duplicate .webp in data-src
              url = url.replace("t.jpg", ".jpg");
              url = url.replace("t.jpeg", ".jpeg");
              url = url.replace("t.png", ".png");
              url = url.replace("t.gif", ".gif");
              url = url.replace("t.webp", ".webp");
            }
            return url;
          });
        `,
    });
  } catch (e) {
    // stop if we fail to inject/extract the data
    return;
  }

  if (
    !Array.isArray(tmp) ||
    tmp.length !== 1 ||
    !Array.isArray(tmp[0]) ||
    tmp[0].length < 1
  ) {
    await browser.browserAction.setBadgeText({
      text: "❌",
      tabId,
    });
    return;
  }

  const urls = tmp[0];

  try {
    await browser.browserAction.disable(tabId);
  } catch (e) {
    tabdead = true;
  }

  const zip = new JSZip();

  let counter = 1;

  for (const url of urls) {
    const filename = url.split("/").pop();
    const fetch_ret = await fetch(url);
    zip.file(filename, fetch_ret.arrayBuffer(), {
      binary: "uint8Array",
    });

    if (!tabdead) {
      counter++;
      try {
        await browser.browserAction.setBadgeText({
          text: "" + Math.floor((counter / urls.length / 2) * 100),
          tabId,
        });
      } catch (e) {
        // noop
        tabdead = true;
      }
    }
    await sleep(1000);
  }

  let blob = await zip.generateAsync({ type: "blob" }, async (meta) => {
    if (!tabdead) {
      try {
        await browser.browserAction.setBadgeText({
          text: "" + Math.floor(50 + meta.percent / 2),
          tabId: tab.id,
        });
      } catch (e) {
        // noop
        tabdead = true;
      }
    }
  });
  if (!tabdead) {
    try {
      await browser.browserAction.setBadgeText({
        text: "✅",
        tabId,
      });

      const tmp = tab.url.split("https://nhentai.net/g/")[1].split("/")[0];
      if (!downloadedIds.has(tmp)) {
        downloadedIds.add(tmp);
        setToStorage("downloadedIds", downloadedIds);
      }
    } catch (e) {
      tabdead = true;
    }
  }
  saveAs(blob, tabTitle + ".cbz");
  if (!tabdead) {
    try {
      await browser.browserAction.enable(tabId);
    } catch (e) {
      tabdead = true;
    }
  }
});

const filter = {
  properties: ["url"],
};

function handleUpdated(tabId, changeInfo, tabInfo) {
  if (
    typeof changeInfo.url === "string" &&
    changeInfo.url.startsWith("https://nhentai.net/g/")
  ) {
    browser.browserAction.enable(tabId);
    const tmp = changeInfo.url.split("https://nhentai.net/g/")[1].split("/")[0];
    if (downloadedIds.has(tmp)) {
      browser.browserAction.setBadgeText({
        text: "✅",
        tabId,
      });
    }
  } else {
    browser.browserAction.setBadgeText({ text: "", tabId });
    browser.browserAction.disable(tabId);
  }
}

(async () => {
  downloadedIds = await getFromStorage("object", "downloadedIds", new Set());
  browser.tabs.onUpdated.addListener(handleUpdated, filter);

  browser.browserAction.disable();

  browser.browserAction.setBadgeBackgroundColor({ color: "white" });

  browser.menus.create({
    title: "Clear Downloaded History Markers",
    contexts: ["browser_action"],
    onclick: async (tab, info) => {
      downloadedIds.clear();
      setToStorage("downloadedIds", downloadedIds);

      Array.from(await browser.tabs.query({})).forEach((t) => {
        if (
          typeof t.url === "string" &&
          t.url.startsWith("https://nhentai.net/g/")
        ) {
          browser.browserAction.setBadgeText({
            text: "",
            tabId: t.id,
          });
        }
      });
    },
  });
})();
