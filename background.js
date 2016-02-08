

chrome.commands.onCommand.addListener(function(command) {
    sendMessage('copy');
});

function sendMessage(message){
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      console.log('send message');
      chrome.tabs.sendMessage(tabs[0].id, message);
    });
}

function copy(text){
  var input = document.createElement('input');
      input.style.position = 'fixed';
      input.style.opacity = 0;
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('Copy');
      document.body.removeChild(input);
}



chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
  copy(request.text);
});