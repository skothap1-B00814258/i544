import Path from 'path';

import express from 'express';
import bodyParser from 'body-parser';

import querystring from 'querystring';

import {AppError, Spreadsheet} from 'cs544-ss';

import Mustache from './mustache.mjs';
import e from 'express';

const STATIC_DIR = 'statics';
const TEMPLATES_DIR = 'templates';

//some common HTTP status codes; not all codes may be necessary
const OK = 200;
const CREATED = 201;
const NO_CONTENT = 204;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const CONFLICT = 409;
const SERVER_ERROR = 500;
let error_m = {};
let checked = {clear: ' ', deleteCell: ' ', updateCell: ' ', copyCell: ' '};

const __dirname = Path.dirname(new URL(import.meta.url).pathname);

export default function serve(port, store) {
  process.chdir(__dirname);
  const app = express();
  app.locals.port = port;
  app.locals.store = store;
  app.locals.mustache = new Mustache();
  app.use('/', express.static(STATIC_DIR));
  setupRoutes(app);
  app.listen(port, function() {
    console.log(`listening on port ${port}`);
  });
}


/*********************** Routes and Handlers ***************************/

function setupRoutes(app) {
  app.use(bodyParser.urlencoded({extended: true}));
 // app.get('/', (req, res) => {res.send("hello world")});
  app.get('/', doHome(app));
  app.post('/', doSpreadsheet(app));
  app.get('/ss/:ssname', doGet(app));
  app.post('/ss/:ssname', doPost(app));
  //@TODO add routes
  //must be last
  app.use(do404(app));
  app.use(doErrors(app));

}

//@TODO add handlers

/**
 * get handler method for '/' displays the page with Open Spreadsheet
 * name heading and a input widget and submit button. Uses the home.ms
 * template.
 * @param app 
 */
