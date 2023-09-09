let allSelected = false; // To keep track if all are currently selected or not

const notificationPopup = document.getElementById("notificationPopup");
const notificationMessage = document.getElementById("notificationMessage");

// buttons
const selectAllBtn = document.getElementById("selectAllBtn");
const getImagesBtn = document.getElementById("getImagesBtn");
const downloadBtn = document.getElementById("downloadBtn");
const startOver = document.getElementById("startOver");
const goBackBtn = document.getElementById("goBack");

// form inputs
const groupSelect = document.getElementById("groupSelect");

// pages
const initialPage = document.getElementById("initialPage");
const secondPage = document.getElementById("secondPage");
const imageForm = document.getElementById("imageForm");
const previewPage = document.getElementById("previewPage");

function showNotification(message) {
  notificationMessage.textContent = message;
  notificationPopup.style.transform = "scale(1)"; // Show the notification

  // Hide the notification after 3 seconds
  setTimeout(() => {
    notificationPopup.style.transform = "scale(0)";
  }, 1500);
}

goBackBtn.addEventListener("click", () => {
  secondPage.style.display = "flex";
  previewPage.style.display = "none";

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
});

getImagesBtn.addEventListener("click", function () {
  // Hide initial page
  initialPage.style.display = "none";

  // Show selection page
  secondPage.style.display = "flex";
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

  secondPage.style.display = "none";
  previewPage.style.display = "flex";

  let selector;
  switch (attributeTypeValue) {
    case "class":
      selector = `img.${attributeValueText}`;
      break;
    case "id":
      selector = `img#${attributeValueText}`;
      break;
    case "data":
      selector = `img[data-${attributeValueText}]`;
      break;
    case "src":
      selector = `img[src*='${attributeValueText}']`; // Using * to check if the src contains the given value
      break;
  }

  const imageGrid = document.getElementById("imageGrid");
  imageGrid.innerHTML = "";
  document.getElementById("noContent").textContent = "";

  console.log(`Fetching images with selector: ${selector}`);

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
                  if (allImages.length === 0) {
                    document.getElementById("noContent").textContent =
                      "No images found with the selected attribute.";
                    return;
                  } else {
                    allImages.forEach((imgUrl) => {
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

                      imgElem.addEventListener("click", function () {
                        checkbox.checked = !checkbox.checked;
                        if (checkbox.checked) {
                          container.classList.add("brightness-50");
                        } else {
                          container.classList.remove("brightness-50");
                        }
                      });

                      document
                        .getElementById("imageGrid")
                        .appendChild(container);
                    });
                  }
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
});

downloadBtn.addEventListener("click", () => {
  const checkboxes = document.querySelectorAll(
    "#imageGrid input[type='checkbox']"
  );
  const selectedImages = [];

  checkboxes.forEach((checkbox) => {
    const container = checkbox.parentElement;
    const imgElem = container.querySelector("img");
    if (checkbox.checked && imgElem) {
      selectedImages.push(imgElem.src);
    }
  });

  // Validation for at least one image selection
  if (selectedImages.length === 0) {
    showNotification("Please select at least one image to download.");
    return;
  }

  // Start the zipping process if there are selected images
  if (selectedImages.length > 0) {
    const zip = new JSZip();

    // Fetch each image and add to ZIP
    const promises = selectedImages.map((imgUrl) => {
      return fetch(imgUrl)
        .then((response) => {
          if (!response.ok) {
            console.error("Failed to fetch", imgUrl, response.statusText);
            throw new Error("Network response was not ok");
          }
          return response.blob();
        })
        .then((blob) => {
          const urlObj = new URL(imgUrl);
          const filename = urlObj.pathname.split("/").pop();
          console.log("Adding to ZIP:", filename);
          zip.file(filename, blob, { binary: true });
        });
    });
    // Hide the preview page
    previewPage.style.display = "none";
    downloadStatus.style.display = "flex";

    // Show the loading/progress div
    document.getElementById("downloadReadyMessage").style.display = "none";
    document.getElementById("loadingMessage").style.display = "block";

    // Once all images are added to ZIP
    Promise.all(promises).then(() => {
      zip.generateAsync({ type: "blob" }).then((content) => {
        // Hide the loading message
        document.getElementById("loadingMessage").style.display = "none";

        // Store the blob content for download
        const url = URL.createObjectURL(content);

        // Show the download ready message
        document.getElementById("downloadReadyMessage").style.display = "flex";

        // Add event listener for the download button
        document.getElementById("downloadZIPBtn").addEventListener(
          "click",
          function () {
            chrome.downloads.download({ url: url, filename: "images.zip" });
          },
          { once: true }
        ); // The listener will be invoked only once
      });
    });
  }
});

startOver.addEventListener("click", function () {
  // Hide all other pages/divs
  document.getElementById("secondPage").style.display = "none";
  document.getElementById("previewPage").style.display = "none";
  document.getElementById("loadingMessage").style.display = "none";
  document.getElementById("downloadStatus").style.display = "none";
  // Clear any previous data if needed
  document.getElementById("imageGrid").innerHTML = "";
  document.getElementById("imageForm").reset();

  // Show the initial page
  document.getElementById("initialPage").style.display = "block";
  selectAllBtn.textContent = "Select All";
});

function populateTabGroups() {
  chrome.tabGroups.query({}, (groups) => {
    const groupSelect = document.getElementById("groupSelect");
    groups.forEach((group) => {
      const option = document.createElement("option");
      option.value = group.id;
      option.textContent = group.title || `Group ${group.id}`;
      groupSelect.appendChild(option);
    });
  });
}

populateTabGroups();
