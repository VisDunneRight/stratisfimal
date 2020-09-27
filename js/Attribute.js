class Attribute {
    constructor(table, name){
        this.table = table;
        this.name = name;
        this.attr = name;
        this.weight = 0;
        this.diffEdges = 0;
        this.randomEdges = 0;
        this.sameEdges = 0;
        this.mutable = true;
        this.id = name;
    }

    compareTo(arg0){
        if (this.weight > arg0.weight) return -1;
        else if (this.weight < arg0.weight) return 1;
        else return 0;
    }
}