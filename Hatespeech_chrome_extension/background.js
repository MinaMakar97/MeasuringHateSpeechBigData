chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {    
  if (request.contentScriptQuery == "check_hatespeech") {
    fetch(request.url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ "messages": [request.data] })
    })
      .then(response => response.json())
      .then(response => sendResponse(response))
      .catch(error => console.log('Error:', error));
    return true;
  }
});


// .then(response => console.log(JSON.stringify(response)))