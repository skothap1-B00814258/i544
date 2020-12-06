//-*- mode: rjsx-mode;

import {indexToRowSpec, indexToColSpec} from 'cs544-ss';
import popupMenu from '../lib/menu.jsx';
import SingleInput from './single-input.jsx';

import React from 'react';
import ReactDom from 'react-dom';


/************************ Spreadsheet Component ************************/

const [ N_ROWS, N_COLS ] = [ 10, 10 ];
const ROW_HDRS = Array.from({length: N_ROWS}).map((_, i) => indexToRowSpec(i));
const COL_HDRS = Array.from({length: N_COLS}).
  map((_, i) => indexToColSpec(i).toUpperCase());

export default class Spreadsheet extends React.Component {

  constructor(props) {
    super(props);
    this.state = {cellId : '', count:0, copyCellId: '', error: ''};
    this.onFocus = this.onFocus.bind(this);
    this.onBlur = this.onBlur.bind(this);
    this.update = this.update.bind(this);
   // this.clear = this.clear.bind(this);
    this.onContextMenu = this.onContextMenu.bind(this);
    this.handlerMenu = this.handlerMenu.bind(this);
    this.counter = this.counter.bind(this);
    //@TODO
  }

  //@TOD

  /**
   * This method is used for re-rendering the spreadsheet component
   * if the prevState count not equal to the current state count.
   * @param {*} prevProps - previous Props
   * @param {*} prevState - previous state
   */
  componentDidUpdate(prevProps, prevState){
    // console.log(prevProps);
    // console.log(prevProps.spreadsheet._cells);
    // console.log(Object.keys(prevProps.spreadsheet._cells).length);
    // console.log(Object.keys(this.props.spreadsheet._cells).length);
     if(prevState.count  !== this.state.count){
           console.log("component updated");
    }
  }

  /**
   * For changing the count value whenever the data in the spreadsheet gets
   * updated.
   */
  counter(){
    this.setState({count : this.state.count + 1});
  }

  /**
   * This method is called for the Single Input Label for cellID with the formula 
   * such that the focused cell along with the formula entered into the for calling
   * the eval method on the spreadsheet props.
   * @param {*} formula - formula value entered into the Input field with cellID
   */
  async update(formula){
     console.log(formula);
     console.log(this.state.cellId);
     const res = await this.props.spreadsheet.eval(this.state.cellId, formula, this.props.spreadsheet._store);
     console.log(res);
     //this.setState({count: this.state.count + 1});
     this.counter();
  }

  /**
   * This method sets the class back to empty string for the cell which is focused currently.
   * @param {*} event 
   */
  onBlur(event){
     event.preventDefault();
     const target = event.target;
     target.setAttribute("class", "");
  }

  /**
   * This event takes the focus cell id using getAttribute method on the target
   * and sets the class value to "focused" and sets the cellId value in the state
   * to the focused cell Id.
   * @param {*} event 
   */
  onFocus(event){
      event.preventDefault();
      const target = event.target;
     // console.log(event.target.value);
      console.log(target);
      console.log(target.getAttribute("data-cellId"));
      const cell = target.getAttribute("data-cellId");
   //   console.log(cell);
      target.setAttribute("class", "focused");
    //  this.setState({cellId : event.taget.data-cellId});
      const res = this.props.spreadsheet.query(cell);
      this.setState({cellId: cell});
     // console.log(this.state);
  }
 
  /**
   * This event is used for calling the clear on the entire spreadsheet by 
   * right clicking on the spname on the table. fat-arrow function for calling
   * the clear method of the spreadsheet instance and sending the menuItems list 
   * of menuObjects to the popMenu function and changes the state counter to 1 for
   * re-rendering the spreadsheet. this is set for the onCOntextMenu on
   * spname while rendering the spreadsheet table.
   * @param {*} event 
   */
  async onContextMenu(event){
     event.preventDefault();
    // await this.props.spreadsheet.clear();
     const clearspreadsheet = async () => {await this.props.spreadsheet.clear()};
     const obj = { menuItems : [{menuLabel: 'clear', menuItemFn() {clearspreadsheet()}, menuItemFnArgs: []}]};
     popupMenu(event, obj);
    // this.setState({count: this.state.count + 1});
     this.counter();
    }

