var jenkinsUrls = []
var statusByUrl = {};
chrome.storage.local.get(['jenkinsUrls'], function(result){
  try {
    jenkinsUrls = result.jenkinsUrls ? JSON.parse(result.jenkinsUrls) : [];
  } catch (e){
    jenkinsUrls = [];
  }
  refresh();
});;

setInterval(refresh, 5000);

function refresh(){
  jenkinsUrls.forEach(function(url){
    getStatus(url);
  });
}

function save(){
  chrome.storage.local.set({'jenkinsUrls': JSON.stringify(jenkinsUrls) });
  jenkinsUrls.forEach(function(url){
    getStatus(url);
  });
}

function getStatus(url){
  fetch(url)
    .then(function(response) {
      return response.json();
    })
    .then(function(json){
      var allSuccessful = isBuildPassing(json.lastCompletedBuild);
      statusByUrl[url] = allSuccessful ? 'green' : 'red';
      render();
    })
    .catch(function(err){statusByUrl[url] = 'error'});
}

function isBuildPassing(build){
  if (build.result && build.result !== 'SUCCESS'){
    return false;
  }
  if (build.subBuilds){
    for(var i = 0; i < build.subBuilds.length;i++){
      if (!isBuildPassing(build.subBuilds[i])){
        return false;
      }
    }
  }
  return true;
}

function render(){
  $('#urls').empty();
  var failures = [];
  jenkinsUrls.forEach(function(url){
    var label = url.replace(/http[s]{0,1}:\/\//,'').split('/')[0];
    var status = statusByUrl[url] || 'no status'
    var href = url.substring(0, url.lastIndexOf('/api'))
    if (status !== 'green'){
      failures.push(url);
    }
    $('#urls').append(
      $('<li>').addClass('url').addClass(status).append(
        $('<a>')
          .attr('href', href)
          .attr('target', '_blank')
          .text(label)));
  });
  if (failures.length > 0){
    var characters = failures.map(function(url) {return url.replace(/http[s]{0,1}:\/\//,'').split('/')[0][0]}).join('').toUpperCase();
    chrome.browserAction.setBadgeText({text: characters});
    chrome.browserAction.setBadgeBackgroundColor({color: 'red'});
  } else {
    chrome.browserAction.setBadgeText({text: ''});
    chrome.browserAction.setBadgeBackgroundColor({color: 'green'});
  }
}
render();

$('#addButton').on('click', function(){
  var val = $('#url').val();
  jenkinsUrls.push(val);
  save();
  render();
  $('#url').val('');
})

$('#clearButton').on('click', function(){
  jenkinsUrls = [];
  save();
  render();
})