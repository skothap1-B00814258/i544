import parse from './expr-parser.mjs';
import AppError from './app-error.mjs';
import { cellRefToCellId } from './util.mjs';

import { inspect } from 'util';
/**
 * User errors are reported by throwing a suitable AppError object
 * having a suitable message property and code property set as
 * follows:
 *
 *  `SYNTAX`: for a syntax error.
 *  `CIRCULAR_REF` for a circular reference.
 */

// names of private (not to be used outside this class) methods/properties 
// start with an '_'.
export default class MemSpreadsheet {

  constructor() {
    this._cells = {};  //map from cellIds to CellInfo objects
    this._undos = {};  //map from cellIds to previous this._cells[cellId]
  }
  
  /** Set cell with id baseCellId to result of evaluating string
   *  formula.  Update all cells which are directly or indirectly
   *  dependent on the base cell.  Return an object mapping the id's
   *  of all dependent cells to their updated values.  
   */
  eval(baseCellId, formula) {
    try {
      this._undos = {};
      const cellId = cellRefToCellId(baseCellId);
      const oldAst = this._cells[cellId]?.ast;
      const ast = parse(formula, cellId);
      const cell = this._updateCell(cellId, cell => cell.ast = ast);
      if (oldAst) this._removeAsDependent(cellId, oldAst);
      const updates = this._evalCell(cell, new Set());
      return updates;
    }
    catch (err) {
      this.undo();
      throw err;
    }
  }

  /** return object containing formula and value for cell cellId 
   *  return { value: 0, formula: '' } for an empty cell.
   */
  query(cellId) {
    //@TODO
   // console.log(this._cells);
   // console.log(cellId);
    let res = {};
    if (cellId in this._cells){
      res.formula = this._cells[cellId].formula;
      res.value = this._cells[cellId].value;
    }else{
      res.formula = '';
      res.value = 0;
    }
   // console.log(res);
    return res;
  }

  /** Clear contents of this spreadsheet. No undo information recorded. */
  clear() {
    this._undos = {};
    //@TODO
    this._cells = {};
  }

  /** Delete all info for cellId from this spreadsheet. Return an
   *  object mapping the id's of all dependent cells to their updated
   *  values.  
   * 
   *  -> First correctly sets the undos by calling the updateCell method
   *     with cell.dependants.delete as the cellId must be deleted from the
   *     other cells which have it as dependant.
   *  -> Then deleting the cellId from this._cells
   *  -> Taking the values of all the cells before eval so that to compare
   *     after result and return the updated cells.
   *  -> Calling the eval on all the cells inorder to make sure that
   *     all the cells values are updated correctly.
   *  -> After the eval just compares the before and after result and
   *     returns the changed values.
   */
  delete(cellId) {
    this._undos = {};
    const results = {};
    const before_res = {};
  //  let d = this._cells[cellId].dependents;
  //  console.log(d);
    //@TODO
   // console.log(this._cells);
    for(let i in this._cells){
     // console.log("in the loop", i);
     // let s = this._updateCell(this._cells[i]);
      this._updateCell(i, cell => cell.dependents.delete(cellRefToCellId(cellId)));
    }
    delete this._cells[cellId];
   // console.log(this._cells);
    for(let i in this._cells){
      before_res[i] = this._cells[i].value;
    }
   // console.log("before res",before_res);
    for(let i in this._cells){
      if(this._cells[i].ast !== null){
      this.eval(i, this._cells[i].formula); }
    }
   // console.log(this._cells);
    for(let i in this._cells){
      if(i !== cellRefToCellId(cellId)){
      results[i] = this._cells[i].value;}
    }
  //  console.log(before_res);
  //  console.log("after res", results);
    let diff = Object.keys(results).reduce((diff, key) => {if (before_res[key] === results[key]) return diff 
      return { ...diff, [key]: results[key] }}, {})
    //console.log(diff);
   // console.log(results);
    return diff;
  }

