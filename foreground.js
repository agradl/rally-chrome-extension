(function(){
  var highlighted = false,
    idRegex = new RegExp("((DE|S|MI)\\d{1,20})"),
    handlers = {},
    nodes = null,
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

  function action(action, payload){
    chrome.runtime.sendMessage({action: action, payload:payload});
  }

  function handleKey(event){
    var key = "" + event.key.toLowerCase() + "+" + ((event.shiftKey || event.ctrlKey || event.ctrlKey) ? "MOD" : "");
    var node = currentNode();
    if (handlers[key] && node){
      handlers[key](node);
      reset();
    }
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

  function registerHandler(keys, actionName, info){
    console.info("Rally chrome extension: registering action " + actionName + ". To execute, press " + keys + " after highlighting an id.", info);  
    handlers[keys] = function(node){ 
      console.info("Rally chrome extension: invoking action", actionName);
      action(actionName, node.id);
    };
  }

  registerHandler('o+MOD', 'copyMarkdown', 'Puts markdown on clipboard [FormattedID - Name](detail link)');
  registerHandler('p+MOD', 'copySimple', 'Puts formatted id and name on clipboard FormattedID - Name')
  registerHandler('d+MOD', 'navDetail', 'Opens a new tab to the detail page of the item')

  // handlers["c+MOD"] = function(node){ //C+MOD - open the detail page for the selected formattedID
  //   if (!inAgileCentral){
  //     return console.log('Rally-Chrome-Extension: You can only make changes when inside agile central');
  //   }
  //   getArtifact(node.id, function(data){
  //     var key = find([].slice.call(document.getElementsByTagName('meta')), 'name', 'SecurityToken').content;
  //     var i = 20;

  //     var createCopy = function() {
  //       var body = {artifact:{}};
  //       body.artifact[data._type] = {};
  //       body.artifact.Name = data.Name + " [Copy " + i + "]";
  //       var key = find([].slice.call(document.getElementsByTagName('meta')), 'name', 'SecurityToken').content;
  //       $.ajax({
  //         url: data._ref + "/copy?key=" + key,
  //         type:'PUT',
  //         dataType: 'json',
  //         contentType: "application/json; charset=utf-8",
  //         data: JSON.stringify(body),
  //         success: function(result){
  //           i--;
  //           if (i > 0){
  //             createCopy();
  //           } else {
  //             alert('done copying');
  //           }
  //         }
  //       });
  //     };
  //     createCopy();
  //   });
  // };

})();
