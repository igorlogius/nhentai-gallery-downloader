async function downloadZip(ev) {
  ev.preventDefault();

  const zip = new JSZip();
  const downloadButton = ev.target;

  for (const url of getUrls()) {
    const filename = url.split("/").pop();
    const fetch_ret = await fetch(url);
    zip.file(filename, fetch_ret.arrayBuffer(), {
      binary: "uint8Array",
    });
  }
  let blob = await zip.generateAsync({ type: "blob" }, (meta) => {
    downloadButton.innerText = "Generating: " + Math.floor(meta.percent) + "%";
  });
  let galleryName = document.getElementsByTagName("h1")[0].innerText; // site specific
  saveAs(blob, galleryName + ".cbz");
}

function getUrls() {
  return Array.from(
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
}

// add download button

function addDownloadButton() {
  const buttonsBox = document.getElementById("download").parentNode; // site specific
  if (!buttonsBox) {
    return;
  }
  downloadButton = document.createElement("a");
  downloadButton.id = "downloadzip";
  downloadButton.onclick = downloadZip;
  downloadButton.className = "btn btn-secondary"; // site specific
  downloadButton.style.backgroundColor = "#7798a4"; // site specific
  downloadButton.innerText = "Download as cbz/zip";
  buttonsBox.appendChild(downloadButton);
}

addDownloadButton();
