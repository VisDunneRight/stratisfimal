class SimpleLp {
    constructor(graph){
        this.g = graph;
        this.verbose = false;
        this.model = {};
        this.forcedOrderList = [];
        this.mip = true;
        this.zcount = 0;
        this.m = 40;

        this.options = {
            crossings_reduction_weight: 1,
            crossings_reduction_active: true,
            bendiness_reduction_weight: 0.1,
            bendiness_reduction_active: false
        };
    }

    async arrange(){

        // TODO: temporary fix
        if (this.options.crossings_reduction_active == false && this.options.bendiness_reduction_active == false) return;

        let startTime = new Date().getTime()

        // build model from graph
        this.fillModel(this.model)

        if (this.model.minimize.length <= 10) {
            this.model.minimize = this.model.minimize.substring(0, this.model.minimize.length - 1)
            this.model.minimize += 'empty\n';
        }

        if (this.model.subjectTo.length <= 12) {
            this.model.subjectTo += 'empty = 1\n';
        }

        let prob = this.modelToString(this.model)
        this.modelString = prob;

        // solve
        this.result = {}
        let objective, i;

        if (this.verbose) glp_set_print_func(console.log);

        let lp = glp_create_prob();
        glp_read_lp_from_string(lp, null, prob);

        glp_scale_prob(lp, GLP_SF_AUTO);
            
        let smcp = new SMCP({presolve: GLP_ON});
        glp_simplex(lp, smcp);

        if (this.mip){
            glp_intopt(lp);
            objective = glp_mip_obj_val(lp);

            for(i = 1; i <= glp_get_num_cols(lp); i++){
                this.result[glp_get_col_name(lp, i)] = glp_mip_col_val(lp, i);
            }
        } else {
            objective = glp_get_obj_val(lp);
            for(i = 1; i <= glp_get_num_cols(lp); i++){
                this.result[glp_get_col_name(lp, i)] = glp_get_col_prim (lp, i);
            }
        }

        // console.log(this.result);
        // this.apply_solution(result)

        this.elapsedTime = new Date().getTime() - startTime 
    }

    fillModel(model){
        this.model.minimize = "Minimize \n"
        this.model.subjectTo = "Subject To \n"
        this.model.bounds = "\nBounds \n"

        this.crossing_vars = {};
        this.definitions = {};

        this.addForcedOrders();

        this.addTransitivity();

        this.addMultiRankGroupConstraints();

        this.addCrossingsToSubjectTo();
        this.addCrossingsToMinimize();

        if (this.options.bendiness_reduction_active){
            this.addBendinessReductionToSubjectTo();
            this.addBendinessReductionToMinimize();
        }

        this.model.minimize = this.model.minimize.substring(0, this.model.minimize.length - 2) + "\n\n"

        for (let elem in this.definitions){
            this.model.bounds += "binary " + elem + "\n"
        }
        for (let elem in this.crossing_vars){
            this.model.bounds += "binary " + elem + "\n"
        }
    }

    addBendinessReductionToMinimize(){
        for (let e of this.g.edges){
            if (this.isSameRankEdge(e)) continue;
            this.model.minimize +=  this.options.bendiness_reduction_weight + " bend_" + e.nodes[0].id + "_" + e.nodes[1].id + " + "
        }
        this.model.minimize = this.model.minimize.substring(0, this.model.minimize.length - 2) + "\n\n"
    }

    addCrossingsToMinimize(){
        for (let elem in this.crossing_vars){
            this.model.minimize += this.options.crossings_reduction_weight + " " + elem + " + "
        }
    }

    addCrossingsToSubjectTo(){
        for (let k = 0; k < this.g.nodeIndex.length; k++){
            let layerEdges = this.g.edges.filter(e => e.nodes[0].depth == k);

            // nlogn
            for (let i = 0; i < layerEdges.length; i++){
                let u1v1 = layerEdges[i];

                for (let j = i+1; j < layerEdges.length; j++){
                    let u2v2 = layerEdges[j];

                    let u1 = u1v1.nodes[0].id;
                    let v1 = u1v1.nodes[1].id;
                    let u2 = u2v2.nodes[0].id;
                    let v2 = u2v2.nodes[1].id;

                    if (u1 == u2 || v1 == v2) continue;

                    if (!this.isSameRankEdge(u1v1) && !this.isSameRankEdge(u2v2)){
                        let p1 = this.mkc(u1, v1, u2, v2);
                        let finalsum = 1 + this.mkxDict(" + ", u2, u1)[1] + this.mkxDict(" + ", v1, v2)[1]
                        this.model.subjectTo += p1 + "" + this.mkxDict(" + ", u2, u1)[0] + this.mkxDict(" + ", v1, v2)[0]
                        this.model.subjectTo += " >= " + finalsum + "\n"

                        p1 = this.mkc(u1, v1, u2, v2)
                        finalsum = 1 + this.mkxDict(" + ", u1, u2)[1] + this.mkxDict(" + ", v2, v1)[1]
                        this.model.subjectTo += p1 + "" + this.mkxDict(" + ", u1, u2)[0] + this.mkxDict(" + ", v2, v1)[0]
                        this.model.subjectTo += " >= " + finalsum + "\n"
                    } else if ((this.isSameRankEdge(u1v1) && !this.isSameRankEdge(u2v2)) || (!this.isSameRankEdge(u1v1) && this.isSameRankEdge(u2v2))){
                        let theSameRankEdge, theOtherEdge;
                        if (this.isSameRankEdge(u1v1)) {
                            theSameRankEdge = u1v1;
                            theOtherEdge = u2v2;
                        }
                        else {
                            theSameRankEdge = u2v2;
                            theOtherEdge = u1v1;
                        }

                        let su = theSameRankEdge.nodes[0];
                        let sv = theSameRankEdge.nodes[1];
                        let no = theOtherEdge.nodes[0];

                        let p1 = this.mkc(u1, v1, u2, v2)
                        let finalsum = 1 + this.mkxDict(" + ", no.id, su.id)[1] + this.mkxDict(" + ", sv.id, no.id)[1]
                        let tmp = p1 + "" + this.mkxDict(" + ", no.id, su.id)[0] + this.mkxDict(" + ", sv.id, no.id)[0]
                        tmp += " >= " + finalsum + "\n"
                        this.model.subjectTo += tmp;

                        finalsum = 1 + this.mkxDict(" + ", no.id, sv.id)[1] + this.mkxDict(" + ", su.id, no.id)[1]
                        tmp = p1 + "" + this.mkxDict(" + ", no.id, sv.id)[0] + this.mkxDict(" + ", su.id, no.id)[0]
                        tmp += " >= " + finalsum + "\n";
                        this.model.subjectTo += tmp;

                    } else if (this.isSameRankEdge(u1v1) && this.isSameRankEdge(u2v2)) {
                        let p1 = this.mkc(u1, v1, u2, v2)
                        let finalsum = 1 + this.mkxDict(" + ", u2, u1)[1] + this.mkxDict(" + ", v1, u2)[1] + this.mkxDict(" + ", v2, v1)[1]
                        this.model.subjectTo += p1 + "" + this.mkxDict(" + ", u2, u1)[0] + this.mkxDict(" + ", v1, u2)[0] + this.mkxDict(" + ", v2, v1)[0]
                        this.model.subjectTo += " >= " + finalsum + "\n"

                        finalsum = 1 + this.mkxDict(" + ", v2, u1)[1] + this.mkxDict(" + ", v1, v2)[1] + this.mkxDict(" + ", u2, v1)[1]
                        this.model.subjectTo += p1 + "" + this.mkxDict(" + ", v2, u1)[0] + this.mkxDict(" + ", v1, v2)[0] + this.mkxDict(" + ", u2, v1)[0]
                        this.model.subjectTo += " >= " + finalsum + "\n"

                        finalsum = 1 +                      this.mkxDict(" + ", u1, u2)[1] + this.mkxDict(" + ", v2, u1)[1] + this.mkxDict(" + ", v1, v2)[1]
                        this.model.subjectTo += p1 + "" +   this.mkxDict(" + ", u1, u2)[0] + this.mkxDict(" + ", v2, u1)[0] + this.mkxDict(" + ", v1, v2)[0]
                        this.model.subjectTo += " >= " + finalsum + "\n"

                        finalsum = 1 +                      this.mkxDict(" + ", v1, u2)[1] + this.mkxDict(" + ", v2, v1)[1] + this.mkxDict(" + ", u1, v2)[1]
                        this.model.subjectTo += p1 + "" +   this.mkxDict(" + ", v1, u2)[0] + this.mkxDict(" + ", v2, v1)[0] + this.mkxDict(" + ", u1, v2)[0]
                        this.model.subjectTo += " >= " + finalsum + "\n"

                        finalsum = 1 +                      this.mkxDict(" + ", u2, v1)[1] + this.mkxDict(" + ", u1, u2)[1] + this.mkxDict(" + ", v2, u1)[1]
                        this.model.subjectTo += p1 + "" +   this.mkxDict(" + ", u2, v1)[0] + this.mkxDict(" + ", u1, u2)[0] + this.mkxDict(" + ", v2, u1)[0]
                        this.model.subjectTo += " >= " + finalsum + "\n"

                        finalsum = 1 +                      this.mkxDict(" + ", v2, v1)[1] + this.mkxDict(" + ", u1, v2)[1] + this.mkxDict(" + ", u2, u1)[1]
                        this.model.subjectTo += p1 + "" +   this.mkxDict(" + ", v2, v1)[0] + this.mkxDict(" + ", u1, v2)[0] + this.mkxDict(" + ", u2, u1)[0]
                        this.model.subjectTo += " >= " + finalsum + "\n"

                        finalsum = 1 +                      this.mkxDict(" + ", v1, v2)[1] + this.mkxDict(" + ", u2, v1)[1] + this.mkxDict(" + ", u1, u2)[1]
                        this.model.subjectTo += p1 + "" +   this.mkxDict(" + ", v1, v2)[0] + this.mkxDict(" + ", u2, v1)[0] + this.mkxDict(" + ", u1, u2)[0]
                        this.model.subjectTo += " >= " + finalsum + "\n"

                        finalsum = 1 +                      this.mkxDict(" + ", u1, v2)[1] + this.mkxDict(" + ", u2, u1)[1] + this.mkxDict(" + ", v1, u2)[1]
                        this.model.subjectTo += p1 + "" +   this.mkxDict(" + ", u1, v2)[0] + this.mkxDict(" + ", u2, u1)[0] + this.mkxDict(" + ", v1, u2)[0]
                        this.model.subjectTo += " >= " + finalsum + "\n"
                    }
                }
            }
        }
    }

    addBendinessReductionToSubjectTo(){
        for (let e of this.g.edges){
            if (this.isSameRankEdge(e)) continue;

            this.model.subjectTo += 
                "y_" + e.nodes[0].id + " - " + 
                "y_" + e.nodes[1].id + " - " + 
                "bend_" + e.nodes[0].id + "_" + e.nodes[1].id +
                " <= 0\n"

            this.model.subjectTo += 
                "y_" + e.nodes[1].id + " - " + 
                "y_" + e.nodes[0].id + " - " + 
                "bend_" + e.nodes[0].id + "_" + e.nodes[1].id +
                " <= 0\n"
        }

        let distance = 1;

        for (let nodeCol of this.g.nodeIndex){
            for (let i = 0; i < nodeCol.length; i++){
                let n1 = nodeCol[i];
                for (let j = 0; j < nodeCol.length; j++){
                    if (i == j) continue;
                    let n2 = nodeCol[j];

                    let p = this.mkxBase(n2.id, n1.id)
                    if (this.definitions[p] != undefined){
                        this.definitions[p] = [];
                        this.model.subjectTo += "z_" + this.zcount + " - " + this.m + " " + p + " <= 0\n" 
                        this.model.subjectTo += "z_" + this.zcount + " - " + "y_" + n2.id + " <= 0\n"
                        this.model.subjectTo += "z_" + this.zcount + " >= 0\n"
                        this.model.subjectTo += "z_" + this.zcount + " - " + "y_" + n2.id + " - " + this.m + " " + p + " >= - " + this.m + "\n"  
                        this.model.subjectTo += "y_" + n1.id + " - " + "z_" + this.zcount + " - " + (distance) + " " + p + " >= 0\n"
                    } else {
                        p = this.mkxBase(n1.id, n2.id)
                        this.definitions[p] = [];
                        this.model.subjectTo += "z_" + this.zcount + " + " + this.m + " " + p + " <= " + this.m + "\n" 
                        this.model.subjectTo += "z_" + this.zcount + " - " + "y_" + n2.id + " <= 0\n"
                        this.model.subjectTo += "z_" + this.zcount + " >= 0\n"
                        this.model.subjectTo += "z_" + this.zcount + " - " + "y_" + n2.id + " + " + this.m + " " + p + " >= 0\n"
                        this.model.subjectTo += "y_" + n1.id + " - " + "z_" + this.zcount + " + " + (distance) + " " + p + " >= " + (distance) + "\n"
                    }

                    this.zcount += 1;
                }
            }
        }

        if (this.g.groups.length != 0){
            for (let group of this.g.groups){
                for (let node of group.nodes){
                    this.model.subjectTo += "y_" + node.id + " - ytop_" + group.id + " >= 0\n"
                    this.model.subjectTo += "y_" + node.id + " - ybottom_" + group.id + " >= 1\n" 
                }

                for (let node of this.g.nodes){
                    if (group.nodes.map(n => n.depth).includes(node.depth)){
                        this.model.subjectTo += "y_" + node.id + " - " + this.m + " z_" + this.zcount + " - ytop_" + group.id + " <= 0\n";
                        this.model.subjectTo += "- y_" + node.id + " + " + this.m + " z_" + this.zcount + " + ybottom_" + group.id + " <= " + this.m + "\n";

                        this.zcount += 1;
                    }
                }
            }
        }
    }

    addTransitivity(){

        let addGroupConstraint = (ingroup1, ingroup2, outgroup) => {
            this.model.subjectTo += ""
                + this.mkxDict(" + ", ingroup1, outgroup)[0]
                + this.mkxDict(" - ", ingroup2, outgroup)[0]
                + " = " + (this.mkxDict(" + ", ingroup1, outgroup)[1] - this.mkxDict(" - ", ingroup2, outgroup)[1]) + "\n"
        }

        for (let k=0; k < this.g.nodeIndex.length; k++){
            let layerNodes = this.g.nodeIndex[k];

            for (let i=0; i<layerNodes.length; i++){
                let u1 = layerNodes[i].id;

                for (let j = i+1; j < layerNodes.length; j++){
                    let u2 = layerNodes[j].id;

                    for (let m = j + 1; m < layerNodes.length; m++){
                        let u3 = layerNodes[m].id;

                        // groups
                        if (this.g.groups.find(g => g.nodes.find(n => n.id == u1) && g.nodes.find(n => n.id == u2) && !g.nodes.find(n => n.id == u3))){
                            addGroupConstraint(u1, u2, u3)
                        } else if (this.g.groups.find(g => g.nodes.find(n => n.id == u1) && g.nodes.find(n => n.id == u3) && !g.nodes.find(n => n.id == u2))) {
                            addGroupConstraint(u1, u3, u2)
                        } else if (this.g.groups.find(g => g.nodes.find(n => n.id == u2) && g.nodes.find(n => n.id == u3) && !g.nodes.find(n => n.id == u1))) {
                            addGroupConstraint(u2, u3, u1)
                        } else {
                            // no groups
                            let finalsum = this.mkxDict(" + ", u1, u2)[1] + this.mkxDict(" + ", u2, u3)[1] - this.mkxDict(" - ", u1, u3)[1]
                            this.model.subjectTo += ""
                                + this.mkxDict(" + ", u1, u2)[0]
                                + this.mkxDict(" + ", u2, u3)[0]
                                + this.mkxDict(" - ", u1, u3)[0]
                                + " >= " + finalsum + "\n"
    
                            finalsum = - this.mkxDict(" - ", u1, u2)[1] - this.mkxDict(" - ", u2, u3)[1] + this.mkxDict(" + ", u1, u3)[1]
                            this.model.subjectTo += ""
                                + this.mkxDict(" - ", u1, u2)[0]
                                + this.mkxDict(" - ", u2, u3)[0]
                                + this.mkxDict(" + ", u1, u3)[0]
                                + " >= " + (- 1 + finalsum) + "\n"
                        }
                    }
                }
            }
        }
    }

    addMultiRankGroupConstraints(){
        for (let group of this.g.groups){
            // does this group span across more than 1 rank?
            if (new Set(group.nodes.map(n => n.depth)).size == 1) continue;

            let minRankInGroup = Math.min.apply(0, group.nodes.map(n => n.depth))
            let maxRankInGroup = Math.max.apply(0, group.nodes.map(n => n.depth))

            for (let r1 = minRankInGroup; r1 <= maxRankInGroup; r1++){
                for (let r2 = r1+1; r2 <= maxRankInGroup; r2++){
                    let nodesInGroupInR1 = group.nodes.filter(n => n.depth == r1);
                    let nodesNotInGroupInR1 = this.g.nodeIndex[r1].filter(n => !group.nodes.includes(n));

                    let nodesInGroupInR2 = group.nodes.filter(n => n.depth == r2);
                    let nodesNotInGroupInR2 = this.g.nodeIndex[r2].filter(n => !group.nodes.includes(n));

                    let tmp = ""
                    let finalsum = 0;
                    for (let n1 of nodesInGroupInR1){
                        for (let n2 of nodesNotInGroupInR1){
                            tmp += this.mkxDict(" + ", n1.id, n2.id)[0]
                            finalsum += this.mkxDict(" + ", n1.id, n2.id)[1]
                        }
                    } 
                    for (let n1 of nodesInGroupInR2){
                        for (let n2 of nodesNotInGroupInR2){
                            tmp += this.mkxDict(" - ", n1.id, n2.id)[0]
                            finalsum -= this.mkxDict(" + ", n1.id, n2.id)[1]
                        }
                    }
                    tmp += " = " + finalsum + "\n"
                    this.model.subjectTo += tmp;
                }
            }
        }
    }

    addForcedOrders(){
        for (let o of this.forcedOrderList){
            this.model.subjectTo += this.mkxDict(" + ", o[0].id, o[1].id)[0].slice(3) + " = 1\n"
        }
    }

    apply_solution(){
        for (let i=0; i<this.g.nodeIndex.length; i++){
            let layerNodes = this.g.nodeIndex[i];

            layerNodes.sort((a, b) => {
                if (this.result["x_" + a.id + "_" + b.id] == 0) return 1;
                else if (this.result["x_" + a.id + "_" + b.id] == 1) return -1;
                else if (this.result["x_" + b.id + "_" + a.id] == 1) return 1;
                else if (this.result["x_" + b.id + "_" + a.id] == 0) return -1;
            })
        }

        // **********
        // bendiness
        // **********
        if (this.options.bendiness_reduction_active){
            console.log(this.result)
            for (let node of this.g.nodes){
                let val = this.result["y_" + node.id]                
                node.y = val;
            }
        }
    }

    // *****
    // *****
    // util
    // *****
    // *****
    isSameRankEdge(edge){
        return edge.nodes[0].depth == edge.nodes[1].depth
    }

    modelToString(){
        return this.model.minimize + this.model.subjectTo + this.model.bounds + '\nEnd\n'
    }

    forceOrder(n1, n2){
        this.forcedOrderList.push([n1, n2]);
    }

    // *****
    // *****
    // variable definitions\
    // *****
    // *****
    mkc(u1, v1, u2, v2){
        let res = "c_" + u1 + v1 + "_" + u2 + v2;
        this.crossing_vars[res] = ""
        return res
    }

    mkxBase(u1, u2, pre=""){
        return "x_" + pre + u1 + "_" + pre + u2
    }

    mkxDict (sign, u1, u2, mult = 1) {
        let res = ""
        let accumulator = 0

        let oppsign = " - "
        if (sign == " - ") oppsign = " + "

        if (this.definitions[this.mkxBase(u1, u2)] == undefined && this.definitions[this.mkxBase(u2, u1)] == undefined){
            this.definitions[this.mkxBase(u1, u2)] = '';
        }

        let p = this.mkxBase(u1, u2)
        if (this.definitions[p] != undefined){
            if (mult != 1) res += sign + mult + " " + p
            else res += sign + "" + p 
        } else {
            p = this.mkxBase(u2, u1)
            // if (this.definitions[p] == undefined) console.warn(p + " not yet in dict");
            accumulator -= 1;
            if (mult != 1) res += oppsign + mult + " " + p;
            else res += oppsign + "" + p;
        }

        return [res, accumulator * mult];
    }
}