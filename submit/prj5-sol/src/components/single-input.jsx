//-*- mode: rjsx-mode;

import React from 'react';
import ReactDom from 'react-dom';

/** Component which displays a single input widget having the following
 *  props:
 *
 *    `id`:     The id associated with the <input> element.
 *    `value`:  An initial value for the widget (defaults to '').
 *    `label`:  The label displayed for the widget.
 *    `update`: A handler called with the `value` of the <input>
 *              widget whenever it is blurred or its containing
 *              form submitted.
 */
export default class SingleInput extends React.Component {

  constructor(props) {
    super(props);
    //@TODO
   // console.log(props.value);
    const val = this.props.value || '';
    this.state = {value: val || '', error:''};
  //  console.log(this.state);
    this.onChange = this.onChange.bind(this);
    this.onBlur = this.onSubmit.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
  }

  //@TODO
  /**
   * On the change of spreadsheet name in the input label the value is copied 
   * into the spname and the state value is changed to the entered spname.
   * @param {} event 
   */
  onChange(event){
     const spname = event.target.value;
     this.setState({value: spname});
  }
   
  /**
   * On submition of the entered spreadsheet name the app component method is called
   * with the value and if any error is thrown it catches the error
   * and sets the states error value to the error message thrown.
   * @param {*} event 
   */
  async onSubmit(event){
    try{
    event.preventDefault();
    await this.props.update(this.state.value);
   // this.setState({value : ''});
    }catch(err){
      this.err = err.message;
      this.setState({value: this.state.value, error: err.message});
    }
  }
 
  /**
   * renders the spreadsheet with the label and a input feild for a 
   * spreadsheet name to enter with onCHhange and onBlur events and also 
   * omSubmit for the form. And also a span tag with class error to 
   * display if any error message in the state.error.
   */
  render() {
    //@TODO
   // const {value} = this.state;
  // console.log(this.state);
  //  console.log(this.props.value);
    return (
     <form onSubmit = {this.onSubmit}> 
       <label htmlFor={this.props.id}>{this.props.label}</label>
       <input  id={this.props.id} value={this.state.value} onChange={this.onChange}
         onBlur={this.onBlur} key={this.props.id}></input><br/>
       <span className="error">{this.state.error}</span>
     </form> 
    );
  }

}
