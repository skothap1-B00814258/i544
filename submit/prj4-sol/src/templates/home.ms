<!-- -- mode: html; -- -->
<!DOCTYPE html>
<html>
  <head>
    <title>CS 444/544 Spreadsheet Selection</title>
    <link rel="stylesheet" href="/style.css" type="text/css"/>
  </head>
  <body>
    <h1>CS 444/544 Spreadsheet Selection</h1>
    
    <form action="/" method="POST">
      <label for="ssName">Open Spreadsheet Name</label>
      <span>
	<input name="ssName" value="{{value}}" id="ssName"/>
  <p id = "ssNameError" class="error">{{error}}</p>
	<br/>
  
      </span>
      <input type="submit" value="Open"/>
    </form>
  </body>
</html>
