var idRegex = new RegExp("((DE|S|MI)\\d{1,20})");
var idToType = {
  'MI': 'milestone'
};
var handlers = {
  copyMarkdown: withArtifact(function(item, id){
    copy(getMarkdownLink(item));
  }),
  copySimple: withArtifact(function(item, id){
    copy(id + ' - ' + item._refObjectName);
  }),
  navDetail: withArtifact(function(item){
    window.open(toUrl("/#/detail/" + getType(item._type) + "/" + item.ObjectID), "_blank");
  })
};

chrome.commands.onCommand.addListener(function(command) {
    sendMessage({action:'copy'});
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
      sendMessage({action:'alert', text:'copied "' + text + '" to clipboard'});
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
  var action = request.action;
  var payload = request.payload;
  handlers[action](payload);
});

function withArtifact(callback){
  return function(payload){
    return getArtifact(payload, callback);
  }
}

function getArtifact(formattedID, callback){
  var idPrefix = idRegex.exec(formattedID)[2] || 'US';
  var typePath = idToType[idPrefix] || 'artifact';
  var url = toUrl("/slm/webservice/v2.0/" + typePath + "?query=(FormattedID = " + formattedID + ")&fetch=ObjectID,FormattedID,Name");

  $.getJSON(url, function(data){
    var item = find(data.QueryResult.Results, 'FormattedID', formattedID);
    if (item){
      callback(item, formattedID);
    } else {
      alert('could not find an artifact with formatted id ' + formattedID);
    }

  });
}

function find(arr, attributeName, value){
  return arr.find(function(el){
    return el[attributeName] == value;
  });
}

function getType(type){
  return type === 'HierarchicalRequirement' ? 'userstory' : type.toLowerCase();
}

function getMarkdownLink(data){
  return "[" + data.FormattedID + ' - ' + data._refObjectName.replace(/\[/g,'\\[').replace(/\]/g, '\\]') + "]" + "(" + toUrl("/#/detail/" + getType(data._type) + "/" + data.ObjectID) + ")";
}

function toUrl(path){
  return getHost() + path
}

function getHost(){
    return 'https://rally1.rallydev.com';
}