  /**
   * This handler is for pop-up menu of copy, paste and delete functions on a cellID.
   * if the cell value is empty and the copycellId is also empty then the popUpMenu 
   * is called with copy & delete functions and paste as invalid, if the cell value is
   * empty and copycellId is valid then it calls the popUpMenu with only paste as ena-
   * -bled. else if the cell contains value it calls with all the 3 functions as 
   * enabled else just for the empty cells all the 3 options are disabled.
   * @param {*} event 
   */
  async handlerMenu(event){
      try {
       event.preventDefault();
       const id = event.target.getAttribute("data-cellId");
       console.log(event.target.innerText);
       if(event.target.innerText !== ''){
         if(this.state.copyCellId === ''){
          const copy = () => {this.setState({copyCellId: event.target.getAttribute("data-cellId")})};
          console.log(this.state);
          const deleteCell = async () => {await this.props.spreadsheet.delete(id)};
          const obj = { menuItems : [{menuLabel: 'Copy ' + id.toUpperCase(), menuItemFn() {copy()}, menuItemFnArgs: []},
                                  {menuLabel: 'Delete ' + id.toUpperCase(), menuItemFn() {deleteCell()}, menuItemFnArgs: [id]},
                                  {menuLabel: 'Paste'}]};
          popupMenu(event, obj);
          this.counter();
       }
       else{
          const src = this.state.copyCellId;
          const copy = () => {this.setState({copyCellId: event.target.getAttribute("data-cellId")})};
          const deleteCell = async () => {await this.props.spreadsheet.delete(id)};
          const pasteCell = async () => {await this.props.spreadsheet.copy(id, src);}
          const obj = { menuItems : [{menuLabel: 'Copy ' + id.toUpperCase(), menuItemFn() {copy()}, menuItemFnArgs: []},
                                  {menuLabel: 'Delete ' + id.toUpperCase(), menuItemFn() {deleteCell()}, menuItemFnArgs: [id]},
                                  {menuLabel: 'Paste ' + src.toUpperCase() + ' to ' + id.toUpperCase(),
                                   menuItemFn() {pasteCell()}, menuItemFnArgs: [id, src]}]};
          popupMenu(event, obj);
        //  this.setState({count: this.state.count + 1});
          this.counter();
       }
      }
       else{
         if(this.state.copyCellId === ''){
          const obj = { menuItems : [{menuLabel: 'copy'},
          {menuLabel: 'delete'},
          {menuLabel: 'paste'}]};
          popupMenu(event, obj);
         }
         else{
          const src = this.state.copyCellId;
          const pasteCell = async () => {await this.props.spreadsheet.copy(id, src);}
          const obj = { menuItems : [{menuLabel: 'copy'},
          {menuLabel: 'delete'},
          {menuLabel: 'Paste ' + src.toUpperCase() + ' to ' + id.toUpperCase(),
                                   menuItemFn() {pasteCell()}, menuItemFnArgs: [id, src]}]};
          popupMenu(event, obj);
         // this.setState({count: this.state.count + 1});
          this.counter();
         }
       }
      }catch(err){
        console.log(err);
        this.setState({error: err.message});
      }
  }

