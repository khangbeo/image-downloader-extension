let allSelected = false; // To keep track if all are currently selected or not
let hasImages = false;
const countDisplay = document.getElementById("selectedImageCount");

const notificationPopup = document.getElementById("notificationPopup");
const notificationMessage = document.getElementById("notificationMessage");

// buttons
const selectAllBtn = document.getElementById("selectAllBtn");
const getImagesBtn = document.getElementById("getImagesBtn");
const downloadBtn = document.getElementById("downloadBtn");
const startOver = document.getElementById("startOver");
const goBackBtn = document.getElementById("goBack");
const downloadZIPBtn = document.getElementById("downloadZIPBtn");

// form inputs
const groupSelect = document.getElementById("groupSelect");

// pages
const initialPage = document.getElementById("initialPage");
const secondPage = document.getElementById("secondPage");
const imageForm = document.getElementById("imageForm");
const previewPage = document.getElementById("previewPage");

const noContentDiv = document.getElementById("noContent");
const imageGrid = document.getElementById("imageGrid");
const downloadReadyMessage = document.getElementById("downloadReadyMessage");
const loadingMessage = document.getElementById("loadingMessage");

function showNotification(message) {
  notificationMessage.textContent = message;
  notificationPopup.style.transform = "scale(1)"; // Show the notification

  // Hide the notification after 3 seconds
  setTimeout(() => {
    notificationPopup.style.transform = "scale(0)";
  }, 1500);
}

function showElement(element, display = "block") {
  element.style.display = display;
}

function hideElement(element) {
  element.style.display = "none";
}

function toggleVisibility(element) {
  if (element.style.display === "none" || !element.style.display) {
    showElement(element);
  } else {
    hideElement(element);
  }
}

function toggleImageBrightness(container) {
  const checkbox = container.querySelector("input[type='checkbox']");
  checkbox.checked = !checkbox.checked;
  if (checkbox.checked) {
    container.classList.add("brightness-50");
  } else {
    container.classList.remove("brightness-50");
  }
}

function fetchImages(selector, selectedGroupId, callback) {
  let allImages = [];

  chrome.tabs.query({ groupId: selectedGroupId }, (tabs) => {
    let processedTabs = 0; // to keep track of tabs that have finished processing

    tabs.forEach((tab) => {
      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          files: ["./src/contentScript.js"],
        },
        () => {
          chrome.tabs.sendMessage(
            tab.id,
            { action: "getImages", selector: selector },
            (images) => {
              if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                return;
              }

              if (Array.isArray(images)) {
                allImages = allImages.concat(images);
                processedTabs++;

                if (processedTabs === tabs.length) {
                  // all tabs have responded
                  callback(allImages);
                }
              } else {
                console.error("Received unexpected data:", images);
              }
            }
          );
        }
      );
    });
  });
}

function displayImages(allImages) {
  if (allImages.length === 0) {
    hasImages = false;
    noContentDiv.textContent = "No images found with the selected attribute.";
    hideElement(selectAllBtn);
    showElement(noContentDiv);
    hideElement(imageGrid);
    return;
  }

  hasImages = true;
  hideElement(noContentDiv);
  showElement(imageGrid, "grid");
  showElement(selectAllBtn);

  const fragment = document.createDocumentFragment();
  allImages.forEach((imgUrl) => {
    const container = createImageContainer(imgUrl);
    fragment.appendChild(container);
  });
  imageGrid.appendChild(fragment);
}

function createImageContainer(imgUrl) {
  const container = document.createElement("div");
  container.classList.add("relative", "w-32", "h-32");

  const imgElem = document.createElement("img");
  imgElem.src = imgUrl;
  imgElem.classList.add("object-cover", "w-full", "h-full");
  container.appendChild(imgElem);

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.classList.add("hidden");
  container.appendChild(checkbox);
  return container;
}

function updateSelectedImageCount() {
  const checkboxes = document.querySelectorAll(
    "#imageGrid input[type='checkbox']"
  );
  const selectedCount = Array.from(checkboxes).filter(
    (cb) => cb.checked
  ).length;

  countDisplay.textContent =
    selectedCount === 1
      ? "1 image selected"
      : `${selectedCount} images selected`;
  downloadZIPBtn.textContent =
    selectedCount === 1
      ? "Download 1 image"
      : `Download ${selectedCount} images`;
}

imageGrid.addEventListener("click", (e) => {
  if (e.target.tagName === "IMG") {
    const container = e.target.parentElement;
    toggleImageBrightness(container);
    updateSelectedImageCount();
  }
});

