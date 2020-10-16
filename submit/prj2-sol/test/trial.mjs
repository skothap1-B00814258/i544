import AppError from '../src/app-error.mjs';
import MemSpreadsheet from '../src/mem-spreadsheet.mjs';
import PersistentSpreadsheet from '../src/persistent-spreadsheet.mjs';

import chai from 'chai';
const { assert } = chai;

//spreadsheet being tested;
//could be instance of either MemSpreadsheet or PersistentSpreadsheet
let spreadsheet;

/** Tests fpr both in-memory and persistent spreadsheet */
function doCommonTests() {

  it ('must query a single number formula', async function () {
    await spreadsheet.eval('a1', '22');
    const results = await spreadsheet.query('a1');
    assert.deepEqual(results, { formula: '22', value: 22 });
  });

  it ('must query a purely numeric formula', async function () {
    await spreadsheet.eval('a1', '(1 + 2)*3 - 4');
    const results = await spreadsheet.query('a1');
    assert.deepEqual(results, { formula: '(1+2)*3-4', value: 5 });
  });

  it ('must query an empty cell as 0 with empty formula', async function () {
    const results = await spreadsheet.query('a1');
    assert.deepEqual(results, { value: 0, formula: '' });
  });

  it ('must evaluate a single number formula', async function () {
    const results = await spreadsheet.eval('a1', '22');
    assert.deepEqual(results, { a1: 22 });
  });

  it ('must evaluate a purely numeric formula', async function () {
    const results = await spreadsheet.eval('a1', '(1 + 2)*-3 + 4');
    assert.deepEqual(results, { a1: -5 });
  });

  it ('must evaluate a formula with a single reference', async function () {
    await spreadsheet.eval('a1', '22');
    const results = await spreadsheet.eval('a2', 'a1');
    assert.deepEqual(results, { a2: 22 });
  });

  it ('must evaluate a reference formula', async function () {
    await spreadsheet.eval('a1', '22');
    const results = await spreadsheet.eval('a2', 'a1 * a1 + a1');
    assert.deepEqual(results, { a2: 22*22 + 22 });
  });

  it ('must evaluate an empty cell as 0', async function () {
    await spreadsheet.eval('a1', '22');
    const results = await spreadsheet.eval('a2', '2*a1 + b1');
    assert.deepEqual(results, { a2: 44 });
  });

  it ('must cascade an update', async function () {
    await spreadsheet.eval('a1', '22');
    await spreadsheet.eval('a2', 'a1 * b1');
    const results = await spreadsheet.eval('b1', '3');
    assert.deepEqual(results, { b1: 3, a2: 66,  });
  });

  it ('must evaluate a multi-level formula', async function () {
    await spreadsheet.eval('a1', '22');
    await spreadsheet.eval('a2', 'a1 * b1');
    await spreadsheet.eval('b1', '3');
    const results = await spreadsheet.eval('a3', 'a1 + a2');
    assert.deepEqual(results, { a3: 88,  });
  });

  it ('must cascade an update through multiple levels', async function () {
    await spreadsheet.eval('a1', '22');
    await spreadsheet.eval('a2', 'a1 * b1');
    await spreadsheet.eval('b1', '3');
    await spreadsheet.eval('a3', 'a1 + a2');
    const results = await spreadsheet.eval('a1', '3');
    assert.deepEqual(results, { a1: 3, a2: 9, a3: 12,   });
  });

  it ('must detect a syntax error', async function() {
    //can't figure out how to assert.throws() for async fn
    //const fn = async () => await spreadsheet.eval('a1', '- + 1');
    //assert.throws(fn, /SYNTAX/);
    try {
      const v = JSON.stringify(await spreadsheet.eval('a1', '- + 1'));
      assert.fail(`expected SYNTAX error but got result ${v}`);
    }
    catch(err) {
      if (!(err instanceof AppError)) assert.fail(err.message);
      assert.equal(err.code, 'SYNTAX');
    }
  });
  
  it ('must detect a direct circular reference', async function() {
    try {
      const v = JSON.stringify(await spreadsheet.eval('a1', 'a1 + 1'));
      assert.fail(`expected CIRCULAR_REF error but got result ${v}`);
    }
    catch(err) {
      if (!(err instanceof AppError)) assert.fail(err.message);
      assert.equal(err.code, 'CIRCULAR_REF');
    }
  });

  it ('must detect an indirect circular reference', async function() {
    await spreadsheet.eval('a1', '22');
    await spreadsheet.eval('a2', 'a1 * b1');
    await spreadsheet.eval('b1', '3');
    await spreadsheet.eval('a3', 'b1 + a2');
    try {
      const v = JSON.stringify(await spreadsheet.eval('a1', 'a3 + 1'));
      assert.fail(`expected CIRCULAR_REF error but got result ${v}`);
    }
    catch(err) {
      if (!(err instanceof AppError)) assert.fail(err.message);
      assert.equal(err.code, 'CIRCULAR_REF');
    }
  });
  
  it ('must recover from an error', async function() {
    await spreadsheet.eval('a1', '22');
    await spreadsheet.eval('a2', 'a1 * b1');
    await spreadsheet.eval('b1', '3');
    await spreadsheet.eval('a3', 'a1 + a2');
    try { await spreadsheet.eval('a1', 'a3 + 1') } catch (e) { }
    const results = await spreadsheet.eval('a4', 'a1 + a3');
    assert.deepEqual(results, { a4: 110,  });
  });

}





