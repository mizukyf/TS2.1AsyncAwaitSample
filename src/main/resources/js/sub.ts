
export class SubGreeter {
  constructor(public message : string) {}
  greet() : void {
    console.log(this.message + '!!');
  }
}