goBackBtn.addEventListener("click", () => {
  showElement(secondPage, "flex");
  hideElement(previewPage);
  countDisplay.textContent = "0 images selected";
  allSelected = false;
  selectAllBtn.textContent = "Select All";
});

selectAllBtn.addEventListener("click", () => {
  const checkboxes = document.querySelectorAll(
    "#imageGrid input[type='checkbox']"
  );
  const containers = document.querySelectorAll("#imageGrid div");

  allSelected = !allSelected; // Toggle the state

  checkboxes.forEach((checkbox, i) => {
    checkbox.checked = allSelected;
    if (allSelected) {
      containers[i].classList.add("brightness-50");
    } else {
      containers[i].classList.remove("brightness-50");
    }
  });

  if (allSelected) {
    selectAllBtn.innerText = "Unselect All";
  } else {
    selectAllBtn.innerText = "Select All";
  }
  updateSelectedImageCount();
});

getImagesBtn.addEventListener("click", function () {
  hideElement(initialPage);
  showElement(secondPage, "flex");
});

imageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const selectedGroupId = parseInt(groupSelect.value, 10);
  const attributeTypeValue = document.getElementById("attributeType").value;
  const attributeValueText = document
    .getElementById("attributeValue")
    .value.trim();

  if (!selectedGroupId || !attributeTypeValue || !attributeValueText) {
    showNotification("All fields must be filled out correctly.");
    return;
  }

  hideElement(secondPage);
  showElement(previewPage, "flex");

  const selectorMap = {
    class: (value) => `img.${value}`,
    id: (value) => `img#${value}`,
    data: (value) => `img[data-${value}]`,
    src: (value) => `img[src*='${value}']`,
  };

  let selectorFunction = selectorMap[attributeTypeValue];
  if (selectorFunction) {
    let selector = selectorFunction(attributeValueText);
    console.log(`Fetching images with selector: ${selector}`);
    try {
      fetchImages(selector, selectedGroupId, displayImages);
    } catch (error) {
      console.error(
        "No matching selector function found for:",
        attributeTypeValue
      );
      return;
    }
  }

  imageGrid.innerHTML = "";
  noContentDiv.textContent = "";
});

downloadBtn.addEventListener("click", async () => {
  const checkboxes = document.querySelectorAll(
    "#imageGrid input[type='checkbox']"
  );
  const selectedImages = [...checkboxes]
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.parentElement.querySelector("img").src);

  // Validation for at least one image selection
  if (selectedImages.length === 0) {
    showNotification("Please select at least one image to download.");
    return;
  }

  // Start the zipping process if there are selected images
  if (selectedImages.length > 0) {
    const zip = new JSZip();

    // Fetch each image and add to ZIP
    try {
      await Promise.all(
        selectedImages.map(async (imgUrl) => {
          try {
            const response = await fetch(imgUrl);
            const blob = await response.blob();
            const urlObj = new URL(imgUrl);
            const filename = urlObj.pathname.split("/").pop();
            console.log("Adding to ZIP:", filename);
            zip.file(filename, blob, { binary: true });
          } catch (e) {
            console.error("Failed to fetch", imgUrl, e.message);
          }
        })
      );

      const content = await zip.generateAsync({ type: "blob" });
      hideElement(previewPage);
      hideElement(loadingMessage);

      const url = URL.createObjectURL(content);

      showElement(downloadStatus, "flex");
      showElement(downloadReadyMessage);
      downloadZIPBtn.addEventListener(
        "click",
        function () {
          chrome.downloads.download({ url: url, filename: "images.zip" });
        },
        { once: true }
      ); // The listener will be invoked only once
    } catch (error) {
      console.error("Error while processing images:", error);
      showNotification("Couldn't process images!");
    }
  }
});

startOver.addEventListener("click", function () {
  // Hide all other pages/divs
  hideElement(secondPage);
  hideElement(previewPage);
  hideElement(loadingMessage);
  hideElement(downloadStatus);
  // Clear any previous data if needed
  imageGrid.innerHTML = "";
  imageForm.reset();

  // Show the initial page
  showElement(initialPage);
  selectAllBtn.textContent = "Select All";
});

function populateTabGroups() {
  chrome.tabGroups.query({}, (groups) => {
    groups.forEach((group) => {
      const option = document.createElement("option");
      option.value = group.id;
      option.textContent = group.title || `Group ${group.id}`;
      groupSelect.appendChild(option);
    });
  });
}

populateTabGroups();
