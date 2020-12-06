//-*- mode: rjsx-mode;

import SingleInput from './single-input.jsx';
import {Spreadsheet} from 'cs544-ss';
import SS from './spreadsheet.jsx';

import React from 'react';
import ReactDom from 'react-dom';


/*************************** App Component ***************************/

const STORE = window.localStorage;

export default class App extends React.Component {

  constructor(props) {
    super(props);
    this.update = this.update.bind(this);
   // this.ssClient = props.ssClient;
    this.state = {
      ssName: '',
      spreadsheet: null,
    };
  }


  componentDidCatch(error, info) {
    console.error(error, info);
  }

  /**
   * This method validates the passed spreadsheetname and if it is empty or
   * has characters other than _/characters throws an error else changes the 
   * state spname to the passed spreadsheet name and creates a spreadsheet instance
   * by passing the this.props.ssClient and the spname which is used for
   * calling the spreadsheet component with spreadsheet instance as its props.
   * @param {*} ssName  - spreadsheet name
   */
  async update(ssName) {
    //@TODO
    if(ssName === undefined || ssName === null || (typeof ssName === "string" &&
       ssName.trim().length === 0)){
           throw new Error('The ssName field must be specified');
       }
    else if(ssName.match(/^[\w\- ]+$/) === null){
      throw new Error(`Bad spreadsheet name "${ssName}": must contain only alphanumeric
      characters, underscore, hyphen or space.`);
    }
    else{
       const spname = ssName;
      // console.log("try",spname);
       this.setState({ssName: spname});
     //  console.log("spname", this.state.ssName);
     //  console.log("ssclient",this.props.ssClient);
       const ss = await Spreadsheet.make(spname, this.props.ssClient);
     //  console.log("ss", ss);
       this.setState({spreadsheet: ss}); 
       console.log(this.state);
    }
  }

  /**
   * renders the single input component with below id, label,
   * update set to the update function above and also a key
   * set to the spname such that react identifies the input 
   * element as unique for every render. 
   */
  render() {
   // console.log(ssName, spreadsheet);
    const { ssName, spreadsheet } = this.state;
   // console.log(ssName, spreadsheet);
    const ss =
      (spreadsheet) ?  <SS spreadsheet={spreadsheet}/> : '';
    return (
      <div>
        <SingleInput id="ssName" label="Open Spreadsheet Name"
                     value={ssName} update={this.update} key={ssName}/>
        {ss}
     </div>
     );
  }

}
