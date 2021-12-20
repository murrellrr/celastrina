

class FooA {
	static get celastrinaType() {return "FooA";}
	constructor(){}
}
class FooB extends FooA {
	static get celastrinaType() {return "FooB";}
	constructor(){super();}
}
class FooC extends FooB {
	static get celastrinaType() {return "FooC";}
	constructor(){super();}
}

class Bar {
	static get celastrinaType() {return "Bar";}
	constructor(){}
}

function instanceOfObject(_class, _object) {
	if(((typeof _class === "undefined" || _class === null)) || ((typeof _object !== "object") || _object == null)) return false;
	let _otype = _object.constructor.celastrinaType;
	let _ctype = _class.celastrinaType;
	if((typeof _otype !== "string") || (typeof _ctype !== "string")) return false;
	let _target = _object.constructor;
	do {
		if(_otype === _ctype) return true;
		_target = _target.__proto__;
		_otype = _target.celastrinaType;
	} while(typeof _otype !== "undefined");
	return false;
}

console.log(instanceOfObject(FooA, new FooC()));
console.log(instanceOfObject(Bar, new FooC()));
