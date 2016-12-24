import 'jasmine';
import {Greeter} from '../../main/es/main';

describe('Greeter#messageは',() => {
  it('コンストラクタの第1引数として指定された文字列を返す', () => {
    var g = new Greeter('hello');
    expect(g.message).toBe('hello');
  });
});
