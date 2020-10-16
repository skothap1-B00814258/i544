import AppError from './app-error.mjs';
import MemSpreadsheet from './mem-spreadsheet.mjs';

//use for development only
import { inspect } from 'util';

import mongo from 'mongodb';
import { read } from 'fs';

//use in mongo.connect() to avoid warning
const MONGO_CONNECT_OPTIONS = { useUnifiedTopology: true };

/**
 * User errors must be reported by throwing a suitable
 * AppError object having a suitable message property
 * and code property set as follows:
 *
 *  `SYNTAX`: for a syntax error.
 *  `CIRCULAR_REF` for a circular reference.
 *  `DB`: database error.
 */

export default class PersistentSpreadsheet {
  //factory method
  static async make(dbUrl, spreadsheetName) {
    try {
      //@TODO set up database info, including reading data
      const client = await mongo.connect(dbUrl, MONGO_CONNECT_OPTIONS);
      const db = client.db();
      const users = db.collection(spreadsheetName);
      //console.log(users);
      const res = await users.find({}).toArray();
      const memObj = new MemSpreadsheet();
      return new PersistentSpreadsheet(client, db, users, memObj, res, spreadsheetName);
    }
    catch (err) {
      const msg = `cannot connect to URL "${dbUrl}": ${err}`;
      throw [ new AppError('DB', msg) ];
    }
  }

  /**
   * The Constructors sets the values of the clname, db, collection name, memObj 
   * and spreadsheet name.
   * Runs eval method of the memory spreadsheet on the existing data so that 
   * the existing cell Info is stored in the this._cells and the this._undos.
   * @param clname - client info
   * @param dbname - database name
   * @param username - collection object
   * @param mObj - Memspreadsheet Object
   * @param data - Existing data collected from the database using find() method.
   * @param spname - spreadsheet name
   */
  constructor(clname, dbname, username, mObj, data, spname) {
    //@TODO
    this.cl = clname;
    this.db = dbname;
    this.uname = username;
    this.mO = mObj;
    this.sname = spname;
    for(let i = 0; i < data.length; i++){
        let id = data[i]._id;
        let form = data[i].formula; 
        let result = this.mO.eval(id, form);
    }
   // console.log(this.mO)
  }

  /** Release all resources held by persistent spreadsheet.
   *  Specifically, close any database connections.
   */
  async close() {
    //@TODO
    try {
      await this.cl.close();
    }
    catch (err) {
      throw new AppError('DB', err.toString());
    }
  }

  /** Set cell with id baseCellId to result of evaluating string
   *  formula.  Update all cells which are directly or indirectly
   *  dependent on the base cell.  Return an object mapping the id's
   *  of all dependent cells to their updated values.
   * 
   *  Once the eval returns with the result if the cellID is in the
   *  database collection it just updates it with the new formula
   *  else inserts a new row with the id and formula.
   * 
   *  While inserting into the database I changed the _id as the 
   *  id to the baseCellId's.
   * 
   *  Database row example: { "_id" : "a1", "formula" : "22" }
   *   
   */
  async eval(baseCellId, formula) {
  //  await this.readData(baseCellId);
    const results = this.mO.eval(baseCellId, formula); 
    try {
      //@TODO
   // let res = this.mO.eval(baseCellId, formula);
    var query = {_id : baseCellId};
   // console.log(query);
    if(await this.uname.countDocuments(query) === 1){
        var query = {_id : baseCellId};
        var values = {$set: {formula : formula}};
        await this.uname.updateOne(query, values);
    }
    else{
     // console.log("in the insert loop");
      await this.uname.insertOne({ _id: baseCellId, formula: formula} );}
    //  console.log(inspect(this.mO, false, Infinity));
   // console.log(res);
    return results;
    }
    catch (err) {
      //@TODO undo mem-spreadsheet operation
      this.mO.undo();
      const msg = `cannot update "${baseCellId}: ${err}`;
      throw [ new AppError('DB', msg) ];
    }
    //return results;
  }

  /** return object containing formula and value for cell cellId 
   *  return { value: 0, formula: '' } for an empty cell.
   * 
   *  delegates to the inmemory spreadsheet query and returns 
   *  the result from it.
   */
  async query(cellId) {
  //  console.log(this.mO);
    const results = this.mO.query(cellId);
    return results;
    // return /* @TODO delegate to in-memory spreadsheet */ {}; 
  }

