(function(){
  var highlighted = false,
    idRegex = new RegExp("((DE|S)\\d{1,20})"),
    handlers = {},
    nodes,
    index = -1;

  $(function(){
    if (document.getElementsByName('SecurityToken').length){
      $(document).keypress(handleKey);
      setRegex();
    }
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
    var url = toUrl("/slm/webservice/v2.0/artifact?query=(FormattedID = " + formattedID + ")&fetch=ObjectID,FormattedID,Name");

    $.getJSON(url, function(data){
      var item = find(data.QueryResult.Results, 'FormattedID', formattedID);
      if (item){
        callback(item);
      } else {
        alert('could not find an artifact with formatted id ' + formattedID);
      }
      
    });
  }

  function setRegex(){
    var url = toUrl('/slm/webservice/v2.x/typedefinition?query=(((ElementName = Defect) OR (ElementName = HierarchicalRequirement)) OR (ElementName = Task))&fetch=IDPrefix');
    $.getJSON(url, function(data){
      var defect = find(data.QueryResult.Results, '_refObjectName', 'Defect');
      var task = find(data.QueryResult.Results, '_refObjectName', 'Task');
      var userStory = find(data.QueryResult.Results, '_refObjectName', 'Hierarchical Requirement');
      idRegex = new RegExp("((" + defect.IDPrefix + "|" + userStory.IDPrefix + "|" + task.IDPrefix + ")\\d{1,20})");
    });
  }

  function find(arr, attributeName, value){
    return arr.find(function(el){
      return el[attributeName] == value;
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
    return "[" + data._refObjectName.replace(/\[/g,'\\[').replace(/\]/g, '\\]') + "]" + "(" + toUrl("/#/detail/" + getType(data._type) + "/" + data.ObjectID) + ")";
  }

  function toUrl(path){
    return this.document.URL.split('/')[0] + "//" + this.document.URL.split('/')[2] + path
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

  handlers["67+SHIFT"] = function(){ //C+SHIFT - open the detail page for the selected formattedID
    var node = currentNode();
    getArtifact(node.id, function(data){
      var key = find([].slice.call(document.getElementsByTagName('meta')), 'name', 'SecurityToken').content;
      var i = 20;
      
      var createCopy = function() {
        var body = {artifact:{}};
        body.artifact[data._type] = {};
        body.artifact.Name = data.Name + " [Copy " + i + "]";
        var key = find([].slice.call(document.getElementsByTagName('meta')), 'name', 'SecurityToken').content;
        $.ajax({
          url: data._ref + "/copy?key=" + key,
          type:'PUT',
          dataType: 'json',
          contentType: "application/json; charset=utf-8",
          data: JSON.stringify(body),
          success: function(result){
            i--;
            if (i > 0){
              createCopy();
            }
          }
        });
      };
      createCopy();
    });
  };

})();
