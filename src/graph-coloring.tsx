import "./graph-coloring.css"
import {ChangeEvent, Component, createRef, RefObject} from "react";
import {GraphCanvas, GraphCanvasRef, GraphEdge, GraphNode, lightTheme} from "reagraph";
import AustraliaGraph from "./assets/australia-graph.json";
import {Button, TextField, Typography} from "@mui/material";
import {canvasTheme, graphColors} from "./utils/const";
import * as domain from "domain";

declare type NodeColor = string | undefined;

interface GraphColoringProps {
}

interface GraphColoringState {
    nodes: GraphNode[];
    edges: GraphEdge[];
    animationSpeed: number;
}

class BackjumpingEvaluation {
    isGraphValid: boolean;
    conflictSet: Set<number>;


    constructor(isGraphValid: boolean, conflictSet: Set<number> = new Set()) {
        this.isGraphValid = isGraphValid;
        this.conflictSet = conflictSet;
    }
}

class GraphColoring extends Component<GraphColoringProps, GraphColoringState> {
    readonly canvasRef: RefObject<GraphCanvasRef>;
    nodeCnt: number;
    nodeIds: string[];
    adjacencyMatrix: boolean[][];
    domain: Map<number, string[]>;

    constructor(props: GraphColoringProps) {
        super(props);
        this.state = {
            ...AustraliaGraph,
            animationSpeed: 500,
        };
        this.canvasRef = createRef();

        this.nodeCnt = AustraliaGraph.nodes.length;
        this.nodeIds = Array.from(AustraliaGraph.nodes).sort((a, b) => a.evaluationOrder - b.evaluationOrder).map(n => n.id);
        this.adjacencyMatrix = Array(this.nodeCnt).fill(undefined).map(() => Array(this.nodeCnt).fill(false));
        for (const edge of AustraliaGraph.edges) {
            const sourceIndex = this.nodeIds.indexOf(edge.source);
            const targetIndex = this.nodeIds.indexOf(edge.target);
            this.adjacencyMatrix[sourceIndex][targetIndex] = true;
        }
        this.domain = new Map();
        for (let i = 0; i < this.nodeCnt; i++) {
            this.domain.set(i, Array.from(graphColors));
        }
    }

    centerCanvas = (): void => {
        this.canvasRef.current!.centerGraph();
    }

    zoomCanvas = (): void => {
        this.canvasRef.current!.getControls().zoom(0.1);
    }

    zoomOutCanvas = (): void => {
        this.canvasRef.current!.getControls().zoom(-0.05);
    }

    resetGraph = (): void => this.setState({
        ...AustraliaGraph,
        animationSpeed: this.state.animationSpeed,
    })

    updateNodeColor = (id: string, color: NodeColor): Promise<void> => {
        return new Promise(resolve => {
            const newState = structuredClone(this.state);
            for (const node of newState.nodes) {
                if (node.id === id) {
                    node.fill = color;
                }
            }
            this.setState(newState, () => resolve());
        });
    }

    colorGraph = async (coloring: NodeColor[], index: number, color: NodeColor): Promise<void> => {
        coloring[index] = color;
        await this.updateNodeColor(this.nodeIds[index], color);
        await this.sleep(this.state.animationSpeed);
    }

    updateAnimationSpeed = (event: ChangeEvent<HTMLInputElement>): void => {
        if (isNaN(Number(event.target.value)) || Number(event.target.value) <= 0) {
            return;
        }

        this.setState({
            ...this.state,
            animationSpeed: Number(event.target.value),
        });
    }

    isGraphValid = (coloring: NodeColor[]): boolean => {
        for (let i = 0; i < this.nodeCnt; i++) {
            for (let j = i + 1; j < this.nodeCnt; j++) {
                if (coloring[j] === undefined || coloring[i] === undefined) {
                    continue;
                }

                if (this.adjacencyMatrix[i][j] && coloring[j] === coloring[i]) {
                    return false;
                }
            }
        }
        return true;
    }

    sleep(ms: number) {
        return new Promise(resolveFunc => setTimeout(resolveFunc, ms));
    }

    backtracking = async (
        coloring: NodeColor[] = Array(this.nodeCnt).fill(undefined)
    ): Promise<boolean> => {
        const unassigned = coloring.indexOf(undefined);
        if (unassigned === -1) {
            return this.isGraphValid(coloring);
        }
        for (let i = 0; i < graphColors.length; i++) {
            await this.colorGraph(coloring, unassigned, graphColors[i]);
            if (this.isGraphValid(coloring) && (await this.backtracking(coloring))) {
                return true;
            }
            await this.colorGraph(coloring, unassigned, undefined);
        }
        return false;
    }

