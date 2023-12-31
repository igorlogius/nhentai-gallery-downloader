browser.browserAction.onClicked.addListener(async (tab) => {
  browser.browserAction.disable(tab.od);
  console.debug(tab);
  let tmp = await browser.tabs.executeScript({
    code: `
  Array.from(
    document.querySelectorAll(".thumb-container img") // site specific
  ).map((el) => {
    let url = el.getAttribute("data-src");
    if (url) {
      url = url.replace("https://t", "https://i"); // site specific
      url = url.replace("t.jpg", ".jpg"); // site specific
      url = url.replace("t.jpeg", ".jpeg"); // site specific
      url = url.replace("t.png", ".png"); // site specific
      url = url.replace("t.gif", ".gif"); // site specific
    }
    return url;
  });
        `,
  });
  //console.debug(tmp[0]);

  const urls = tmp[0];

  const zip = new JSZip();

  for (const url of urls) {
    const filename = url.split("/").pop();
    const fetch_ret = await fetch(url);
    zip.file(filename, fetch_ret.arrayBuffer(), {
      binary: "uint8Array",
    });
  }
  let blob = await zip.generateAsync({ type: "blob" }, (meta) => {
    browser.browserAction.setBadgeText({
      text: "" + Math.floor(meta.percent),
      tabId: tab.id,
    });
  });
  browser.browserAction.setBadgeText({
    text: "",
    tabId: tab.id,
  });
  saveAs(blob, tab.title + ".cbz");
  browser.browserAction.enable(tab.id);
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
