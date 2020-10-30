import assert from 'assert';
import cors from 'cors';
import express from 'express';
import bodyParser from 'body-parser';

import {AppError} from 'cs544-ss';

/** Storage web service for spreadsheets.  Will report DB errors but
 *  will not make any attempt to report spreadsheet errors like bad
 *  formula syntax or circular references (it is assumed that a higher
 *  layer takes care of checking for this and the inputs to this
 *  service have already been validated).
 */

//some common HTTP status codes; not all codes may be necessary
const OK = 200;
const CREATED = 201;
const NO_CONTENT = 204;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const CONFLICT = 409;
const SERVER_ERROR = 500;

export default function serve(port, ssStore) {
  const app = express();
  app.locals.port = port;
  app.locals.ssStore = ssStore;
  setupRoutes(app);
  app.listen(port, function() {
    console.log(`listening on port ${port}`);
  });	
}

const CORS_OPTIONS = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204,
  exposedHeaders: 'Location',
};

const BASE = 'api';
const STORE = 'store';


function setupRoutes(app) {
  app.use(cors(CORS_OPTIONS));  //needed for future projects
  //@TODO add routes to handlers
  app.use(bodyParser.json());
  app.get(`/${BASE}/${STORE}/:ssname`, doList(app));
  app.delete(`/${BASE}/${STORE}/:ssname`, doDelete(app));
  app.patch(`/${BASE}/${STORE}/:ssname`, doUpdate(app));
  app.put(`/${BASE}/${STORE}/:ssname`, doReplace(app));
  app.delete(`/${BASE}/${STORE}/:ssname/:id`, doDeleteCell(app));
  app.patch(`/${BASE}/${STORE}/:ssname/:id`, doUpdateCell(app));
  app.put(`/${BASE}/${STORE}/:ssname/:id`, doUpdateCell(app));
  

  app.use(do404(app));
  app.use(doErrors(app));
}

/****************************** Handlers *******************************/

//@TODO

function doList(app){
  return (async function(req, res) {
     const name = req.params.ssname;
    // console.log("trial query name", name);
     try{
      //  console.log("in try", name);
        const result = await app.locals.ssStore.readFormulas(name);
        // console.log("res", result);
	res.json(result);
      }
      catch(err) {
	   const mapped = mapError(err);
           res.status(mapped.status).json(mapped);
      }
  });
}

function doDelete(app){
   return (async function(req, res) {
	const name = req.params.ssname;
   try{
       const results = await app.locals.ssStore.clear(name);
       res.sendStatus(OK);
   }catch(err){
         const mapped = mapError(err);
         res.status(mapped.status).json(mapped); 
   }
   
   });

}


function doUpdate(app){
   return (async function(req, res) {
        try{
          const name = req.params.ssname;
	//  console.log("spname", name);
        //  const patch = Object.assign({}, req.body);
	//  console.log(Array.isArray(req.body));
        //  console.log("object", req.body);
	  const obj = Object.fromEntries(req.body);
	//  console.log("patch object",obj);
	  for(let o in obj){
	   // console.log(o, obj[o]);
            await app.locals.ssStore.updateCell(name, o, obj[o]);
	  }
	  res.sendStatus(OK);
	}catch(err){
              if (err instanceof AppError) {
                  const mapped = mapError(err);
                  res.status(mapped.status).json(mapped);
              }
            else{
              const message = "request body must be a list of cellId, formula pairs";
              const result = {
                   status: BAD_REQUEST,
                   error: { code: 'BAD_REQUEST', message: message },
                };
            //  const mapped = mapError(err);
              res.status(BAD_REQUEST).json(result);
         }
	}
   });	   
}

function doReplace(app){
 return (async function (req, res) {
      try {
             const name = req.params.ssname;
             await app.locals.ssStore.clear(name);
             const obj = Object.fromEntries(req.body);
	     for(let o in obj){
              // console.log(o, obj[o]);
                await app.locals.ssStore.updateCell(name, o, obj[o]);
               }
            res.sendStatus(OK);
          }
	 catch(err){
	     if (err instanceof AppError) {
                  const mapped = mapError(err);
                  res.status(mapped.status).json(mapped);
              }
	    else{
	      const message = "request body must be a list of cellId, formula pairs";
	      const result = {
                   status: BAD_REQUEST,
                   error: { code: 'BAD_REQUEST', message: message },
                };
	    //  const mapped = mapError(err);
              res.status(BAD_REQUEST).json(result);
	 }
	 }
 });

}

function doDeleteCell(app){
   return (async function (req, res) {
      try{
        const name = req.params.ssname;
	const id = req.params.id;
    //	console.log(name, id);
	await app.locals.ssStore.delete(name, id);
	res.sendStatus(OK);
       }
       catch(err){
	       const mapped = mapError(err);
              res.status(mapped.status).json(mapped);
       }

   });
}

function doUpdateCell(app){
   return (async function (req, res) {
      try{
         const name = req.params.ssname;
         const id = req.params.id;
	 if(req.body.hasOwnProperty('formula')){
	     const formula = req.body.formula;
	     // console.log(name, id, formula);
	     await app.locals.ssStore.updateCell(name, id, formula);
	     res.sendStatus(OK);
	 }
	  else{
	       const message = "request body must be a { formula } object";
               const result = {
                   status: BAD_REQUEST,
                   error: { code: 'BAD_REQUEST', message: message },
                };
		res.status(BAD_REQUEST).json(result);
        }
      }
       catch(err){
	  const mapped = mapError(err);
          res.status(mapped.status).json(mapped);
       }
   });

}

/** Default handler for when there is no route for a particular method
 *  and path.
 */
function do404(app) {
  return async function(req, res) {
    const message = `${req.method} not supported for ${req.originalUrl}`;
    const result = {
      status: NOT_FOUND,
      error: { code: 'NOT_FOUND', message, },
    };
    res.status(404).
	json(result);
  };
}


/** Ensures a server error results in nice JSON sent back to client
 *  with details logged on console.
 */ 
function doErrors(app) {
  return async function(err, req, res, next) {
    const result = {
      status: SERVER_ERROR,
      error: { code: 'SERVER_ERROR', message: err.message },
    };
    res.status(SERVER_ERROR).json(result);
    console.error(err);
  };
}


/*************************** Mapping Errors ****************************/

const ERROR_MAP = {
}

/** Map domain/internal errors into suitable HTTP errors.  Return'd
 *  object will have a "status" property corresponding to HTTP status
 *  code and an error property containing an object with with code and
 *  message properties.
 */
function mapError(err) {
  const isDomainError = (err instanceof AppError);
  const status =
    isDomainError ? (ERROR_MAP[err.code] || BAD_REQUEST) : SERVER_ERROR;
  const error = 
	isDomainError
	? { code: err.code, message: err.message } 
        : { code: 'SERVER_ERROR', message: err.toString() };
  if (!isDomainError) console.error(err);
  return { status, error };
} 

/****************************** Utilities ******************************/



/** Return original URL for req */
function requestUrl(req) {
  const port = req.app.locals.port;
  return `${req.protocol}://${req.hostname}:${port}${req.originalUrl}`;
}
