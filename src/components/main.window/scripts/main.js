const electron = require("electron");
const { ipcRenderer } = electron;

require("@tensorflow/tfjs");
require("@tensorflow/tfjs-backend-cpu");

const cocoSSD = require("@tensorflow-models/coco-ssd");
const { input } = require("@tensorflow/tfjs");

let model;
let outputMedia, outputCanvas, videoStream, image;

const titleBarBtns = Array.from(document.getElementsByClassName("title-bar-btn"));
const mainContainer = document.getElementById("main-container");
const loader = document.getElementById("loader");
const choiceContainer = document.getElementById("input-choice-container");
const inputChoices = Array.from(document.getElementsByClassName("input-choice"));
const outputContainer = document.getElementById("output-container");
const output = document.getElementById("output");

window.onload = async () => {
    Particles.init({
        selector: '#particles-bg',
        color: "#CCCCCC",
        connectParticles: true,
        speed: 0.6,
        minDistance: 150
    });

    model = await cocoSSD.load('lite_mobilenet_v2');
    console.log("model loaded");

    loader.classList.add("hidden");
    choiceContainer.classList.remove("hidden");
    choiceContainer.classList.add("flex-container");
};

titleBarBtns.forEach((btn) => {
    btn.addEventListener("click", (event) => {
        ipcRenderer.send("action:main", btn.getAttribute("data-action"));
    });
});

inputChoices.forEach((inputChoice) => {
    inputChoice.addEventListener("click", (event) => {
        const inputChoiceID = inputChoice.getAttribute("id");
        inputChoiceID === "input-choice-w" ?  predictWebcam() : toggleInputModal(inputChoiceID);
    });
});

const toggleInputModal = (inputChoiceID) => {
    mainContainer.style.filter = "blur(5px)";
    ipcRenderer.send("render:modal", inputChoiceID);
};

const predictWebcam = () => {
    choiceContainer.style.display = "none";
    toggleVisibility(outputContainer);

    renderOutputMedia("video");

    webcamInit();

    outputMedia.onloadedmetadata = (event) => {
        renderOutputCanvas("video");

        detectFrame(outputMedia, "video", model);
    };
}

const predictFile = (fileData) => {
    console.log("you got here!")
    choiceContainer.style.display = "none";
    toggleVisibility(outputContainer);

    renderOutputMedia(fileData.mediaType);
    
    if(fileData.mediaType === "image") {
        outputMedia.onload = () => {
            renderOutputCanvas("image");
            detectFrame(outputMedia, "image", model);
        }
        outputMedia.src = fileData.filePath;
    } else {
        outputMedia.src = fileData.filePath;
        outputMedia.onloadeddata = (event) => {
            renderOutputCanvas("video");
            detectFrame(outputMedia, "video", model);
        };
    }
}

const renderOutputMedia = (mediaType) => {
    if(mediaType === "video") {
        outputMedia = document.createElement("video");
        outputMedia.classList.add("output-el");
        outputMedia.setAttribute("id", "output-video");
        outputMedia.autoplay = true;
    } else {
        outputMedia = document.createElement("img");
        outputMedia.classList.add("output-el");
        outputMedia.setAttribute("id", "output-video");
        outputMedia.draggable = false;
    }

    output.appendChild(outputMedia);
}

const renderOutputCanvas = (mediaType) => {
    outputCanvas = document.createElement("canvas");
    outputCanvas.classList.add("output-el");
    outputCanvas.setAttribute("id", "output-canvas");
    let mediaHeight = mediaType === "video" ? outputMedia.videoHeight : outputMedia.clientHeight;
    let disparity = mediaType === "video" ? 10 : 12;
    outputCanvas.style.top = `${((450 - mediaHeight)/2)+50+disparity}px`;

    outputCanvas.height = mediaHeight;
    outputCanvas.width = 600;

    output.appendChild(outputCanvas);
}

ipcRenderer.on("close:modal", (event) => {
    mainContainer.style.filter = "none";
});

ipcRenderer.on("upload:modal", (event, fileData) => {
    console.log(fileData);
    mainContainer.style.filter = "none";
    predictFile(fileData);
});

const toggleVisibility = (element) => {
    element.classList.contains("hidden") ? element.classList.remove("hidden") : element.classList.add("hidden");
};

const webcamInit = async () => {
    errorCallback = (e) => {
        console.log('Error', e);
    }

    navigator.getUserMedia({video: true, audio: false}, (localMediaStream) => {
        videoStream = localMediaStream;
        outputMedia.srcObject = videoStream;
    }, errorCallback);
}

const detectFrame = (media, mediaType, model) => {
    model.detect(media).then(predictions => {
        renderPredictions(predictions);
        if(mediaType === "video") {
            requestAnimationFrame(() => {
                detectFrame(media, mediaType, model);
            });
        }
    });
}


const renderPredictions = (predictions) => {
    const ctx = outputCanvas.getContext("2d");

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    // Font options.
    const font = "16px sans-serif";
    ctx.font = font;
    ctx.textBaseline = "top";
    // ctx.drawImage(outputMedia,0,0);

    predictions.forEach(prediction => {
        const x = prediction.bbox[0];
        const y = prediction.bbox[1];
        const width = prediction.bbox[2];
        const height = prediction.bbox[3];
        ctx.fillStyle = "#000000";
        ctx.globalAlpha = 0.4;
        ctx.fillRect(x, y, width, height);
        const textWidth = ctx.measureText(prediction.class).width;
        const textHeight = parseInt(font, 10); // base 10
        ctx.fillRect(x, y, textWidth + 4, textHeight + 4);
    });

    predictions.forEach(prediction => {
        const x = prediction.bbox[0];
        const y = prediction.bbox[1];
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(prediction.class, x, y);
    });
};




// const btns = Array.from(document.getElementsByClassName("input-btn"));
        // const sourceInputContainers = Array.from(document.getElementsByClassName("source-input-container"));
        // const submitBtns = Array.from(document.getElementsByClassName("input-submit-btn"));
        // const video = document.getElementById("input-rt-video");
        // let videoStream;

        // btns.forEach((btn) => {
        //     btn.addEventListener("click", (event) => {
        //         sourceInputContainers.forEach((container) => {
        //             console.log(container.getAttribute("data-btn"), btn.getAttribute("id"))
        //             container.getAttribute("data-btn") === btn.getAttribute("id") ? container.classList.remove("hidden") : container.classList.add("hidden");
        //         });
 
        //         if(btn.getAttribute("id") === "rt-btn") {
        //             webcamInit();
        //         } else {
        //             videoStream.getTracks().forEach(function(track) {
        //                 track.stop();
        //             });
        //         }
        //     });
        // });

        // submitBtns.forEach((submitBtn) => {
        //     submitBtn.addEventListener("click", (event) => {
        //         console.log(document.getElementById(submitBtn.getAttribute("data-input")).files[0].path);
        //     });
        // });
        

        // predictWithCocoModel = async () => {
        
        //     detectFrame(video, model);
        // }

        

        

        
        // webcamInit();