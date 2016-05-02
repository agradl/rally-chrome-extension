(function(){
  var highlighted = false,
    idRegex = new RegExp("((DE|S)\\d{1,20})"),
    handlers = {},
    nodes,
    index = -1;

  $(function(){
    $(document).keypress(handleKey);
  });

  chrome.runtime.onMessage.addListener(function(message){
    if (!highlighted){
      nodes = getNodes();
    }

    if (nodes.length == 0){
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
      if (i >= nodes.length){
        i = 0;
      } else {
        var obj = nodes[i];
        if (isScrolledIntoView(obj.parent)){
          index >= 0 && unhighlight(nodes[index]);
          highlight(obj);
          index = i;
          return;
        }
        i++;
      }
    }
  }

  function currentNode(){
    return nodes[index];
  }

  function getNodes(){
    var ids = [];
    $('body').nestedEach(idRegex, function(id, node, parent){
      ids.push({id:id,node:node,parent:parent});
    });
    return ids;
  }

  $.fn.nestedEach = function(pattern, action) {
      this.each(function() {
        var parent = $(this);
        parent.contents().each(function() {
            if(this.nodeType === 3 && $(parent).is(":visible") && pattern.test(this.nodeValue)) {
                action && action(pattern.exec(this.nodeValue)[0], this, parent);
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
    var key = "" + event.keyCode + "+" + (event.shiftKey ? "SHIFT" : "");
    if (handlers[key]){
      handlers[key]()
      reset();
    }
  }

  function getArtifact(formattedID, callback){
    var url;
    if (formattedID.indexOf('DE') > -1){
      url = 'https://rally1.rallydev.com/slm/webservice/v2.0/defect?query=(FormattedID = "' + formattedID + '")&fetch=ObjectID'
    } else {
      url = 'https://rally1.rallydev.com/slm/webservice/v2.0/hierarchicalrequirement?query=(FormattedID = "' + formattedID + '")&fetch=ObjectID'
    }
    $.getJSON(url, function(data){
      callback(data.QueryResult.Results[0]);
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

  function reset(){
    var node = currentNode();
    node && unhighlight(node);
    highlighted = false;
    index = -1;
  }

  function getType(type){
    return type === 'HierarchicalRequirement' ? 'userstory' : type.toLowerCase();
  }

  function getDetailUril(data){
    return "[" + data._refObjectName.replace(/\[/g,'\\[').replace(/\]/g, '\\]') + "]" + "(https://rally1.rallydev.com/#/detail/" + getType(data._type) + "/" + data.ObjectID + ")";
  }

  handlers["79+SHIFT"] = function(){ //O+SHIFT - copy "FormattedID: Name - detailUrl" to clipboard
    var node = currentNode();
    getArtifact(node.id, function(data){
      copy(node.id + ': ' + getDetailUril(data));
    });
  };

  handlers["80+SHIFT"] = function(){ //P+SHIFT - copy "FormattedID: Name" to clipboard
    var node = currentNode();
    getArtifact(node.id, function(data){
      copy(node.id + ': ' + data._refObjectName);
    });
  };

  handlers["68+SHIFT"] = function(){ //D+SHIFT - open the detail page for the selected formattedID
    var node = currentNode();
    getArtifact(node.id, function(data){
      window.open(getDetailUril(data), "_blank");
    });
  };

})();
