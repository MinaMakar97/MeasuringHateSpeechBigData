MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

let link = "http://bfba-34-69-195-3.ngrok.io/query";
let observer = new MutationObserver(retrieveComments);
let comments_predictions = {};

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

		observer.observe(document.body, {
			childList: true,
			subtree: true,
		});
	});
}

async function addObserverOnTarget() {
	// setTimeout(addObserverOnTarget, 1000);
	// let target = document.querySelector('[aria-label="Timeline: Conversation"]');
	// if (!target) {
	// 	//The node we need does not exist yet.
	// 	//Wait 500ms and try again
	// 	setTimeout(addObserverOnTarget, 50);
	// 	return;
	// }
	// define what trigger the function --> this is may be not okay
	const target = await waitForElement('[aria-label="Timeline: Conversation"');

	observer.observe(target, {
		subtree: true,
		childList: true,
	});
}

function hide_comment(comment_element) {
	comment_element.style.backgroundColor = "red";
}

function get_prediction(id_comment, text_comment, callback) {
	if (!(id_comment in comments_predictions)) {
		// list_comments.push(text_comment);
		// list_id.push(id_comment);
		// console.log(text_comment);
		const startTime = Date.now();
		console.log("Sending request for tweet", id_comment, text_comment);
		comments_predictions[id_comment] = [];
		chrome.runtime.sendMessage(
			{
				contentScriptQuery: "check_hatespeech",
				data: text_comment,
				url: link,
			},
			function (response) {
				console.log(JSON.stringify(response));
				comments_predictions[id_comment] = response;
				const responseTime = Date.now();
				console.log("Got response from server after:", responseTime - startTime);
				callback(response);
			}
		);
	} else {
		if (comments_predictions[id_comment] != []) {
			callback(comments_predictions[id_comment]);
		}
	}
}

function process_comment(element_comment, id_comment, text_comment, tweetTextElement) {
	get_prediction(id_comment, text_comment, (prediction) => {
		const hide = prediction["MLP_with_Roberta"][0] === 1.0; // fai cose per capire se nasconderlo
		if (hide) {
			hide_comment(element_comment);
		} else {
			tweetTextElement.style.filter = "blur(0px)";
		}
	});
}

function retrieveComments(mutations, observer) {
	for (let mutation of mutations) {
		// console.log("Found new mutation:", mutation);
		for (let node of mutation.addedNodes) {
			const tweetTextElement = node.querySelector('[data-testid="tweetText"]');
			if (node.getAttribute("data-testid") === "cellInnerDiv" && tweetTextElement) {
				tweetTextElement.style.filter = "blur(20px)";
				const tweetLink = node.querySelector("a:has(time)").href;
				const tweetID = tweetLink.split("/").slice(-1)[0];
				const tweetText = tweetTextElement.textContent;
				console.log("Trovato tweet", tweetID, tweetText);

				process_comment(node, tweetID, tweetText, tweetTextElement);
			}
			// if (node.getAttribute("data-testid") == "tweetText") {
			//   console.log("Trovato commento:", node);
			// }
		}
	}

	// var comments_retr = document.querySelectorAll('[data-testid="tweetText"]');
	// for (var i = 0; i < comments_retr.length; i++) {
	//   var comment = comments_retr[i];
	//   // add to list if there are new comments
	//   process_comment(comment);
	// }

	//console.log(comments_retr);
}

window.onload = addObserverOnTarget;
