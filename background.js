const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
              url = url.replace("t.jpg", ".jpg");
              url = url.replace("t.jpeg", ".jpeg");
              url = url.replace("t.png", ".png");
              url = url.replace("t.gif", ".gif");
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
  } else {
    browser.browserAction.setBadgeText({ text: "", tabId });
    browser.browserAction.disable(tabId);
  }
}

browser.tabs.onUpdated.addListener(handleUpdated, filter);

browser.browserAction.disable();

browser.browserAction.setBadgeBackgroundColor({ color: "white" });