function doHome(app){
  return async function(req, res){
    const model = {base: app.locals.base};
    res.status(OK).send(app.locals.mustache.render('home',model));
     }
  }

  /**
   * post handler method for '/' redirects to spreadsheet if the given spreadsheet name 
   * is correct or displays the same page if there are errors in the given 
   * spreadsheet name.
   * @param app 
   */
  function doSpreadsheet(app){
    return async function(req, res){
       //  const model = {base: app.locals.base};
        let errors = {};
        const ssname = req.body;
        let error = validateField('ssName', req.body, errors);
      //  console.log("errors", errors);
       // res.status(OK).send(error);
      //  console.log(error);
        if(error === true){
         res.redirect(`ss/${ssname.ssName}`);
        } 
        else{
           const model = {base: app.locals.base, value: req.body.ssName, error: errors.ssName};
           res.status(OK).send(app.locals.mustache.render('home', model));
        }
    }
  }
  
  /**
   * Get method handler for 'ss/ssName'
   * Get handler method for the spreadsheet page with data and update options for the respective
   * spreadsheet. Gets the table using dynamic_array and table_view method for 
   * creating a table. Stores the frst row as headings into a seperate array.
   * Spreadsheet table with data, headings, error (displays only in case of a 
   * error) and checked Object(for the error purpose) and renders the model with 
   * to the main.ms file with above data in the model.
   * @param app 
   */
  function doGet(app){
    return async function(req, res){
       // res.status(OK).send(req.params.ssname);
        try{
            //let tbl = [];
            const sname = req.params.ssname;
            const spsheet = await Spreadsheet.make(sname, app.locals.store);
          //  console.log(spsheet);
            const array1 = spsheet.dump();
          //  console.log(array1);
                const rc = dynamic_array(array1);
              //  console.log(rc.rows, rc.cols);
                const tbl = table_view(rc.rows, rc.cols, array1, spsheet, sname);
          //  console.log("IN the get");
          //  console.log(tbl);
            const headings = [];
            for (let i = 0; i <= rc.cols; i++){
                headings.push(tbl[0][i]);
            }
            delete tbl[0];
           // console.log(tbl);
           // console.log(headings);
           // console.log("error try", error_m);
            // res.status(OK).send(tbl);
            // res.status(OK).send(await spsheet.dump());
            // const view = {spname: req.params.ssname, headings: headings, dataSet : tbl};
           //  console.log(Object.keys(error_m).length);
             let model = {base: app.locals.base, spname: req.params.ssname, headings: headings, dataSet : tbl};
             if(Object.keys(error_m).length > 0){
                  for(let i in error_m){
                    model[i] = error_m[i];
                  }
             }
             for(let i in checked){
               model[i] = checked[i];
             }
           //  console.log(model);
             error_m = {};
             checked = {clear: ' ', deleteCell: ' ', updateCell: ' ', copyCell: ' '};
             res.status(OK).send(app.locals.mustache.render('main', model));
        }catch (err){
               console.log(err);
        }
       // res.status(OK).send(app.locals.mustache.render('spreadsheet', model));
    }
  }

  /**
   * Post method handler 'for ss/ssName'
   * This method is for posting the form with submitted values or else redisplays
   * the form with same values and errors down the widgets. 
   * 
   * In case of a error - stores the name of the widget with value and errorMessage
   * to a global Object (error_m) and to retain the checked radio button using a
   * global object initialized with actions as key and value as empty string. According
   * to the value of the action , value is changed as checked and redirects to the
   * Get method. And these 2 global Objects have been added to the model while rendering 
   * the template. 
   * 
   * In case of no error and if a circular ref or syntax error comes in it catches
   * the error adds the values accordingly to the 2 global objects error_m, checked
   * and redirects to the GET method.
   * @param app 
   */
  function doPost(app){
      return async function(req, res){
        let errors = {};
        const model = {};
        let error = validateUpdate(req.body, errors);
        if (error !== true){
        console.log(errors, error);
        console.log(req.body);
      //  if(req.body.hasOwnProperty('ssAct')){
        for (let i in req.body){
          console.log(i);
            const name = i;
            const extraInfo = {value: req.body[name]};
            if (errors[name]) extraInfo.errorMessage = errors[name];
            console.log(name, extraInfo);
            error_m[name] = extraInfo;
        }
   //   }
        if(!req.body.hasOwnProperty('ssAct')){
          error_m['ssAct'] = {errorMessage : errors['ssAct']};
         // console.log(error_m);
      }
        if(error_m.hasOwnProperty('ssAct')){
        console.log(error_m['ssAct'].value);
        if (error_m['ssAct'].value === 'clear'){ checked['clear'] = "checked";};
        if (error_m['ssAct'].value === 'deleteCell'){checked['deleteCell'] = "checked"};
        if (error_m['ssAct'].value === 'updateCell'){checked['updateCell'] = "checked"};
        if (error_m['ssAct'].value === 'copyCell'){checked['copyCell'] = "checked"}
        }
        res.redirect(`${req.params.ssname}`);
      }
      else{
        const sname = req.params.ssname;
        const spsheet = await Spreadsheet.make(sname, app.locals.store);
        try{
        // res.status(OK).send(req.body);
        if (req.body.ssAct === "updateCell"){
          //  const sname = req.params.ssname;
          //  const spsheet = await Spreadsheet.make(sname, app.locals.store);
          // res.status(OK).send(req.body);
           const result = await spsheet.eval(req.body.cellId, req.body.formula, app.locals.store);
          // console.log(result);
          // res.status(OK).send(result);
           res.redirect(`${sname}`);
        }
       if (req.body.ssAct === "copyCell"){
           // res.status(OK).send(req.body);
            const result = await spsheet.copy(req.body.cellId, req.body.formula);
          //  console.log(result);
          // res.status(OK).send(result);
           res.redirect(`${sname}`);
       }
       if (req.body.ssAct === "clear"){
            await spsheet.clear();
            res.redirect(`${sname}`);
       }
       if (req.body.ssAct === "deleteCell"){
          const results = await spsheet.delete(req.body.cellId);
          res.redirect(`${sname}`);
       }
      }catch(err){
         console.log(err); 
        // console.log(err.code, err.message);
         if(err.code === 'CIRCULAR_REF' || err.code === 'SYNTAX'){
                for(let i in req.body){
                  const name = i;
                  const extraInfo = {value: req.body[name]};
                  error_m[name] = extraInfo
                }
              error_m['formula'].errorMessage = err.message;
              console.log(error_m);
              if (error_m['ssAct'].value === 'clear'){ checked['clear'] = "checked";};
              if (error_m['ssAct'].value === 'deleteCell'){checked['deleteCell'] = "checked"};
              if (error_m['ssAct'].value === 'updateCell'){checked['updateCell'] = "checked"};
              if (error_m['ssAct'].value === 'copyCell'){checked['copyCell'] = "checked"}
              res.redirect(`${req.params.ssname}`);

         }
      }
      }
      }
  }