  /** Clear contents of this spreadsheet 
   *  Checks if the collection exists and then uses deleteMany{()}
   *  to clear the spread sheet.
   *   
   *  collections array - it consists of the names of the collections
   *  in the database. If the given spreadsheet includes in the collections
   *  Array then deletes the rows from the collections.
  */

  async clear() {
    try {
      //@TODO - additional check for checking if the collection exists.
      const collections = (await this.db.listCollections().toArray()).map(collection => collection.name);
    //  console.log(collections);
    //  this.mO.clear();
    //console.log(this.uname);
     if(collections.includes(this.sname)){
          //  console.log("inside loop");
            await this.uname.deleteMany({});
     }
    }
    catch (err) {
      const msg = `cannot drop collection ${this.spreadsheetName}: ${err}`;
      throw [ new AppError('DB', msg) ];
    }
    /* @TODO delegate to in-memory spreadsheet */
    this.mO.clear();
  }

  /** Delete all info for cellId from this spreadsheet. Return an
   *  object mapping the id's of all dependent cells to their updated
   *  values.  
   * 
   *  First delegates to the in memory delete and then once it returns 
   *  successfully deleted the row from the spreadsheet.
   */
  async delete(cellId) {
    let results;
    results = this.mO.delete(cellId); 
   // console.log(results);
    try {
      //@TODO
      await this.uname.deleteOne({_id:cellId});
    }
    catch (err) {
      //@TODO undo mem-spreadsheet operation
      this.mO.undo();
      const msg = `cannot delete ${cellId}: ${err}`;
      throw [ new AppError('DB', msg) ];
    }
    return results;
  }
  
  /** copy formula from srcCellId to destCellId, adjusting any
   *  relative cell references suitably.  Return an object mapping the
   *  id's of all dependent cells to their updated values. Copying
   *  an empty cell is equivalent to deleting the destination cell.
   * 
   *  delegates to the in memory copy() method if the srcFormlua is 
   *  empty calls the delete method or else if the destination id is
   *  present then updates the formula in spreadsheet database or else
   *  inserts a new row with id and formula.
   */
  async copy(destCellId, srcCellId) {
    const srcFormula = this.mO.query(srcCellId).formula;
  //  console.log("srcFormula",srcFormula);
    if (!srcFormula) {
    //  console.log("in empty string formula");
      return await this.delete(destCellId);
    }
    else {
     // console.log("in copy");
      const results = this.mO.copy(destCellId, srcCellId); 
      try {
      //@TODO
      var query = {_id : destCellId};
      if(await this.uname.countDocuments(query) === 1){
        var query = {_id : destCellId};
        var values = {$set: {formula : this.mO._cells[destCellId].formula}};
      //  console.log(query, values);
        await this.uname.updateOne(query, values);
    }
    else{
    //  console.log("in the copy insert loop");
      await this.uname.insertOne({ _id: destCellId, formula: this.mO._cells[destCellId].formula} );}
        }    
      catch (err) {
  //@TODO undo mem-spreadsheet operation
  this.mO.undo();
	const msg = `cannot update "${destCellId}: ${err}`;
	throw [ new AppError('DB', msg) ];
      }
      return results;
    }
  }

  /** Return dump of cell values as list of cellId and formula pairs.
   *  Do not include any cell's with empty formula.
   *
   *  Returned list must be sorted by cellId with primary order being
   *  topological (cell A < cell B when B depends on A) and secondary
   *  order being lexicographical (when cells have no dependency
   *  relation). 
   *
   *  Specifically, the cells must be dumped in a non-decreasing depth
   *  order:
   *     
   *    + The depth of a cell with no dependencies is 0.
   *
   *    + The depth of a cell C with direct prerequisite cells
   *      C1, ..., Cn is max(depth(C1), .... depth(Cn)) + 1.
   *
   *  Cells having the same depth must be sorted in lexicographic order
   *  by their IDs.
   *
   *  Note that empty cells must be ignored during the topological
   *  sort.
   */
  async dump() {
   // this.mO.dump();
    return this.mO.dump();; 
  }

}

//@TODO auxiliary functions

