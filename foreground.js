(function(){
  var highlighted = false,
    idRegex = /^((DE|S)\d{1,20})$/g,
    formattedIDs,
    index = -1;

  $(function(){
    $(document).keypress(handleKey);
  });

  chrome.runtime.onMessage.addListener(function(message){
    var title = document.title.replace(' | Rally','');
    if (idRegex.test(title)){
      copy(title);
      return;
    }
    if (!highlighted){
      formattedIDs = getFormattedIDs();
    }

    if (formattedIDs.length == 0){
      alert('no formatted IDs found on the page');
      return;
    }

    highlighted = true;

    selectNextId();

  });

  function selectNextId(){
    var i = index;
    i++;
    while (index !== i){
      if (i >= formattedIDs.length){
        i = 0;
      } else {
        var obj = formattedIDs[i];
        if (isScrolledIntoView(obj.parent)){
          index >= 0 && unhighlight(formattedIDs[index]);
          highlight(obj);
          index = i;
          return;
        }
        i++;
      }
    }
  }

  function getFormattedIDs(){
    var ids = [];
    $('body').nestedEach(idRegex, function(node, parent){
      ids.push({id:node.nodeValue,node:node,parent:parent});
    });
    return ids;
  }

  $.fn.nestedEach = function(pattern, action) {
      this.each(function() {
        var parent = $(this);
        parent.contents().each(function() {
            if(this.nodeType === 3 && pattern.test(this.nodeValue)) {
                action && action(this, parent);
            }
            else if(!$(this).hasClass('high')) {
                $(this).nestedEach(pattern, action);
            }
        });
      });
      return this;
  };

  function unhighlight(obj){
    $(obj.parent)
      .html(obj.oldHtml)
      .nestedEach(idRegex, function(node){
        obj.node = node
      });
  }

  function highlight(obj){
    var newNode = $('<span>')
      .css('background-color', 'red')
      .css('color', 'black')
      .css('font-weight', 'bolder')
      .text(obj.node.nodeValue.replace(idRegex, '$1'));
    obj.oldHtml = $(obj.parent).html();
    $(obj.node).replaceWith(newNode);
    obj.node = newNode;
  }

  function copy(text){
    chrome.runtime.sendMessage({key:'copyIt',text:text});
    alert('copied ' + text + ' to clipboard');
  }

  function handleKey(event){
    if (event.keyCode == 13 && index > -1){
      getArtifact(formattedIDs[index].id, function(message){
        copy(message);
        unhighlight(formattedIDs[index]);
        highlighted = false;
        index = -1;
      });
    }
  }

  function getArtifact(formattedID, callback){
    var url;
    if (formattedID.indexOf('DE') > -1){
      url = 'https://rally1.rallydev.com/slm/webservice/v2.0/defect?query=(FormattedID = "' + formattedID + '")'
    } else {
      url = 'https://rally1.rallydev.com/slm/webservice/v2.0/hierarchicalrequirement?query=(FormattedID = "' + formattedID + '")'
    }
    $.getJSON(url, function(data){
      callback(formattedID + ': ' + data.QueryResult.Results[0]._refObjectName);
    });
  }

  function isScrolledIntoView(elem){
      var $elem = $(elem);
      var $window = $(window);

      var docViewTop = $window.scrollTop();
      var docViewBottom = docViewTop + $window.height();

      var elemTop = $elem.offset().top;
      var elemBottom = elemTop + $elem.height();

      return ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));
  }
})();
