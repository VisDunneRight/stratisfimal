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
        if (this.leftTable == otherEdge.leftTable){
            // edges have the same left table
            if (this.rightTable == otherEdge.rightTable){
                // and the same right table
                if (this.leftAttribute.weight > otherEdge.leftAttribute.weight && this.rightAttribute.weight < otherEdge.rightAttribute.weight)
                    return true;
                else if (this.leftAttribute.weight < otherEdge.leftAttribute.weight && this.rightAttribute.weight > otherEdge.rightAttribute.weight)
                    return true;
            } else if (this.rightTable.weight < otherEdge.rightTable.weight && this.leftAttribute.weight > otherEdge.leftAttribute.weight)
                // right table is under but left attribute is over
                return true;
            else if (this.rightTable.weight > otherEdge.rightTable.weight && this.leftAttribute.weight < otherEdge.leftAttribute.weight)
                // right table is over but left attribute is under
                return true;
        } else if (this.rightTable == otherEdge.rightTable){
            // edges have the same right table
            if (this.leftTable == otherEdge.leftTable){
                // and the same left table
                if (this.leftAttribute.weight > otherEdge.leftAttribute.weight && this.rightAttribute.weight < otherEdge.rightAttribute.weight)
                    return true;
                else if (this.leftAttribute.weight < otherEdge.leftAttribute.weight && this.rightAttribute.weight > otherEdge.rightAttribute.weight)
                    return true;
            } else if (this.leftTable.weight < otherEdge.leftTable.weight && this.rightAttribute.weight > otherEdge.rightAttribute.weight)
                // left table is under but right attribute is over
                return true;
            else if (this.leftTable.weight > otherEdge.leftTable.weight && this.rightAttribute.weight < otherEdge.rightAttribute.weight)
                // left table is over but right attribute is under
                return true;
        } else {
            // edges have different tables both on the left and on the right
            if (this.leftTable.weight < otherEdge.leftTable.weight && this.rightTable.weight > otherEdge.rightTable.weight)
                return true
            else if (this.leftTable.weight > otherEdge.leftTable.weight && this.rightTable.weight < otherEdge.rightTable.weight){
                return true
            }
        }

        return false;
    }

    crosses(otherEdge){

        // change this, it's for self edges
        if (this.leftTable.depth == this.rightTable.depth || otherEdge.leftTable.depth == otherEdge.rightTable.depth) return false

        if (this.compareTo(otherEdge)){
            return true;
        }

        return false;
    }

}