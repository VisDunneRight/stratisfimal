class Edge {
    constructor(leftTable, att1, rigthTable, att2){
        this.leftTable = leftTable;
        this.att1 = att1;
        this.leftAttribute = att1;
        this.rightTable = rigthTable;
        this.att2 = att2;
        this.rightAttribute = att2;
    }

    compareTo(otherEdge){
        if (otherEdge == undefined) return 1;
        let res = this.compareAttributes(this.leftTable, this.leftAttribute, otherEdge.leftTable, otherEdge.leftAttribute)
        if (res == 0){
            res = this.compareAttributes(this.rightTable, this.rightAttribute, otherEdge.leftTable, otherEdge.leftAttribute)
        }
        return res;
    }

    crosses(otherEdge){
        //console.log(otherEdge.leftAttribute.name, otherEdge.rightAttribute.name)

        if (this.compareTo(otherEdge)){
            //console.log(this.leftAttribute, otherEdge.leftAttribute)
            return true;
        }

        // add part for self edges?

        return false;
    }

    compareAttributes(t1, a1, t2, a2){
        if (t1.weight == t2.weight) return a1.weight < a2.weight
        else return t1.weight > t2.weight;
    }
}