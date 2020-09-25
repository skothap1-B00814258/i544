import parse from './expr-parser.mjs';
import AppError from './app-error.mjs';
import { cellRefToCellId } from './util.mjs';

//use for development only
import { inspect } from 'util';
import parseExpr from './expr-parser.mjs';
import { colSpecToIndex } from './util.mjs';
import { indexToColSpec } from './util.mjs';
import { indexToRowSpec } from './util.mjs';
import { deepEqual, strict } from 'assert';
import { rowSpecToIndex } from './util.mjs';

export default class Spreadsheet {
  //factory method
  static async make() { return new Spreadsheet(); }
  constructor() {
    //@TODO
    this.l1 = [];
    this.value = 0;
    this.trial = {};
    this.l2 = [];
    this.cells_map = new Map();
    this.set1 = new Set();
  }

  /** Set cell with id baseCellId to result of evaluating formula
   *  specified by the string expr.  Update all cells which are
   *  directly or indirectly dependent on the base cell.  Return an
   *  object mapping the id's of all dependent cells to their updated
   *  values.  User errors must be reported by throwing a suitable
   *  AppError object having code property set to `SYNTAX` for a
   *  syntax error and `CIRCULAR_REF` for a circular reference
   *  and message property set to a suitable error message.
   * 
   *  Using a Map which has the key as baseCellId and value as the 
   *  particular cell info related to it. if map already has the baseCellId
   *  it calls the evaluate if execution completes succesfully updates the expr and ast
   *  of the given baseCellId or else Not.
   * 
   *  Using 2 objects Updates , Trial with its properties as results of the updated baseCellId 
   *  before and after calling Evaluate and returning the difference between them as
   *  the end result. Diff object is returned with the updated values.
   *  
   *  After calling the evalutate function if there are any dependants of the baseCellID
   *  evaluate is called on the dependants for updating the values of dependant nodes.
   * 
   *  for example a1 = 22, a2 = a1 * b1 if a1 or b1 changes evaluate is also again called 
   *  on  a2.
   */
  async eval(baseCellId, expr) {
    this.l2 = [];   // used for storing the operands along with operations
    this.baseCellId = baseCellId; 
    this.expr = expr; 
    this.results_map = new Map();
    this.set1 = new Set();
    // storing the values of the baseCellID's before updating.
    let updates = {};
    for (var i in this.trial){ updates[i] = this.trial[i]};
   // console.log("updates value", updates);
   // console.log("trial before change", this.trial);
   // this.trial = {};
    const ast_syntax = parse(expr, baseCellId);
   // console.log(inspect(ast_syntax, true, Infinity));
    
    /** 
     *  if the storing map does not have the baseCellId creating a new Object of CellInfo with its value as 0,
     *  dependant set as empty, ast as value stored in ast_syntax, expr and baseCellId. 
     * 
     *  if there exists a basecellId in the map already then just calling the eval method
     *  if it returns successfully then updating the AST and expr of the map values.
     */
    if(!this.cells_map.has(this.baseCellId)){
        let cellIdInfo = new CellInfo(this.baseCellId, this.expr, this.value, this.set1, ast_syntax);
        this.cells_map.set(this.baseCellId, cellIdInfo);
    }
    // console.log("in eval", this.cells_map);

    else if(this.cells_map.get(this.baseCellId).expr != ' ' && this.cells_map.get(this.baseCellId).expr !== this.expr){
      this.dependancy_check(ast_syntax);
    }
  
    this.evaluate(ast_syntax);
    this.cells_map.get(this.baseCellId).ast = ast_syntax;
    this.cells_map.get(this.baseCellId).expr = this.expr;
   // console.log("in eval", inspect(this.cells_map,false, Infinity));
    
    /**
     *  if the baseCellID already exists and has some dependants in its set calling the evaluate method
     *  on those with baseCellID as its value in set and the expression related to it.
     */
    if(this.cells_map.get(this.baseCellId).set.size > 0){
      for (let item of this.cells_map.get(this.baseCellId).set) {//console.log(item);
         //  console.log(this.cells_map.get(item).expr)
         //  console.log("started parsing of other expression");
           this.eval(item, this.cells_map.get(item).expr)};
      }

    /**
     * returns the values which are updated based on the difference between before and after values.
     * https://stackoverflow.com/questions/8572826/generic-deep-diff-between-two-objects
     */
    let diff = Object.keys(this.trial).reduce((diff, key) => {if (updates[key] === this.trial[key]) return diff 
    return { ...diff, [key]: this.trial[key] }}, {})
   // console.log("the main diff",diff);
   // console.log("trial", this.trial);
    return diff;
  }


