MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

let link = "http://c738-34-69-139-175.ngrok.io/query";
let observer = new MutationObserver(retrieveComments);

let comments_predictions = {};
const config = { subtree: true, childList: true };
function waitForElement(selector) {
	return new Promise((resolve) => {
		if (document.querySelector(selector)) {
			return resolve(document.querySelector(selector));
		}
		const observer = new MutationObserver((mutations) => {
			if (document.querySelector(selector)) {
				resolve(document.querySelector(selector));
				observer.disconnect();
			}
		});
		observer.observe(document.body, config);
	});
}

async function addObserverOnTarget() {
	const target = await waitForElement('[aria-label="Timeline: Conversation"');
	observer.observe(target, config);
}

function togglePopup(id_tweet) {
	const pop = document.getElementById("popup" + id_tweet);
	pop.classList.toggle("show");
}

function createPopup(id_tweet, prediction) {
	const createDivStats = document.createElement("div");
	createDivStats.className = "popup";
	createDivStats.id = "popup" + id_tweet;

	const divCloseButton = document.createElement("div");
	divCloseButton.className = "close-btn";
	divCloseButton.id = "1-" + id_tweet;
	createDivStats.appendChild(divCloseButton);

	createDivStats.appendChild(prediction);

	const createButton = createButtonHide(id_tweet + "btn", "149px", "50px", "right", "Stats", "absolute", "right");
	createButton.onclick = function (event) {
		togglePopup(id_tweet);
	};
	return [createDivStats, createButton];
}
function createButtonHide(id_button, top, right, float, innerText, position, justifyContent) {
	const createButton = document.createElement("button");
	createButton.id = id_button;
	createButton.innerText = innerText;
	createButton.style.position = position;
	createButton.style.justifyContent = justifyContent;
	createButton.style.top = top;
	createButton.style.right = right;
	createButton.style.float = float;
	createButton.style.textAlign = "center";
	createButton.style.borderBottomLeftRadius = "9999px";
	createButton.style.borderBottomRightRadius = "9999px";
	createButton.style.borderTopLeftRadius = "9999px";
	createButton.style.borderTopRightRadius = "9999px";
	createButton.style.fontWeight = "bolder";
	createButton.style.backgroundColor = "rgb(239, 243, 244)";
	createButton.style.fontSize = "9px";
	createButton.style.height = "20px";
	createButton.style.width = "60px";
	return createButton;
}

function hide_comment(nodeTweet, tweetTextElement, bool, id_comment, prediction) {
	const createButtonStat = createButtonHide(id_comment, "33px", "45px", "right", "Statistics", "fixed", "right");
	const createButtonUnhide = createButtonHide(id_comment, "33px", "120px", "right", "Show", "fixed", "right");

	const statisticsDiv = document.createElement("div");

	for (const [key, value] of Object.entries(prediction)) {
		const modelName = document.createElement("p");
		modelName.textContent = key;
		const progressParent = document.createElement("div");
		progressParent.classList.add("progress");

		const progressValue = document.createElement("div");
		progressValue.textContent = (value * 100).toFixed(2) + "%";
		progressValue.classList.add("progress-value");
		progressValue.style.width = 0;
		progressValue.setAttribute("data-value", value * 100);
		progressParent.appendChild(progressValue);

		statisticsDiv.appendChild(modelName);
		statisticsDiv.appendChild(progressParent);
		//createSpan.innerText = "\n\n" + key + ": " + value;
	}

	statisticsDiv.style.display = "none";

	createButtonStat.onclick = function (event) {
		const x = statisticsDiv;
		if (x.style.display == "none") {
			x.style.display = "inline";
			for (let progrValue of statisticsDiv.querySelectorAll(".progress-value")) {
				setTimeout(() => (progrValue.style.width = progrValue.getAttribute("data-value") + "%"), 1);
			}
		} else {
			x.style.display = "none";
			for (let progrValue of statisticsDiv.querySelectorAll(".progress-value")) {
				progrValue.style.width = 0;
			}
		}
	};
	nodeTweet.appendChild(createButtonStat);
	nodeTweet.appendChild(createButtonUnhide);
	tweetTextElement.appendChild(statisticsDiv);

	var esp = document.createElement("span");
	esp.id = id_comment + "pred";
	esp.innerHTML = prediction;

	createButtonUnhide.onclick = function (event) {
		let mod = document.querySelector("[data-tweet-id='" + id_comment + "']");
		// const pred = document.getElementById(event.target.id + "pred");
		// const v = document.getElementById(event.target.id);
		
		mod.querySelectorAll("span").forEach((el) => {
			if (el.style.filter == "blur(0px)")
				el.style.filter = "blur(5px)";
			else
				el.style.filter = "blur(0px)";				
		});	
	};
}

function get_prediction(id_comment, text_comment, callback) {
	if (!(id_comment in comments_predictions)) {
		const startTime = Date.now();
		comments_predictions[id_comment] = [];
		chrome.runtime.sendMessage(
			{
				contentScriptQuery: "check_hatespeech",
				data: text_comment,
				url: link,
			},
			function (response) {
				//console.log(JSON.stringify(response));
				comments_predictions[id_comment] = response;
				const responseTime = Date.now();
				callback(response, true);
			}
		);
	} else {
		if (comments_predictions[id_comment] != []) {
			callback(comments_predictions[id_comment], false);
		}
	}
}

function process_comment(element_comment, id_comment, text_comment, tweetTextElement) {
	get_prediction(id_comment, text_comment, (prediction, bool) => {
		const hide = prediction["Logistic Regression Roberta"][0] + prediction["MLP Roberta"][0] + prediction["Logistic Regression Bert"][0]; // fai cose per capire se nasconderlo
		if (hide > 1.8) {
			hide_comment(element_comment, tweetTextElement, bool, id_comment, prediction);
		} else {
			let mod = document.querySelector("[data-tweet-id='" + id_comment + "']");
			mod.querySelectorAll("span").forEach((el) => {
				el.style.filter = "blur(0px)";				
		});	
			//tweetTextElement.style.filter = "blur(0px)";
			document.getElementById(id_comment).style.filter = "blur(0px)";
		}
	});
}

function retrieveComments(mutations, observer) {
	for (let mutation of mutations) {
		for (let node of mutation.addedNodes) {
			if (node.querySelector) {
				const tweetTextElement = node.querySelector('[data-testid="tweetText"]');
				if (node.getAttribute("data-testid") === "cellInnerDiv" && tweetTextElement) {
					//console.log(tweetTextElement.getElementsByTagName("span"));
					tweetTextElement.querySelectorAll("span").forEach((el) => {
						el.style.filter = "blur(5px)";						
					});
					const tweetLink = node.querySelector("a:has(time)").href;
					const tweetID = tweetLink.split("/").slice(-1)[0];
					tweetTextElement.setAttribute("data-tweet-id", tweetID);
					const tweetText = tweetTextElement.textContent;
					//console.log("Trovato tweet", tweetID, tweetText);

					process_comment(node, tweetID, tweetText, tweetTextElement, true);
				}
			}
		}
	}
}

window.onload = addObserverOnTarget;