/** Default handler for when there is no route for a particular method
 *  and path.
 */
function do404(app) {
  return async function(req, res) {
    const message = `${req.method} not supported for ${req.originalUrl}`;
    res.status(NOT_FOUND).
      send(app.locals.mustache.render('errors',
				      { errors: [{ msg: message, }] }));
  };
}

/** Ensures a server error results in an error page sent back to
 *  client with details logged on console.
 */ 
function doErrors(app) {
  return async function(err, req, res, next) {
    res.status(SERVER_ERROR);
    res.send(app.locals.mustache.render('errors',
					{ errors: [ {msg: err.message, }] }));
    console.error(err);
  };
}

/************************* SS View Generation **************************/

const MIN_ROWS = 10;
const MIN_COLS = 10;

//@TODO add functions to build a spreadsheet view suitable for mustache

/**
 * This method creates an array with given rows and columns and data inserted into the 
 * colums and returns it. Basically takes the dump input splits the cellId into 2 parts
 * part 1 - column name and part 2 - row number. Using the spreadsheet instance calls 
 * the query method which return formula and value, this value is stored in the array.
 * 
 * And also uses a map which maps alphabet to the number corresponding to it so that
 * that will be stored in the numbered column.
 * 
 * @param rows  - number of rows to be created
 * @param columns  - number of columns needed
 * @param darray - dump result - list of cellId and formulas
 * @param spObj - spreadsheet instance.
 * @param spName - Spreadsheet name for entering into the array[0][0].
 */

function table_view(rows, columns, darray, spObj, spName){
 // console.log("in this function");
  let array_ss = [];
  const map1 = {a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9, j: 10, k: 11,
    l: 12, m: 13, n: 14,o: 15, p: 16, q: 17, r: 18, s: 19, t: 20,
    u: 21, v: 22, w: 23, x: 24, y: 25, z: 26
   }
  for(let i = 0; i <= rows; i++){
    array_ss.push([0]);
    for(let j = 0; j <= columns; j++){
            array_ss[i][j] = 0;
    }
  }
  // console.log(array_ss);
  // console.log(darray);
  const obj = Object.fromEntries(darray);
  // console.log(obj);
  for (let i in obj){
    // const s = i.split('');
     const result = spObj.query(i);
    // console.log(value);
    // console.log(s[0], s[1]);
     array_ss[parseInt(i.substring(1, i.length))][map1[i[0]]] = result.value;
  }
  array_ss[0][0] = spName;
  for (let i = 1; i <= columns; i++){
       array_ss[0][i] = String.fromCharCode(65 + i-1);
  }

  for(let i = 1; i <= rows; i++){
      array_ss[i][0] = i;
  }
 // console.log(array_ss);
  return array_ss;
}

/**
 * This function is used for determining the number of rows and columns needed
 * for the array from the dump result. from the dump result Im just creating 
 * a new Array with just the cellId's. looping through these cellId's Im storing 
 * the columns and row numbers to both seperate array. After sorting them in 
 * the ascending order and collecting the last element of each arrays into
 * rows and columns and returns a object with rows and columns.  
 * 
 * if the dump has no rows then it just returns rows and columns as 10.
 * @param dump_res 
 */
function dynamic_array(dump_res){
  if(dump_res.length > 0){
  // console.log("in the >0 array");
  const vertices = [];
  const map1 = {a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9, j: 10, k: 11,
    l: 12, m: 13, n: 14,o: 15, p: 16, q: 17, r: 18, s: 19, t: 20,
    u: 21, v: 22, w: 23, x: 24, y: 25, z: 26
   }
  for(let i of dump_res){
       vertices.push(i[0]);
  }
  //console.log(vertices);
  const al = new Set();
  const n = new Set();
  for(let i of vertices){
       al.add(i[0]);
       n.add(parseInt(i.substring(1, i.length)));
  }
  const a = [...al];
  const n1 = [...n]; 
  a.sort(function(a, b) {
    return a - b;
  });
  n1.sort(function(a, b) {
    return a - b;
  });
  //console.log(a, n1);
  //console.log(al, n);
  const rows = n1[n1.length-1];
  const cols = map1[a[a.length-1]];
  if (rows <= 10 & cols <= 10){
        return {rows: 10, cols: 10};
  }
  else if (rows <= 10 & cols > 10){
        return {rows : 10, cols : cols};
  }
  else if (rows > 10 & cols <= 10){
    return {rows : rows, cols : 10};
  }
  else{
       return {rows : rows, cols: cols};
  }
}else{
   return {rows : 10, cols : 10};
}
}

