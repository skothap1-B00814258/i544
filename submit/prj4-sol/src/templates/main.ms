<!-- -- mode: html; -- -->
<!DOCTYPE html>
<html>
  <head>
    <title>CS 444/544 Spreadsheet Updata</title>
    <link rel="stylesheet" href="/style.css" type="text/css"/>
  </head>
  <body>
    <h1>CS 444/544 Spreadsheet Update for {{spname}}</h1>
    <p><a id="ss-open" href="/">Open other spreadsheet</a></p>
    <table class="ss">
         {{#headings}}
    <th>{{.}}</th>{{/headings}}
    {{#dataSet}}
     <tr>
       {{#.}}
       <td>{{.}}</td>
       {{/.}}
     </tr>
    {{/dataSet}}
         </table>
    <p class="error"></p>
    <form action="/ss/{{spname}}" method="POST">
      <label for="ssAct">Action</label>
      <span>
	<fieldset>
          <div>
	    <input name="ssAct" type="radio" 
		   id="actClear" value="clear" {{clear}}>
	    <label for="actClear">Clear Spreadsheet</label>
          </div>
          <div>
            <input name="ssAct" type="radio"  
		   id="actDelete" value="deleteCell" {{deleteCell}}>
	    <label for="act">Delete Cell</label>
          </div>
          <div>
	    <input name="ssAct" type="radio"  
		   id="actUpdate" value="updateCell" {{updateCell}}>
	    <label for="actUpdate">Update Cell</label>
          </div>
        <div>
	  <input name="ssAct" type="radio" 
		 id="actCopy" value="copyCell" {{copyCell}}>
	  <label for="actCopy">Copy Cell</label>
        </div>
	</fieldset>
	<br/>
	<span class="error" id="ssActError">{{ssAct.errorMessage}}</span>
      </span>
      <label for="cellId">Destination Cell ID</label>
      <span>
	<input name="cellId" value="{{cellId.value}}" id="cellId"/>
	<br/>
	<span class="error" id="cellIdError">{{cellId.errorMessage}}</span>
      </span>
      <label for="formula">Formula</label>
      <span>
	<input name="formula" value="{{formula.value}}" id="formula"/>
	<br/>
	<span class="error" id="formulaError">{{formula.errorMessage}}</span>
      </span>
      <label>&nbsp;</label>
      <input type="submit" value="Update"/>
    </form>
  </body>
</html>