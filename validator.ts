export class Validator<T> {
    private keys: [string, string][] = [];
    private proto: any;
    
    constructor(example: T) {
      Object.keys(example).forEach((key) => {
          //@ts-ignore
        this.keys.push([key, typeof example[key]]);

        //@ts-ignore
        this.proto = example.__proto__;
      });
    }
  
    valid(object: any): T {
      if (
        this.keys.every(([key, type]) => typeof object[key] === type)
      ) {
        object.__proto__ = this.proto;
        return object as T;
      } else {
        throw "Invalid Format";
      }
    }
  
    validList(objects: any): T[] {
        
      if (
          objects.every &&
          objects.every((object:any)=>this.keys.every(([key, type]) => typeof object[key] === type))
      ) {
        return objects.forEach((object:any) => {
          object.__proto__ = this.proto;
        }) as T[];
      } else {
        throw "Invalid Format";
      }
    }
  }
  