  //@TODO add methods
   /**
    * This method parses the AST based on the type. 
    * if AST type == 'num' it updates the baseCellId value in the cells_map and returns back
    * 
    * if AST type == 'app' it recursively travers through the children and pushes the operands
    * along with operations into the list l2.
    * 
    * if AST type == 'ref' it gets the value of the ref cell Id on the right if present in the Map
    * or else sets the value of basecellId to 0. It also creates the entry of refcellId and its values 
    * and sets it into the map if not present in the map.
    * 
    * Also checks for the circular dependancy in type == 'ref' and type == 'app'. if basecellId == refcellId 
    * on the right side throws the error and also checks for the indirect circular dependancy by checking if 
    * refcellID is already in the dependants of baseCellId if so throws the error. for ex: a3 = a1 + a2, a3 
    * is in dependancy set of a1 if we give a1 = a3 + 1 throws an error as a3 is already in a1's set.
    * Also throws and error for type == 'app' and type == ref with direct dependancy.
    * @param ast  - AST of the given expression.
    */
    evaluate(ast){
    const type = ast.type;
    switch(type){
      case 'num':
        this.cells_map.get(this.baseCellId).value = ast.value;
       // console.log("set length", this.cells_map.get(this.baseCellId).set.size);
        this.trial[this.baseCellId] = ast.value;
        return ast.value;
      case 'app':
       //  console.log("in loop");
         const type = ast.type;
       //  console.log(ast.fn);
         this.l2.push(ast.fn);
         for(let i = 0; i < ast.kids.length; i++){
             if(ast.kids[i].type === 'num'){
            //   console.log(ast.kids[i].value);
               this.l2.push(ast.kids[i].value);
             //  console.log(this.l2);
             }
             else if(ast.kids[i].type === 'app'){
               this.evaluate(ast.kids[i]);
             }
            // console.log(this.l2);
            else if(ast.kids[i].type === 'ref'){
              //  console.log(ast.kids[i].toString(this.baseCellId));
                if(cellRefToCellId(ast.kids[i].toString(this.baseCellId)) !== this.baseCellId && 
                           !this.cells_map.get(this.baseCellId).set.has(cellRefToCellId(ast.kids[i].toString(this.baseCellId)))){
                if(this.cells_map.has(cellRefToCellId(ast.kids[i].toString(this.baseCellId)))){
                    this.l2.push(Number(this.cells_map.get(cellRefToCellId(ast.kids[i].toString(this.baseCellId))).value));
                    this.cells_map.get(cellRefToCellId(ast.kids[i].toString(this.baseCellId))).set.add(this.baseCellId);
                }
                else{
                  this.l2.push(0);
                  let s = new Set();
                  s.add(this.baseCellId);
                  let cellInfo = new CellInfo(cellRefToCellId(ast.kids[i].toString(this.baseCellId)), ' ', 0, s, null);
                  this.cells_map.set(cellRefToCellId(ast.kids[i].toString(this.baseCellId)), cellInfo);
                }
              }else{
                const msg = 'cyclic dependency ...';
                throw new AppError('CIRCULAR_REF', msg);
              }
            }
         }
       //  console.log(this.l2);
       //  console.log(this.l2.join(' '));
         let res = this.expression_evaluation(this.l2.join(' '));
       //  console.log("result",res);
         this.cells_map.get(this.baseCellId).value = res;
         this.trial[this.baseCellId] = res;
         break;
      case 'ref':
         if(this.baseCellId != cellRefToCellId(ast.toString(this.baseCellId)) && !this.cells_map.get(this.baseCellId).set.has(cellRefToCellId(ast.toString(this.baseCellId)))){
          // console.log(cellRefToCellId(ast.toString(this.baseCellId))); - cell with $
           if(this.cells_map.has(cellRefToCellId(ast.toString(this.baseCellId)))){
            //  console.log("in just ref");
             // console.log("cell ref value", cellRefToCellId(ast.toString(this.baseCellId)));
             // console.log(this.cells_map.get(this.baseCellId).value);
             // console.log(this.cells_map.get(cellRefToCellId(ast.toString(this.baseCellId))).value);
              this.cells_map.get(this.baseCellId).value = this.cells_map.get(cellRefToCellId(ast.toString(this.baseCellId))).value;
             // console.log(this.cells_map.get(this.baseCellId).value);
              this.cells_map.get(cellRefToCellId(ast.toString(this.baseCellId))).set.add(this.baseCellId);
           } 
           else{
            this.cells_map.get(this.baseCellId).value = 0;
            let s = new Set();
            s.add(this.baseCellId);
            let cellInfo = new CellInfo(cellRefToCellId(ast.toString(this.baseCellId)), ' ', 0, s, null);
            this.cells_map.set(cellRefToCellId(ast.toString(this.baseCellId)), cellInfo);
           // this.trial[cellRefToCellId(ast.toString(this.baseCellId))] = 0;
           } 
          }
          else{
            const msg = 'cyclic dependency ...';
            throw new AppError('CIRCULAR_REF', msg);
          }
          this.trial[this.baseCellId] = this.cells_map.get(this.baseCellId).value;
          break;       
  }
}

/**
 * this method parses the string expression which is given by the evaluate(ast) method and
 * returns the final value.
 * @param exprn  - expression formed by pushing the operands and operators into a list passed
 * as a string joined by a space.
 */
//https://www.geeksforgeeks.org/evaluation-prefix-expressions/
expression_evaluation(exprn){
    this.stack = [];
    this.op1 = 0;
    this.op2 = 0;
    exprn = exprn.split(' ');
    for(let i = exprn.length; i >= 0; i--){
        // console.log(exprn[i]);
        if(!isNaN(exprn[i])){
          this.stack.push(Number(exprn[i]))
         // console.log(this.stack);
        }
        else{
          if(exprn[i] === '+' || exprn[i] === '*' || exprn[i] === '/'){
                this.op1 = this.stack.pop();
                this.op2 = this.stack.pop();
          }
          if(exprn[i] == '-'){
               if(this.stack.length === 1){
                 this.op1 = (this.stack.pop());
                 this.op2 = null;
               }
               else{
                this.op1 = this.stack.pop();
                this.op2 = this.stack.pop();
               }
          }
          if(exprn[i] == '+'){ this.stack.push(FNS['+'](this.op1, this.op2));}
          if(exprn[i] == '-'){ this.stack.push(Number(FNS['-'](this.op1, this.op2)));}
          if(exprn[i] == '*'){ this.stack.push(FNS['*'](this.op1, this.op2));}
          if(exprn[i] == '/'){ this.stack.push(FNS['/'](this.op1, this.op2));}
        }      
    }
    return this.stack.pop();         
} 

/**
 * This method checks if the basecellID is already present in the map before calling the
 * eval method removes the dependancies of the previous expression related to it.
 * For example 
 * a1 = 22, a2 = a1 * b1, then if we give a2 = 5 or 1 + 6 or a3 + a4 it removes a2 from 
 * the dependancy list of a1 and b1 before parsing the new expression.
 * 
 * if previous expressions type == num just returns back.
 * 
 * if previous expressions type === app / ref removes the basecellId from the dependancies.
 * @param ast - New ast reference.
 */
dependancy_check(ast){
      // console.log(this.cells_map.get(this.baseCellId));
      // console.log(this.cells_map.get(this.baseCellId).expr);
       const ast1 = parseExpr(this.cells_map.get(this.baseCellId).expr, this.baseCellId);
      // console.log("in the dependancy loop", inspect(ast1,false, Infinity));
       if (ast1.type == 'num') {return;}
       if (ast1.type == 'app') {
            for(let i = 0; i < ast1.kids.length; i++){
                 if(ast1.kids[i].type == 'num') {continue;}
                 if(ast1.kids[i].type == 'app'){
                       this.dependancy_check(ast1.kids[i]);
                 }
                 if(ast1.kids[i].type == 'ref'){
                   //  console.log("dependants", cellRefToCellId(ast1.kids[i].toString(this.baseCellId)));
                   //  console.log(this.cells_map.get(cellRefToCellId(ast1.kids[i].toString(this.baseCellId))).set);
                     this.cells_map.get(cellRefToCellId(ast1.kids[i].toString(this.baseCellId))).set.delete(this.baseCellId);
                   //  console.log(this.cells_map.get(cellRefToCellId(ast1.kids[i].toString(this.baseCellId))).set);
                 }
             }
       }
       if (ast1.type == 'ref'){
      //  console.log("dependants", cellRefToCellId(ast1.toString(this.baseCellId)));
      //  console.log(this.cells_map.get(cellRefToCellId(ast1.toString(this.baseCellId))).set);
        this.cells_map.get(cellRefToCellId(ast1.toString(this.baseCellId))).set.delete(this.baseCellId);
      //  console.log(this.cells_map.get(cellRefToCellId(ast1.toString(this.baseCellId))).set);
       }
}

}


//Map fn property of Ast type === 'app' to corresponding function.
const FNS = {
  '+': (a, b) => a + b,
  '-': (a, b=null) => b === null ? -a : a - b,
  '*': (a, b) => a * b,
  '/': (a, b) => a / b,
  min: (...args) => Math.min(...args),
  max: (...args) => Math.max(...args),
}


//@TODO add other classes, functions, constants etc as needed
/**
 * CellInfo for storing the information related to cellId's.
 */
class CellInfo {
  constructor(id, expr, value, set, ast){
    this.id = id;
    this.expr = expr;
    this.value = value;
    this.set = set;
    this.ast = ast;
  }

  toString(){
     let str = ' ';
     str += this.id;
     str += this.expr;
     str += this.value;
     str += this.set;
     str += this.ast;
     return str;
  }
}

