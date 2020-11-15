class SimpleLp {
    constructor(graph){
        this.g = graph;
        this.verbose = false;
        this.model = {};
        this.forcedOrderList = [];

        this.options = {
            crossings_reduction_weight: 1
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

        // console.log(result);
        // this.apply_solution(result)

        this.elapsedTime = new Date().getTime() - startTime 
    }

    fillModel(model){
        this.model.minimize = "Minimize \n"
        this.model.subjectTo = "Subject To \n"
        this.model.bounds = "\nBounds \n"

        this.crossing_vars = {};
        this.definitions = {};

        this.addTransitivity();

        this.addCrossingsToSubjectTo();
        this.addCrossingsToMinimize();

        this.addForcedOrders();

        this.model.minimize = this.model.minimize.substring(0, this.model.minimize.length - 2) + "\n\n"

        for (let elem in this.definitions){
            this.model.bounds += "binary " + elem + "\n"
        }
        for (let elem in this.crossing_vars){
            this.model.bounds += "binary " + elem + "\n"
        }
    }

    addCrossingsToMinimize(){
        for (let elem in this.crossing_vars){
            this.model.minimize += this.options.crossings_reduction_weight + " " + elem + " + "
        }
    }

    addCrossingsToSubjectTo(){
        for (let k = 0; k < this.g.nodeIndex.length - 1; k++){
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

                    if (!this.isSameRankEdge(u1v1) && !this.isSameRankEdge(u2v2)){
                        let p1 = this.mkc(u1, v1, u2, v2);
                        let finalsum = 1 + this.mkxDict(" + ", u2, u1)[1] + this.mkxDict(" + ", v1, v2)[1]
                        this.model.subjectTo += p1 + "" + this.mkxDict(" + ", u2, u1)[0] + this.mkxDict(" + ", v1, v2)[0]
                        this.model.subjectTo += " >= " + finalsum + "\n"

                        p1 = this.mkc(u1, v1, u2, v2)
                        finalsum = 1 + this.mkxDict(" + ", u1, u2)[1] + this.mkxDict(" + ", v2, v1)[1]
                        this.model.subjectTo += p1 + "" + this.mkxDict(" + ", u1, u2)[0] + this.mkxDict(" + ", v2, v1)[0]
                        this.model.subjectTo += " >= " + finalsum + "\n"
                    }
                }
            }
        }
    }

    addTransitivity(){
        for (let k=0; k < this.g.nodeIndex.length; k++){
            let layerNodes = this.g.nodeIndex[k];

            for (let i=0; i<layerNodes.length; i++){
                let u1 = layerNodes[i].id;

                for (let j = i+1; j < layerNodes.length; j++){
                    let u2 = layerNodes[j].id;

                    for (let m = j + 1; m < layerNodes.length; m++){
                        let u3 = layerNodes[m].id;

                        this.model.subjectTo += ""
                            + this.mkxBase(u1, u2)
                            + " + " + this.mkxBase(u2, u3)
                            + " - " + this.mkxBase(u1, u3)
                            + " >= 0\n"

                        this.model.subjectTo += ""
                            + "- " + this.mkxBase(u1, u2)
                            + " - " + this.mkxBase(u2, u3)
                            + " + " + this.mkxBase(u1, u3)
                            + " >= -1\n"
                    }
                }
            }
        }
    }

    addForcedOrders(){
        for (let o of this.forcedOrderList){
            this.model.subjectTo += this.mkxDict(" + ", o[0].id, o[1].id)[0] + " = " + this.mkxDict(" + ", o[0].id, o[1].id)[1] + "\n"
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
    // variable definitions
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

    mkxDict (sign, u1, u2) {
        let res = ""
        let accumulator = 0

        let oppsign = " - "
        if (sign == " - ") oppsign = " + "

        if (this.definitions[this.mkxBase(u1, u2)] == undefined && this.definitions[this.mkxBase(u2, u1)] == undefined){
            this.definitions[this.mkxBase(u1, u2)] = '';
        }

        let p = this.mkxBase(u1, u2)
        if (this.definitions[p] != undefined){
            res += sign + p
        } else {
            p = this.mkxBase(u2, u1)
            // if (this.definitions[p] == undefined) console.warn(p + " not yet in dict");
            accumulator -= 1;
            res += oppsign + p;
        }

        return [res, accumulator];
    }
}