  /**
   * This method is for creating table for spreadsheet based on the dump
   * result. It just enters the values into 10x10 array and then creates
   * one more array by calling SScell and storing its returned value on
   * each value in the array. Returns a table format for displaying in 
   * the spreadsheet. The necessary props for SSCell are passed by using
   * query method on the props.spreadsheet instance.
   * @param {*} rows - no of rows of table
   * @param {*} columns  - no of columns of table
   */
  table_view(rows,columns){
         // console.log("in this function");
   const darray = this.props.spreadsheet.dump();
   let array_ss = [];
   let trial = [];
   const map1 = {a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9, j: 10, k: 11,
     l: 12, m: 13, n: 14,o: 15, p: 16, q: 17, r: 18, s: 19, t: 20,
     u: 21, v: 22, w: 23, x: 24, y: 25, z: 26
    }

   for(let i = 0; i <= rows; i++){
     array_ss.push(['']);
     for(let j = 0; j <= columns; j++){
             array_ss[i][j] = '';
     }
   }

   for(let i = 0; i <= rows; i++){
    trial.push(['']);
    for(let j = 0; j <= columns; j++){
            trial[i][j] = '';
    }
  }
   // console.log(array_ss);
   // console.log(darray);
   const obj = Object.fromEntries(darray);
   // console.log(obj);
   for (let i in obj){
     // const s = i.split('');
      const result = this.props.spreadsheet.query(i);
     // console.log(value);
     // console.log(s[0], s[1]);
      array_ss[parseInt(i.substring(1, i.length))][map1[i[0]]] = result.value;
   }
   array_ss[0][0] = this.props.spreadsheet.name;
   for (let i = 1; i <= columns; i++){
        array_ss[0][i] = String.fromCharCode(97 + i-1);
   }
 
   for(let i = 1; i <= rows; i++){
       array_ss[i][0] = i;
   }
   console.log(array_ss);
   for(let i=1; i <= rows; i ++){
      for(let j = 1; j <=columns; j++){
        const cellId = this.props.spreadsheet.query(String.fromCharCode(97 + i-1) + j);
       // console.log(cellId.value, cellId.formula, String.fromCharCode(97 + i-1), j, array_ss[j][i]);
        const cell = String.fromCharCode(97 + i-1) + j;
        const index = j;
        const t = SSCell({onContextMenu:this.handlerMenu, cellId: cell, onFocus: this.onFocus, onBlur: this.onBlur, className: '', value: array_ss[j][i], formula: cellId.formula, tabIndex:index});
       // console.log(t);
        trial[j][i] = t;
       // console.log(t);
      }
   }
  // trial[0] = array_ss[0].map((e, index) => <th key={e}>{e}</th>)
   delete trial[0];
   console.log(trial);
   //return array_ss;
  return trial.map((row, index) => {
     return (
         <tr key={index }>
           <th>{index}</th>
           {row}
         </tr>
     );
   });  
  }

  /**
   * renders the spreadhsheet with table, single Input label for
   * formula with cellId and its value as formula and another 
   * Input field with the spreadsheet name. headers for displaying
   * the column headers.
   */
  render() {
   // return '';
    //@TODO
    const {cellId} = this.state;
    console.log(cellId);
    console.log(this.state);
    const formula = this.props.spreadsheet.query(cellId).formula;
    console.log(formula);
    let headers = [];
    headers.push(<th key={name} onContextMenu={this.onContextMenu}>{this.props.spreadsheet.name}</th>);
    COL_HDRS.map((e, index)=>headers.push(<th key={index}>{e}</th>))
   // headers = COL_HDRS.map((e, index) => <th key={index}>{e}</th>)
    const columns = ROW_HDRS.map((e, index) => <th key={index}>{e}</th>)
    const tt = this.table_view(10, 10, this.props);
  //  console.log(tt);
    return (
      <div>
      <SingleInput id={this.state.cellId} label={cellId.toUpperCase()} value={formula} update={this.update} key={this.state.cellId}/>
      <table className="ss">
        <tbody>
          <tr>{headers}</tr>
          {tt}
          </tbody>
      </table>
      <span className="error">{this.state.error}</span>
      </div>
    );
  }

}

function SSCell(props) {
  const { cellId, formula, value, onContextMenu, onFocus,
          className, tabIndex, onBlur } = props;
  return (
    <td onContextMenu={onContextMenu}
        data-cellid={cellId}
        onFocus={onFocus}
        className={className}
        tabIndex={tabIndex}
        title={formula ?? ''}
        key = {cellId}
        onBlur = {onBlur}>
      {value ?? ''}
    </td>
  );
}