/**************************** Validation ********************************/


const ACTS = new Set(['clear', 'deleteCell', 'updateCell', 'copyCell']);
const ACTS_ERROR = `Action must be one of ${Array.from(ACTS).join(', ')}.`;

//mapping from widget names to info.
const FIELD_INFOS = {
  ssAct: {
    friendlyName: 'Action',
    err: val => !ACTS.has(val) && ACTS_ERROR,
  },
  ssName: {
    friendlyName: 'Spreadsheet Name',
    err: val => !/^[\w\- ]+$/.test(val) && `
      Bad spreadsheet name "${val}": must contain only alphanumeric
      characters, underscore, hyphen or space.
    `,
  },
  cellId: {
    friendlyName: 'Cell ID',
    err: val => !/^[a-z]\d\d?$/i.test(val) && `
      Bad cell id "${val}": must consist of a letter followed by one
      or two digits.
    `,
  },
  formula: {
    friendlyName: 'cell formula',
  },
};

/** return true iff params[name] is valid; if not, add suitable error
 *  message as errors[name].
 */
function validateField(name, params, errors) {
  const info = FIELD_INFOS[name];
  const value = params[name];
 // console.log(info, value, errors);
  if (isEmpty(value)) {
    errors[name] = `The ${info.friendlyName} field must be specified`;
   // console.log(errors);
    return false;
  }
  if (info.err) {
    const err = info.err(value);
   // console.log(err);
    if (err) {
      errors[name] = err;
      return false;
    }
   // console.log(errors.name);
  }
  //console.log("errors",errors);
  return true;
}

  
/** validate widgets in update object, returning true iff all valid.
 *  Add suitable error messages to errors object.
 */
function validateUpdate(update, errors) {
  const act = update.ssAct ?? '';
  switch (act) {
    case '':
      errors.ssAct = 'Action must be specified.';
      return false;
    case 'clear':
      return validateFields('Clear', [], ['cellId', 'formula'], update, errors);
    case 'deleteCell':
      return validateFields('Delete Cell', ['cellId'], ['formula'],
			    update, errors);
    case 'copyCell': {
      const isOk = validateFields('Copy Cell', ['cellId','formula'], [],
				  update, errors);
      if (!isOk) {
	return false;
      }
      else if (!FIELD_INFOS.cellId.err(update.formula)) {
	  return true;
      }
      else {
	errors.formula = `Copy requires formula to specify a cell ID`;
	return false;
      }
    }
    case 'updateCell':
      return validateFields('Update Cell', ['cellId','formula'], [],
			    update, errors);
    default:
      errors.ssAct = `Invalid action "${act}`;
      return false;
  }
}

function validateFields(act, required, forbidden, params, errors) {
  for (const name of forbidden) {
    if (params[name]) {
      errors[name] = `
	${FIELD_INFOS[name].friendlyName} must not be specified
        for ${act} action
      `;
    }
  }
  for (const name of required) validateField(name, params, errors);
  return Object.keys(errors).length === 0;
}


/************************ General Utilities ****************************/

/** return new object just like paramsObj except that all values are
 *  trim()'d.
 */
function trimValues(paramsObj) {
  const trimmedPairs = Object.entries(paramsObj).
    map(([k, v]) => [k, v.toString().trim()]);
  return Object.fromEntries(trimmedPairs);
}

function isEmpty(v) {
  return (v === undefined) || v === null ||
    (typeof v === 'string' && v.trim().length === 0);
}

/** Return original URL for req.  If index specified, then set it as
 *  _index query param 
 */
function requestUrl(req, index) {
  const port = req.app.locals.port;
  let url = `${req.protocol}://${req.hostname}:${port}${req.originalUrl}`;
  if (index !== undefined) {
    if (url.match(/_index=\d+/)) {
      url = url.replace(/_index=\d+/, `_index=${index}`);
    }
    else {
      url += url.indexOf('?') < 0 ? '?' : '&';
      url += `_index=${index}`;
    }
  }
  return url;
}