    backJumping = async (
        coloring: NodeColor[] = Array(this.nodeCnt).fill(undefined)
    ): Promise<BackjumpingEvaluation> => {
        const unassigned = coloring.indexOf(undefined);
        let conflictSet = new Set<number>();
        if (unassigned === -1) {
            return new BackjumpingEvaluation(this.isGraphValid(coloring));
        }
        for (let i = 0; i < graphColors.length; i++) {
            let newConflicts: Set<number> = new Set();
            await this.colorGraph(coloring, unassigned, graphColors[i]);
            if (this.isGraphValid(coloring)) {
                const evaluation = await this.backJumping(coloring);
                if (evaluation.isGraphValid) {
                    return new BackjumpingEvaluation(true);
                }
                newConflicts = evaluation.conflictSet;
            } else {
                newConflicts.add(unassigned);
                for (const edge of this.state.edges) {
                    if (edge.source !== this.nodeIds[unassigned]) {
                        continue;
                    }
                    const targetIndex = this.nodeIds.indexOf(edge.target);
                    if (coloring[unassigned] === coloring[targetIndex]) {
                        newConflicts.add(targetIndex);
                    }
                }
            }

            if (!newConflicts.has(unassigned)) {
                return new BackjumpingEvaluation(false, newConflicts);
            } else {
                newConflicts.delete(unassigned);
                conflictSet = new Set([...conflictSet, ...newConflicts]);
                await this.colorGraph(coloring, unassigned, undefined);
            }
        }
        return new BackjumpingEvaluation(false, conflictSet);
    }

    revise = (coloring: NodeColor[], domain: Map<number, string[]>): boolean => {
        for (let i = 0; i < coloring.length; i++) {
            if (coloring[i] !== undefined) {
                domain.set(i, [coloring[i]!]);
            }
        }

        let stabilized = false;
        while (!stabilized) {
            stabilized = true;
            for (const edge of this.state.edges) {
                const sourceIndex = this.nodeIds.indexOf(edge.source);
                const targetIndex = this.nodeIds.indexOf(edge.target);
                const targetDomain = domain.get(targetIndex)!;
                const updatedSourceDomain = [];
                for (const color of domain.get(sourceIndex)!) {
                    if (targetDomain.filter(c => c !== color).length === 0) {
                        stabilized = false;
                    } else {
                        updatedSourceDomain.push(color);
                    }
                }
                if (updatedSourceDomain.length === 0) {
                    return false;
                } else {
                    domain.set(sourceIndex, updatedSourceDomain);
                }
            }
        }
        return true;
    }

    backtrackingAC3 = async (
        coloring: NodeColor[] = Array(this.nodeCnt).fill(undefined),
        domain: Map<number, string[]> = new Map(this.domain),
    ): Promise<boolean> => {
        const unassigned = coloring.indexOf(undefined);
        if (unassigned === -1) {
            return this.isGraphValid(coloring);
        }

        for (let i = 0; i < graphColors.length; i++) {
            const updatedDomain = new Map(domain);
            await this.colorGraph(coloring, unassigned, graphColors[i]);
            if (this.isGraphValid(coloring) && this.revise(coloring, updatedDomain)) {
                if (await this.backtrackingAC3(coloring, updatedDomain)) {
                    return true;
                }
            }
            await this.colorGraph(coloring, unassigned, undefined);
        }
        return false;
    }

    render() {
        return (
            <div id={"graph-coloring"}>
                <div id={"sidebar"}>
                    <Typography variant="h4" component="h1" marginBottom={1}>Graph Painter</Typography>
                    <Typography className={"subtitle"} variant="subtitle1">Coloring Algorithms</Typography>
                    <div className={"button-row"}>
                        <Button variant="contained" onClick={() => this.backtracking()}>BT</Button>
                        <Button variant="contained" onClick={() => this.backtrackingAC3()}>MAC-BT</Button>
                        <Button variant="contained" onClick={() => this.backJumping()}>BJ</Button>
                    </div>
                    <Typography className={"subtitle"} variant="subtitle1">Controls</Typography>
                    <div className={"mb"}></div>
                    <TextField
                        id={"animation-controller"}
                        value={this.state.animationSpeed}
                        label={"Animation Speed"}
                        size={"small"}
                        onChange={this.updateAnimationSpeed}
                    />
                    <div className={"button-row mt"}>
                        <Button variant="contained" onClick={this.centerCanvas}>Center View</Button>
                        <Button variant="contained" onClick={this.resetGraph}>Reset Graph</Button>
                    </div>
                    <div className={"button-row mt"}>
                        <Button variant="contained" onClick={this.zoomCanvas}>Zoom In</Button>
                        <Button variant="contained" onClick={this.zoomOutCanvas}>Zoom Out</Button>
                    </div>
                </div>
                <div id={"graph-canvas"}>
                    <GraphCanvas
                        ref={this.canvasRef}
                        edgeArrowPosition={"none"}
                        nodes={this.state.nodes}
                        edges={this.state.edges}
                        theme={canvasTheme}
                    />
                </div>
            </div>
        )
    }
}

export default GraphColoring
