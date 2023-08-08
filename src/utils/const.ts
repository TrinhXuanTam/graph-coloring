import {lightTheme, Theme} from "reagraph";
import {createTheme} from "@mui/material";

export const canvasTheme: Theme = {
    ...lightTheme,
    canvas: {
        ...lightTheme.canvas,
        background: "#f1f1f1",
    },
    node: {
        ...lightTheme.node,
        fill: "#1E2026",
        label: {
            ...lightTheme.node.label,
            color: "#1E2026"
        }
    },
    edge: {
        ...lightTheme.edge,
        fill: "#1E2026",
    }
}

export const materialTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#1DE9AC',
        },
        secondary: {
            main: '#1DE9AC',
        },
    },
});

export const graphColors = [
    "#FF5733",
    "#4CAF50",
    "#42A5F5",
];
