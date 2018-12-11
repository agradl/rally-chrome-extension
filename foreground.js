(function(){
  var highlighted = false,
    idRegex = new RegExp("((DE|S|MI)\\d{1,20})"),
    idToType = {
      'MI': 'milestone'
    }
    regexFetched = false,
    inAgileCentral = false,
    handlers = {},
    nodes = null,
    index = -1;

  $(function(){
    if (document.getElementsByName('SecurityToken').length){
      inAgileCentral = true;
      setTimeout(setRegex, 1000);
    }
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
    return nodes && nodes[index];
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
        if (this.tagName === 'IFRAME'){
          return;
        }
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
      .css('padding', '3px')
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
    var key = "" + event.key.toLowerCase() + "+" + ((event.shiftKey || event.ctrlKey || event.ctrlKey) ? "MOD" : "");
    var node = currentNode();
    if (handlers[key] && node){
      handlers[key](node);
      reset();
    }
  }

  function getArtifact(formattedID, callback){
    var idPrefix = idRegex.exec(formattedID)[2] || 'US';
    var typePath = idToType[idPrefix] || 'artifact';
    var url = toUrl("/slm/webservice/v2.0/" + typePath + "?query=(FormattedID = " + formattedID + ")&fetch=ObjectID,FormattedID,Name");

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
    if (chrome.storage && chrome.storage.sync.get('regex') || regexFetched){
      idRegex = new RegExp(chrome.storage.sync.get('regex'));
      return;
    }
    regexFetched = true;
    var url = toUrl('/slm/webservice/v2.x/typedefinition?query=((((ElementName = Defect) OR (ElementName = HierarchicalRequirement)) OR (ElementName = Task)) OR (ElementName = Milestone))&fetch=IDPrefix');
    $.getJSON(url, function(data){
      var defect = find(data.QueryResult.Results, '_refObjectName', 'Defect');
      var task = find(data.QueryResult.Results, '_refObjectName', 'Task');
      var userStory = find(data.QueryResult.Results, '_refObjectName', 'Hierarchical Requirement');
      var milestone = find(data.QueryResult.Results, '_refObjectName', 'Milestone');
      idToType = { [milestone.IDPrefix]: 'milestone' };
      var regexString = "((" + defect.IDPrefix + "|" + userStory.IDPrefix + "|" + task.IDPrefix + "|" + milestone.IDPrefix + ")\\d{1,20})";
      idRegex = new RegExp(regexString);
      chrome.storage.sync.set('regex', regexString)
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
    return getHost() + path
  }

  function getHost(){
      if (inAgileCentral){
        return this.document.URL.split('/')[0] + "//" + this.document.URL.split('/')[2];
      }
      return 'https://rally1.rallydev.com';
  }

  handlers["o+MOD"] = function(node){ //O+MOD - copy "FormattedID: Name - detailUrl" to clipboard
    getArtifact(node.id, function(data){
      copy(node.id + ': ' + getDetailUril(data));
    });
  };

  handlers["p+MOD"] = function(node){ //P+MOD - copy "FormattedID: Name" to clipboard
    getArtifact(node.id, function(data){
      copy(node.id + ': ' + data._refObjectName);
    });
  };

  handlers["d+MOD"] = function(node){ //D+MOD - open the detail page for the selected formattedID
    getArtifact(node.id, function(data){
      window.open(getDetailUril(data), "_blank");
    });
  };

  handlers["c+MOD"] = function(node){ //C+MOD - open the detail page for the selected formattedID
    if (!inAgileCentral){
      return console.log('Rally-Chrome-Extension: You can only make changes when inside agile central');
    }
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
            } else {
              alert('done copying');
            }
          }
        });
      };
      createCopy();
    });
  };

})();