  /** copy formula from srcCellId to destCellId, adjusting any
   *  relative cell references suitably.  Return an object mapping the
   *  id's of all dependent cells to their updated values. Copying
   *  an empty cell is equivalent to deleting the destination cell.
   * 
   *  If the srcCellId is empty it calls the delete function with
   *  the destination cellId and returns the result occured by the 
   *  delete function.
   */
  copy(destCellId, srcCellId) {
    this._undos = {};
    const results = {};
    //@TODO - undos check
     for(let i in this._cells){
      //   console.log(i);
         this._undos[i] = this._cells[i];
     }
    // console.log(this._undos);

    if(cellRefToCellId(srcCellId) in this._cells){
    const srcAst = this._cells[cellRefToCellId(srcCellId)].ast;
    const destFormula = srcAst.toString(cellRefToCellId(destCellId));
    let res = this.eval(cellRefToCellId(destCellId), destFormula);
   // console.log(this._cells);
   // console.log(res);
    return res;
    }
    else{
    //  console.log("in empty cell loop");
      let i = this.delete(cellRefToCellId(destCellId));
      return i;
    }
   // console.log(res);
   // return res;
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
   * 
   *  Once the topological_sort function returns the topological sort the higher order function 
   *  sort does the sorting in the lexical order.
   *   
   *  Then the cellID along with the formula are pushed into the new Array 
   *  and returned.
   * 
   *  if the spread sheet is empty it just returns the empty cell else calls the
   *  topological_sort() function with required parameters.
   */
  dump() {
   // console.log(this._cells.length);
    if(Object.keys(this._cells).length !== 0){
   // console.log("in this loop");
    const prereqs = this._makePrereqs();
   // console.log(prereqs);
    let end_result = [];
    //@TODO
    let vertices = [];
    for(let i in prereqs){
        vertices.push(i)
    }
   // console.log(vertices);
    let res = this.topological_sort(prereqs, vertices, vertices[0], [], []);
  //  console.log("result", res);
    let new_prereq = {};
    for(let i of res){
      new_prereq[i] = prereqs[i];
    }
   // console.log(new_prereq);
   // function for lexical sorting according to the value first then with the id.
    let rs = Object.entries(new_prereq).sort(function(a, b) {
      if(a[1] > b[1]) {return  1;}
     if(a[1] < b[1]) {return -1;}
     else{
     if(a[0] > b[0]) {return  1;}
     if(a[0] < b[0]) {return  -1;}
     }
    return 0;
   });
  // console.log(rs);
  // pushes the list of [cellID, formula] in the order produced by res.
   for(let i of rs){
     let l = [];
     l.push(i[0]);
     l.push(this._cells[i[0]].formula);
     end_result.push(l);
   }
  // console.log(end_result);
    return end_result;
  }else{
    return [];
  }
  }

  /**
   * This function has been taken from online in Python language for just the Topological sort. I converted it to Java Script.
   * This function basically is a Depth- first search which traverses all the nodes and gives the topological order.
   * @param prereqs -  the prereqs passed from the dump function.
   * @param vertices - list containing the cell Id's in the prereqs Object.
   * @param start - starting index of the vertices.
   * @param visited - the nodes/vertices visited.
   * @param result - the end result with the topological sort.
   */
  topological_sort(prereqs, vertices, start, visited, result){
        let current = start;
        visited.push(current);
        let adjacent = prereqs[current];
        for(let i of adjacent){
          if(!visited.includes(i)){
            result = this.topological_sort(prereqs, vertices, i, visited, result);
          }
        }
        result.push(current);
        if(visited.length !== vertices.length){
             for(let v of vertices){
               if(!visited.includes(v)){
                 result = this.topological_sort(prereqs, vertices, v, visited, result);
               }
             }
        }
        return result;
  }

  /** undo all changes since last operation */
  undo() {
    for (const [k, v] of Object.entries(this._undos)) {
      if (v) {
	this._cells[k] = v;
      }
      else {
	delete this._cells[k];
      }
    }
  }

  /** Return object mapping cellId to list containing prerequisites
   *  for cellId for all non-empty cells.
   */
  _makePrereqs() {
    const prereqCells =
       Object.values(this._cells).filter(cell => !cell.isEmpty());
    const prereqs = Object.fromEntries(prereqCells.map(c => [c.id, []]));
    for (const cell of prereqCells) {
      for (const d of cell.dependents) {
	if (prereqs[d]) prereqs[d].push(cell.id);
      }
    }
    return prereqs;
  }

  // must update all cells using only this function to guarantee
  // recording undo information.
  _updateCell(cellId, updateFn) {
    if (!(cellId in this._undos)) {
      this._undos[cellId] = this._cells[cellId]?.copy();
    }
    const cell =
      this._cells[cellId] ?? (this._cells[cellId] = new CellInfo(cellId));
  //  console.log(cell);
    updateFn(cell);
  //  console.log(updateFn);
    return cell;
  }

  // you should not need to use these remaining methods.

  _evalCell(cell, working) {
    const value = this._evalAst(cell.id, cell.ast);
    this._updateCell(cell.id, cell => cell.value = value);
    const vals = { [cell.id]: value };
    working.add(cell.id);
    for (const dependent of cell.dependents) {
      if (working.has(dependent)) {
	const msg = `circular ref involving ${dependent}`;
	throw new AppError('CIRCULAR_REF', msg);
      }
      const depCell = this._cells[dependent];
      Object.assign(vals, this._evalCell(depCell, working));
    }
    working.delete(cell.id);
    return vals;
  }

  _evalAst(baseCellId, ast) {
    if (ast === null) {
      return 0;
    }
    else if (ast.type === 'num') {
      return ast.value;
    }
    else if (ast.type === 'ref') {
      const cellId = cellRefToCellId(ast.toString(baseCellId));
      const cell =
	this._updateCell(cellId, cell => cell.dependents.add(baseCellId));
      return cell.value;
    }
    else {
      console.assert(ast.type === 'app', `unknown ast type ${ast.type}`);
      const f = FNS[ast.fn];
      console.assert(f, `unknown ast fn ${ast.fn}`);
      return f(...ast.kids.map(k => this._evalAst(baseCellId, k)));
    }
  }

  _removeAsDependent(baseCellId, ast) {
    if (ast.type === 'app') {
      ast.kids.forEach(k => this._removeAsDependent(baseCellId, k));
    }
    else if (ast.type === 'ref') {
      const cellId = cellRefToCellId(ast.toString(baseCellId));
      this._updateCell(cellId, cell => cell.dependents.delete(baseCellId));
    }
  }

}



class CellInfo {
  constructor(id) {
    this.id = id;
    this.value = 0;    //cache of current value, not strictly necessary
    this.ast = null;
    this.dependents = new Set(); //cell-ids of cells which depend on this
    //equivalently, this cell is a prerequisite for all cells in dependents
    
  }

  //formula computed on the fly from the ast
  get formula() { return this.ast ? this.ast.toString(this.id) : ''; }

  //empty if no ast (equivalently, the formula is '').
  isEmpty() { return !this.ast; }
  
  copy() {
    const v = new CellInfo(this.id);
    Object.assign(v, this);
    v.dependents = new Set(v.dependents);
    return v;   
  }

}

const FNS = {
  '+': (a, b) => a + b,
  '-': (a, b=null) => b === null ? -a : a - b,
  '*': (a, b) => a * b,
  '/': (a, b) => a / b,
  min: (...args) => Math.min(...args),
  max: (...args) => Math.max(...args),
}
